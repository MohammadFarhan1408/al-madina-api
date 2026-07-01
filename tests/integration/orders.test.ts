import request from 'supertest';
import { app, seedProduct, createUserAndSignIn, makeAdmin, bearer } from '../helpers';

const address = { fullName: 'Guest Buyer', phone: '0501234567', address: '123 Marina Street', city: 'Dubai' };

describe('Orders', () => {
  it('places a guest order with free shipping at ≥250 AED', async () => {
    const { product } = await seedProduct({ price: 300 });
    const res = await request(app)
      .post('/v1/orders')
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'cod',
        guestEmail: 'guest@x.com',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(300);
    expect(res.body.data.shipping).toBe(0);
    expect(res.body.data.total).toBe(300);
    expect(res.body.data.reference).toMatch(/^AM-\d{5}/);
  });

  it('charges flat + express shipping below the threshold', async () => {
    const { product } = await seedProduct({ price: 120 });
    const res = await request(app)
      .post('/v1/orders')
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'express',
        paymentMethod: 'card',
        guestEmail: 'guest2@x.com',
      });
    expect(res.body.data.shipping).toBe(50); // 20 flat + 30 express
    expect(res.body.data.total).toBe(170);
  });

  it('rejects out-of-stock products with 409', async () => {
    const { product } = await seedProduct({ inStock: false });
    const res = await request(app)
      .post('/v1/orders')
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'cod',
        guestEmail: 'g@x.com',
      });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRODUCT_OUT_OF_STOCK');
  });

  it('lists an authenticated user history and updates status as admin', async () => {
    const { product } = await seedProduct();
    const { accessToken, email, password } = await createUserAndSignIn({ email: 'buyer@a.com' });
    const auth = bearer(accessToken);

    const order = await request(app)
      .post('/v1/orders')
      .set(auth)
      .send({
        items: [{ productId: String(product._id), quantity: 2, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'wallet',
      });
    expect(order.status).toBe(201);

    const history = await request(app).get('/v1/orders').set(auth);
    expect(history.body.data.total).toBe(1);

    const adminToken = await makeAdmin(email, password);
    const updated = await request(app)
      .patch(`/v1/admin/orders/${order.body.data.id}/status`)
      .set(bearer(adminToken))
      .send({ status: 'shipped' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('shipped');
  });

  it('blocks non-admins from admin order management with 403', async () => {
    const { accessToken } = await createUserAndSignIn();
    const res = await request(app).get('/v1/admin/orders').set(bearer(accessToken));
    expect(res.status).toBe(403);
  });
});
