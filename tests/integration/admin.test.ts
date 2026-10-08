import request from 'supertest';
import { app, seedProduct, createUserAndSignIn, makeAdmin, bearer } from '../helpers';
import { AuditLog, Order, Review, User } from '../../src/database/models';
import { bucketKeys } from '../../src/modules/admin/admin.service';

const address = { fullName: 'Layla Hassan', phone: '0501234567', address: '123 Marina Street', city: 'Dubai' };

let n = 0;
const seedOrder = (over: Record<string, unknown> = {}) =>
  Order.create({
    reference: `AM-9${String(++n).padStart(4, '0')}`,
    shippingAddress: address,
    deliveryMethod: 'standard',
    paymentMethod: 'cod',
    items: [{ productId: over.productId, productName: 'Royal Oud', productImage: 'http://x/p1.jpg', price: 300, quantity: 1, volumeMl: 50 }],
    subtotal: 300,
    shipping: 0,
    total: 300,
    ...over,
  });

async function adminToken() {
  const u = await createUserAndSignIn();
  return { token: await makeAdmin(u.email, u.password), userId: u.userId };
}

describe('bucketKeys', () => {
  it('fills every day and month between the bounds', () => {
    expect(bucketKeys(new Date('2026-01-01T12:00:00Z'), new Date('2026-01-04T12:00:00Z'), 'day')).toEqual([
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04',
    ]);
    expect(bucketKeys(new Date('2026-01-15T00:00:00Z'), new Date('2026-03-02T00:00:00Z'), 'month')).toEqual([
      '2026-01', '2026-02', '2026-03',
    ]);
  });
});

describe('Admin dashboard summary', () => {
  it('returns a gap-filled series, totals and a previous-period comparison from real orders', async () => {
    const { token } = await adminToken();
    const { product } = await seedProduct();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    await seedOrder({ productId: product._id, placedAt: new Date(now - 2 * day) }); // 300
    await seedOrder({ productId: product._id, placedAt: new Date(now - 2 * day), total: 100 }); // 100
    await seedOrder({ productId: product._id, placedAt: new Date(now - 1 * day), status: 'cancelled' }); // excluded from revenue
    await seedOrder({ productId: product._id, placedAt: new Date(now - 9 * day) }); // previous period (7d window)

    const from = new Date(now - 7 * day).toISOString();
    const res = await request(app).get('/v1/admin/dashboard/summary').query({ from, to: new Date(now).toISOString() }).set(bearer(token));

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.series.length).toBeGreaterThanOrEqual(7);
    expect(d.totals.revenue).toBe(400);
    expect(d.totals.orders).toBe(2);
    expect(d.totals.aov).toBe(200);
    expect(d.previous.revenue).toBe(300);
    expect(d.ordersByStatus).toEqual({ processing: 2, cancelled: 1 });
    expect(d.topProducts[0]).toMatchObject({ name: 'Royal Oud', unitsSold: 2, image: 'http://x/p1.jpg' });
  });

  it('rejects an inverted or oversized range with 422', async () => {
    const { token } = await adminToken();
    const bad = await request(app).get('/v1/admin/dashboard/summary').query({ from: '2026-02-01', to: '2026-01-01' }).set(bearer(token));
    expect(bad.status).toBe(422);
    const huge = await request(app).get('/v1/admin/dashboard/summary').query({ from: '2020-01-01', to: '2026-01-01' }).set(bearer(token));
    expect(huge.status).toBe(422);
  });

  it('is admin/manager only', async () => {
    const u = await createUserAndSignIn();
    const res = await request(app).get('/v1/admin/dashboard/summary').set(bearer(u.accessToken));
    expect(res.status).toBe(403);
  });
});

describe('Admin orders', () => {
  it('searches by reference/name, filters payment status, and exposes detail + status timeline', async () => {
    const { token, userId } = await adminToken();
    const { product } = await seedProduct();
    const paid = await seedOrder({ productId: product._id, paymentStatus: 'paid', userId });
    await seedOrder({ productId: product._id, shippingAddress: { ...address, fullName: 'Omar Said' } });

    const byName = await request(app).get('/v1/admin/orders').query({ q: 'layla' }).set(bearer(token));
    expect(byName.body.data.total).toBe(1);
    const byOmar = await request(app).get('/v1/admin/orders').query({ q: 'omar' }).set(bearer(token));
    expect(byOmar.body.data.total).toBe(1);
    const byPay = await request(app).get('/v1/admin/orders').query({ paymentStatus: 'paid' }).set(bearer(token));
    expect(byPay.body.data.total).toBe(1);
    // regex metacharacters are literals, not patterns
    const meta = await request(app).get('/v1/admin/orders').query({ q: '.*' }).set(bearer(token));
    expect(meta.body.data.total).toBe(0);

    await request(app).patch(`/v1/admin/orders/${paid.id}/status`).send({ status: 'shipped' }).set(bearer(token)).expect(200);
    const detail = await request(app).get(`/v1/admin/orders/${paid.id}`).set(bearer(token));
    expect(detail.status).toBe(200);
    expect(detail.body.data.customer).toMatchObject({ id: userId });
    expect(detail.body.data.statusHistory).toHaveLength(1);
    expect(detail.body.data.statusHistory[0]).toMatchObject({ status: 'shipped', by: userId });
  });

  it('records the initial status when an order is placed', async () => {
    const { token } = await adminToken();
    const { product } = await seedProduct();
    const placed = await request(app)
      .post('/v1/orders')
      .send({
        items: [{ productId: String(product._id), quantity: 1, volumeMl: 50 }],
        shippingAddress: address,
        deliveryMethod: 'standard',
        paymentMethod: 'cod',
        guestEmail: 'g@x.com',
      });
    const detail = await request(app).get(`/v1/admin/orders/${placed.body.data.id}`).set(bearer(token));
    expect(detail.body.data.statusHistory.map((s: { status: string }) => s.status)).toEqual(['processing']);
    expect(detail.body.data.customer).toBeNull();
  });
});

