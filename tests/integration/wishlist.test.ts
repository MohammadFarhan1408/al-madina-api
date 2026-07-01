import request from 'supertest';
import { app, seedProduct, createUserAndSignIn, bearer } from '../helpers';

describe('Wishlist (protected)', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/v1/wishlist');
    expect(res.status).toBe(401);
  });

  it('adds, lists, and removes — with dup + not-found guards', async () => {
    const { product } = await seedProduct();
    const { accessToken } = await createUserAndSignIn();
    const auth = bearer(accessToken);
    const pid = String(product._id);

    const empty = await request(app).get('/v1/wishlist').set(auth);
    expect(empty.body.data.productIds).toEqual([]);

    const add = await request(app).post('/v1/wishlist').set(auth).send({ productId: pid });
    expect(add.status).toBe(201);

    const dup = await request(app).post('/v1/wishlist').set(auth).send({ productId: pid });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('ALREADY_IN_WISHLIST');

    const list = await request(app).get('/v1/wishlist').set(auth);
    expect(list.body.data.productIds).toEqual([pid]);

    const remove = await request(app).delete(`/v1/wishlist/${pid}`).set(auth);
    expect(remove.status).toBe(200);

    const removeAgain = await request(app).delete(`/v1/wishlist/${pid}`).set(auth);
    expect(removeAgain.status).toBe(404);
    expect(removeAgain.body.code).toBe('NOT_IN_WISHLIST');
  });
});
