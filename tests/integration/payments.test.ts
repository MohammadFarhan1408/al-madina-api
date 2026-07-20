import request from 'supertest';
import { createHmac } from 'node:crypto';
import { app, seedProduct, createUserAndSignIn, makeAdmin, bearer } from '../helpers';
import { Coupon, Product } from '../../src/database/models';

const address = { fullName: 'Test Buyer', phone: '0501234567', address: '123 Marina Street', city: 'Dubai' };
const WEBHOOK_SECRET = 'dev-payment-webhook-secret-change-me'; // config default when PAYMENT_WEBHOOK_SECRET is unset (see tests/setup.ts)

function signCallback(body: { transactionId: string; status: string; providerReference?: string }) {
  // Key order must match simulateCallbackSchema's shape (zod builds the
  // output object in schema-declaration order), since the route signs the
  // already-validated req.body.
  const ordered: Record<string, unknown> = { transactionId: body.transactionId, status: body.status };
  if (body.providerReference !== undefined) ordered.providerReference = body.providerReference;
  const signature = createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(ordered)).digest('hex');
  return { body: ordered, signature };
}

async function placeOrder(overrides: Record<string, unknown> = {}) {
  const { product } = await seedProduct({ price: 300 });
  const res = await request(app)
    .post('/v1/orders')
    .send({
      items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
      shippingAddress: address,
      deliveryMethod: 'standard',
      paymentMethod: 'card',
      guestEmail: `guest_${Date.now()}_${Math.random().toString(36).slice(2)}@x.com`,
      ...overrides,
    });
  return { res, product };
}