describe('Admin customers', () => {
  it('adds order count and lifetime spend (cancelled excluded) and supports reactivation', async () => {
    const { token } = await adminToken();
    const buyer = await createUserAndSignIn({ fullName: 'Big Spender' });
    const { product } = await seedProduct();
    await seedOrder({ productId: product._id, userId: buyer.userId });
    await seedOrder({ productId: product._id, userId: buyer.userId, total: 150 });
    await seedOrder({ productId: product._id, userId: buyer.userId, status: 'cancelled' });

    const list = await request(app).get('/v1/admin/users').query({ q: 'Big Spender' }).set(bearer(token));
    expect(list.body.data.items[0]).toMatchObject({ orderCount: 2, totalSpent: 450 });
    const one = await request(app).get(`/v1/admin/users/${buyer.userId}`).set(bearer(token));
    expect(one.body.data.stats).toEqual({ orderCount: 2, totalSpent: 450 });

    await request(app).delete(`/v1/admin/users/${buyer.userId}`).set(bearer(token)).expect(200);
    expect((await User.findById(buyer.userId))?.isActive).toBe(false);
    await request(app).post(`/v1/admin/users/${buyer.userId}/reactivate`).set(bearer(token)).expect(200);
    expect((await User.findById(buyer.userId))?.isActive).toBe(true);
  });
});

describe('Admin reviews', () => {
  it('lists the product name and summarises ratings', async () => {
    const { token } = await adminToken();
    const { product } = await seedProduct();
    const base = { productId: product._id, author: 'A', title: 't', body: 'b' };
    await Review.create({ ...base, rating: 5 });
    await Review.create({ ...base, rating: 5 });
    await Review.create({ ...base, rating: 2 });

    const list = await request(app).get('/v1/admin/reviews').set(bearer(token));
    expect(list.body.data.items[0].productName).toBe('Royal Oud');
    const sum = await request(app).get('/v1/admin/reviews/summary').set(bearer(token));
    expect(sum.body.data).toEqual({ average: 4, total: 3, distribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 2 } });
  });
});

describe('Admin activity log', () => {
  const seed = (over: Record<string, unknown> = {}) =>
    AuditLog.create({
      actorEmail: 'boss@x.com',
      action: 'POST /v1/admin/products',
      method: 'POST',
      path: '/v1/admin/products',
      statusCode: 201,
      metadata: { body: { name: 'secret customer data' } },
      ...over,
    });

  it('lists newest first, filters by method, text and date, and never returns request bodies', async () => {
    const { token } = await adminToken();
    await seed({ createdAt: new Date('2026-01-01') });
    await seed({ method: 'DELETE', action: 'DELETE /v1/admin/tags/1', path: '/v1/admin/tags/1', actorEmail: 'ops@x.com' });

    const all = await request(app).get('/v1/admin/activity').set(bearer(token));
    expect(all.status).toBe(200);
    // the admin's own earlier requests may also be audited; assert on our rows
    const items = all.body.data.items as { method: string; path: string; actorEmail: string; metadata?: unknown }[];
    expect(items.find((i) => i.path === '/v1/admin/tags/1')).toMatchObject({ method: 'DELETE', actorEmail: 'ops@x.com' });
    expect(JSON.stringify(all.body)).not.toContain('secret customer data');

    const del = await request(app).get('/v1/admin/activity').query({ method: 'DELETE' }).set(bearer(token));
    expect(del.body.data.items.every((i: { method: string }) => i.method === 'DELETE')).toBe(true);

    const byText = await request(app).get('/v1/admin/activity').query({ q: 'ops@' }).set(bearer(token));
    expect(byText.body.data.total).toBe(1);

    const old = await request(app).get('/v1/admin/activity').query({ to: '2026-01-02' }).set(bearer(token));
    expect(old.body.data.total).toBe(1);

    const literal = await request(app).get('/v1/admin/activity').query({ q: '.*' }).set(bearer(token));
    expect(literal.body.data.total).toBe(0);
  });

  it('is admin-only: a manager gets 403', async () => {
    const u = await createUserAndSignIn();
    await User.updateOne({ email: u.email }, { $set: { role: 'manager' } });
    const signIn = await request(app).post('/v1/auth/sign-in').send({ email: u.email, password: u.password });
    const res = await request(app).get('/v1/admin/activity').set(bearer(signIn.body.data.accessToken));
    expect(res.status).toBe(403);
  });
});
