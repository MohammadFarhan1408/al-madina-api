import request from 'supertest';
import { app, seedProduct, createUserAndSignIn, makeAdmin, bearer } from '../helpers';
import { Order } from '../../src/database/models';

let n = 0;
const seedOrder = (productId: unknown, over: Record<string, unknown> = {}) =>
  Order.create({
    reference: `AM-8${String(++n).padStart(4, '0')}`,
    shippingAddress: { fullName: 'Layla', phone: '0501234567', address: '1 Marina St', city: 'Dubai' },
    deliveryMethod: 'standard',
    paymentMethod: 'cod',
    items: [{ productId, productName: 'Royal Oud', productImage: 'http://x/p.jpg', price: 300, quantity: 1, volumeMl: 50 }],
    subtotal: 300,
    shipping: 0,
    total: 300,
    ...over,
  });

async function adminToken() {
  const u = await createUserAndSignIn();
  return makeAdmin(u.email, u.password);
}

describe('PATCH /admin/orders/status (bulk)', () => {
  it('moves eligible orders, skips the rest with a reason, and records the timeline', async () => {
    const token = await adminToken();
    const { product } = await seedProduct();
    const a = await seedOrder(product._id);
    const b = await seedOrder(product._id, { status: 'shipped' });
    const done = await seedOrder(product._id, { status: 'delivered' });
    const same = await seedOrder(product._id, { status: 'shipped' });

    const res = await request(app)
      .patch('/v1/admin/orders/status')
      .send({ ids: [a.id, b.id, done.id, same.id, a.id, '64f1a2b3c4d5e6f7a8b9c0d1'], status: 'shipped' })
      .set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.data.updated).toEqual([a.id]); // duplicate id processed once
    const reasons = Object.fromEntries(res.body.data.skipped.map((s: { id: string; reason: string }) => [s.id, s.reason]));
    expect(reasons[b.id]).toBe('Already shipped');
    expect(reasons[done.id]).toBe('A delivered order cannot become shipped');
    expect(reasons['64f1a2b3c4d5e6f7a8b9c0d1']).toBe('Order not found');

    const moved = await Order.findById(a.id);
    expect(moved?.status).toBe('shipped');
    expect(moved?.statusHistory.map((s) => s.status)).toEqual(['shipped']);
    expect((await Order.findById(done.id))?.status).toBe('delivered'); // untouched
  });

  it('validates the body and requires an admin or manager', async () => {
    const token = await adminToken();
    const empty = await request(app).patch('/v1/admin/orders/status').send({ ids: [], status: 'shipped' }).set(bearer(token));
    expect(empty.status).toBe(422);
    const tooMany = await request(app)
      .patch('/v1/admin/orders/status')
      .send({ ids: Array.from({ length: 51 }, () => '64f1a2b3c4d5e6f7a8b9c0d1'), status: 'shipped' })
      .set(bearer(token));
    expect(tooMany.status).toBe(422);
    const badStatus = await request(app).patch('/v1/admin/orders/status').send({ ids: ['64f1a2b3c4d5e6f7a8b9c0d1'], status: 'lost' }).set(bearer(token));
    expect(badStatus.status).toBe(422);

    const user = await createUserAndSignIn();
    const denied = await request(app).patch('/v1/admin/orders/status').send({ ids: ['64f1a2b3c4d5e6f7a8b9c0d1'], status: 'shipped' }).set(bearer(user.accessToken));
    expect(denied.status).toBe(403);
  });
});
