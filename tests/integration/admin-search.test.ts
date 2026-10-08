import request from 'supertest';
import { app, seedProduct, createUserAndSignIn, makeAdmin, bearer } from '../helpers';
import { Order, Product } from '../../src/database/models';

describe('GET /admin/search', () => {
  it('finds products, orders and customers, hides deleted products and staff accounts, treats input literally', async () => {
    const staff = await createUserAndSignIn({ fullName: 'Zed Staff' });
    const token = await makeAdmin(staff.email, staff.password);
    const buyer = await createUserAndSignIn({ fullName: 'Zed Customer' });
    const { product } = await seedProduct({ name: 'Zed Oud' });
    await Product.create({
      name: 'Zed Removed', brand: 'Al Madina', categoryId: product.categoryId, description: 'gone for good',
      scentFamily: 'oud', volumeMl: 50, price: 100, images: [], inStock: true, deletedAt: new Date(),
    });
    await Order.create({
      reference: 'AM-70001',
      userId: buyer.userId,
      shippingAddress: { fullName: 'Zed Recipient', phone: '0501234567', address: '1 St', city: 'Dubai' },
      deliveryMethod: 'standard', paymentMethod: 'cod',
      items: [{ productId: product._id, productName: 'Zed Oud', productImage: 'http://x/p.jpg', price: 100, quantity: 1, volumeMl: 50 }],
      subtotal: 100, shipping: 0, total: 100,
    });

    const res = await request(app).get('/v1/admin/search').query({ q: 'zed' }).set(bearer(token));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.products.map((p: { name: string }) => p.name)).toEqual(['Zed Oud']);
    expect(d.orders[0]).toMatchObject({ reference: 'AM-70001', customer: 'Zed Recipient' });
    expect(d.customers.map((c: { fullName: string }) => c.fullName)).toEqual(['Zed Customer']);

    const byRef = await request(app).get('/v1/admin/search').query({ q: 'AM-70001' }).set(bearer(token));
    expect(byRef.body.data.orders).toHaveLength(1);

    const literal = await request(app).get('/v1/admin/search').query({ q: '.*' }).set(bearer(token));
    expect(literal.body.data).toEqual({ products: [], orders: [], customers: [] });
  });

  it('needs at least 2 characters and an admin or manager', async () => {
    const staff = await createUserAndSignIn();
    const token = await makeAdmin(staff.email, staff.password);
    expect((await request(app).get('/v1/admin/search').query({ q: 'a' }).set(bearer(token))).status).toBe(422);
    const user = await createUserAndSignIn();
    expect((await request(app).get('/v1/admin/search').query({ q: 'ab' }).set(bearer(user.accessToken))).status).toBe(403);
  });
});