describe('Payments', () => {
  it('COD order starts pending, with a pending transaction', async () => {
    const { product } = await seedProduct({ price: 300 });
    const res = await request(app)
      .post('/v1/orders')
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'cod',
        guestEmail: 'cod@x.com',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.paymentStatus).toBe('pending');

    const payments = await request(app).get(`/v1/orders/${res.body.data.id}/payments?email=cod@x.com`);
    expect(payments.body.data).toHaveLength(1);
    expect(payments.body.data[0].provider).toBe('cod');
    expect(payments.body.data[0].status).toBe('pending');
  });

  it('card/wallet order starts processing with a providerReference', async () => {
    const { res } = await placeOrder({ paymentMethod: 'wallet' });
    expect(res.status).toBe(201);
    expect(res.body.data.paymentStatus).toBe('processing');

    const payments = await request(app).get(`/v1/orders/${res.body.data.id}/payments?email=${res.body.data.guestEmail}`);
    expect(payments.body.data[0].status).toBe('processing');
    expect(payments.body.data[0].providerReference).toBeTruthy();
  });

  it('simulated callback settles the order paid and burns coupon usage once', async () => {
    await Coupon.create({
      code: 'SAVE10',
      description: '10 AED off',
      discountType: 'fixed',
      value: 10,
      minPurchase: 0,
      usageCount: 0,
      expiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
    });
    const { res } = await placeOrder({ couponCode: 'save10' });
    expect(res.body.data.discountAmount).toBe(10);
    expect(res.body.data.total).toBe(290);

    const payments = await request(app).get(`/v1/orders/${res.body.data.id}/payments?email=${res.body.data.guestEmail}`);
    const transactionId = payments.body.data[0].id;

    const { body, signature } = signCallback({ transactionId, status: 'succeeded' });
    const callback = await request(app)
      .post('/v1/payments/callback')
      .set('X-Webhook-Signature', signature)
      .send(body);
    expect(callback.status).toBe(200);
    expect(callback.body.data.status).toBe('succeeded');

    const order = await request(app).get(`/v1/orders/${res.body.data.id}?email=${res.body.data.guestEmail}`);
    expect(order.body.data.paymentStatus).toBe('paid');

    const coupon = await Coupon.findOne({ code: 'SAVE10' });
    expect(coupon?.usageCount).toBe(1);

    // Replaying the same callback must not double-settle or double-increment.
    const { body: replayBody, signature: replaySig } = signCallback({ transactionId, status: 'succeeded' });
    const replay = await request(app)
      .post('/v1/payments/callback')
      .set('X-Webhook-Signature', replaySig)
      .send(replayBody);
    expect(replay.status).toBe(409);
    expect(replay.body.code).toBe('PAYMENT_ALREADY_SETTLED');

    const couponAfterReplay = await Coupon.findOne({ code: 'SAVE10' });
    expect(couponAfterReplay?.usageCount).toBe(1);
  });

  it('failed payment can be retried, and a second attempt can succeed', async () => {
    const { res } = await placeOrder();
    const orderId = res.body.data.id;
    const email = res.body.data.guestEmail;

    const firstPayments = await request(app).get(`/v1/orders/${orderId}/payments?email=${email}`);
    const firstTransactionId = firstPayments.body.data[0].id;

    const { body, signature } = signCallback({ transactionId: firstTransactionId, status: 'failed' });
    await request(app).post('/v1/payments/callback').set('X-Webhook-Signature', signature).send(body);

    const afterFail = await request(app).get(`/v1/orders/${orderId}?email=${email}`);
    expect(afterFail.body.data.paymentStatus).toBe('failed');

    const retry = await request(app)
      .post(`/v1/orders/${orderId}/payments/retry?email=${email}`)
      .send({ idempotencyKey: '11111111-1111-1111-1111-111111111111' });
    expect(retry.status).toBe(201);

    const payments = await request(app).get(`/v1/orders/${orderId}/payments?email=${email}`);
    expect(payments.body.data).toHaveLength(2);
    const secondTransactionId = payments.body.data[0].id; // sorted by createdAt desc
    expect(secondTransactionId).not.toBe(firstTransactionId);

    const { body: body2, signature: sig2 } = signCallback({ transactionId: secondTransactionId, status: 'succeeded' });
    const callback2 = await request(app).post('/v1/payments/callback').set('X-Webhook-Signature', sig2).send(body2);
    expect(callback2.status).toBe(200);

    const finalOrder = await request(app).get(`/v1/orders/${orderId}?email=${email}`);
    expect(finalOrder.body.data.paymentStatus).toBe('paid');

    // Retrying an already-settled order is rejected.
    const rejectedRetry = await request(app)
      .post(`/v1/orders/${orderId}/payments/retry?email=${email}`)
      .send({ idempotencyKey: '22222222-2222-2222-2222-222222222222' });
    expect(rejectedRetry.status).toBe(409);
    expect(rejectedRetry.body.code).toBe('PAYMENT_RETRY_NOT_ALLOWED');
  });

  it('a duplicate POST /orders with the same idempotencyKey does not create a second order', async () => {
    const { product } = await seedProduct({ price: 300 });
    const idempotencyKey = '33333333-3333-3333-3333-333333333333';
    const body = {
      items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
      shippingAddress: address,
      deliveryMethod: 'standard',
      paymentMethod: 'cod',
      guestEmail: 'dup@x.com',
      idempotencyKey,
    };
    const first = await request(app).post('/v1/orders').send(body);
    const second = await request(app).post('/v1/orders').send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it('locks in the price at order time even if the product price changes afterward', async () => {
    const { product } = await seedProduct({ price: 300 });
    const res = await request(app)
      .post('/v1/orders')
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'cod',
        guestEmail: 'price@x.com',
      });
    expect(res.body.data.subtotal).toBe(300);

    await Product.updateOne({ _id: product._id }, { $set: { price: 999 } });

    const refetched = await request(app).get(`/v1/orders/${res.body.data.id}?email=price@x.com`);
    expect(refetched.body.data.subtotal).toBe(300);
  });

  it('rejects an invalid coupon code on order creation without discounting', async () => {
    const { product } = await seedProduct({ price: 300 });
    const res = await request(app)
      .post('/v1/orders')
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'cod',
        guestEmail: 'badcoupon@x.com',
        couponCode: 'NOPE',
      });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COUPON_NOT_FOUND');
  });

  it('POST /coupons/validate previews a discount without creating an order', async () => {
    await Coupon.create({
      code: 'PREVIEW5',
      description: '5% off',
      discountType: 'percentage',
      value: 5,
      minPurchase: 0,
      usageCount: 0,
      expiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
    });
    const res = await request(app).post('/v1/coupons/validate').send({ code: 'preview5', subtotal: 200 });
    expect(res.status).toBe(200);
    expect(res.body.data.discountAmount).toBe(10);
  });

  it('rejects a webhook callback without a valid signature', async () => {
    const res = await request(app)
      .post('/v1/payments/callback')
      .send({ transactionId: '000000000000000000000000', status: 'succeeded' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('admin can refund a paid order but not a pending one', async () => {
    const { product } = await seedProduct({ price: 300 });
    const { accessToken, email, password } = await createUserAndSignIn({ email: 'refundbuyer@a.com' });
    const auth = bearer(accessToken);

    const order = await request(app)
      .post('/v1/orders')
      .set(auth)
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'cod',
      });
    const adminToken = await makeAdmin(email, password);

    const payments = await request(app)
      .get(`/v1/admin/orders/${order.body.data.id}/transactions`)
      .set(bearer(adminToken));
    const transactionId = payments.body.data[0].id;

    const rejected = await request(app)
      .post(`/v1/admin/orders/${order.body.data.id}/payments/refund`)
      .set(bearer(adminToken))
      .send({ transactionId });
    expect(rejected.status).toBe(409);
    expect(rejected.body.code).toBe('PAYMENT_NOT_REFUNDABLE');

    await request(app)
      .patch(`/v1/admin/orders/${order.body.data.id}/status`)
      .set(bearer(adminToken))
      .send({ status: 'delivered' });

    const refunded = await request(app)
      .post(`/v1/admin/orders/${order.body.data.id}/payments/refund`)
      .set(bearer(adminToken))
      .send({ transactionId });
    expect(refunded.status).toBe(200);
    expect(refunded.body.data.status).toBe('refunded');

    const finalOrder = await request(app).get(`/v1/orders/${order.body.data.id}`).set(auth);
    expect(finalOrder.body.data.paymentStatus).toBe('refunded');
  });
});
