import request from 'supertest';
import { Types } from 'mongoose';
import { app, seedProduct } from '../helpers';

describe('Products', () => {
  it('lists products with the paginated envelope and string ids', async () => {
    await seedProduct();
    const res = await request(app).get('/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 20, total: 1, hasMore: false });
    const product = res.body.data.items[0];
    expect(typeof product.id).toBe('string');
    expect(product).not.toHaveProperty('_id');
    expect(product).not.toHaveProperty('__v');
  });

  it('filters by scent family', async () => {
    await seedProduct(); // oud
    await seedProduct({ name: 'Rose', scentFamily: 'floral', isFeatured: false });
    const res = await request(app).get('/v1/products?family=floral');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].scentFamily).toBe('floral');
  });

  it('returns a product by id and 404 for a missing one', async () => {
    const { product } = await seedProduct();
    const ok = await request(app).get(`/v1/products/${product._id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.name).toBe('Royal Oud');

    const missing = await request(app).get(`/v1/products/${new Types.ObjectId()}`);
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects an invalid ObjectId with 422', async () => {
    const res = await request(app).get('/v1/products/not-an-id');
    expect(res.status).toBe(422);
  });

  it('serves the featured rail', async () => {
    await seedProduct();
    const res = await request(app).get('/v1/products/featured');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('fetches multiple products by ids', async () => {
    const { product } = await seedProduct();
    const res = await request(app).get(`/v1/products?ids=${product._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
