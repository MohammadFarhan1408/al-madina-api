import request from 'supertest';
import { app, createUserAndSignIn, makeAdmin, bearer } from '../helpers';
import { AuditLog, User } from '../../src/database/models';

const signIn = (email: unknown, password: unknown) => request(app).post('/v1/auth/sign-in').send({ email, password });

describe('Operator-injection guard', () => {
  it('rejects $-operators and dotted keys in body, query and nested objects', async () => {
    const u = await createUserAndSignIn();
    const token = await makeAdmin(u.email, u.password);

    expect((await signIn({ $ne: null }, 'x')).status).toBe(400);
    expect((await request(app).post('/v1/auth/sign-in').send({ email: u.email, password: { $gt: '' } })).status).toBe(400);
    expect((await request(app).get('/v1/admin/orders?status[$ne]=processing').set(bearer(token))).status).toBe(400);
    expect((await request(app).get('/v1/admin/users?q[$regex]=.*').set(bearer(token))).status).toBe(400);
    expect((await request(app).patch('/v1/admin/orders/status').send({ ids: ['x'], 'status.x': 1 }).set(bearer(token))).status).toBe(400);
    // ordinary requests are untouched
    expect((await request(app).get('/v1/admin/orders?status=processing').set(bearer(token))).status).toBe(200);
  });

  it('validates every id in the collection-product route', async () => {
    const u = await createUserAndSignIn();
    const token = await makeAdmin(u.email, u.password);
    const res = await request(app).delete('/v1/admin/collections/64f1a2b3c4d5e6f7a8b9c0d1/products/not-an-id').set(bearer(token));
    expect(res.status).toBe(422);
  });
});

describe('Sign-in hardening', () => {
  it('locks the account after 5 wrong passwords, even for the right one, until the lock passes', async () => {
    const u = await createUserAndSignIn();
    for (let i = 0; i < 5; i++) expect((await signIn(u.email, 'wrong-password-1')).status).toBe(401);

    const locked = await signIn(u.email, u.password);
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe('ACCOUNT_LOCKED');

    await User.updateOne({ email: u.email }, { $set: { lockedUntil: new Date(Date.now() - 1000) } });
    expect((await signIn(u.email, u.password)).status).toBe(200);
    const after = await User.findOne({ email: u.email }).select('+failedLoginCount +lockedUntil').lean();
    expect(after).toMatchObject({ failedLoginCount: 0, lockedUntil: null });
  });

  it('does not reveal a deactivated account without its password', async () => {
    const u = await createUserAndSignIn();
    await User.updateOne({ email: u.email }, { $set: { isActive: false } });
    expect((await signIn(u.email, 'wrong-password-1')).status).toBe(401);
    expect((await signIn(u.email, u.password)).status).toBe(403);
  });

  it('never exposes lockout fields in admin user listings', async () => {
    const u = await createUserAndSignIn();
    const token = await makeAdmin(u.email, u.password);
    const list = await request(app).get('/v1/admin/users').set(bearer(token));
    expect(JSON.stringify(list.body)).not.toMatch(/failedLoginCount|lockedUntil/);
  });

  it('audits staff sign-ins, success and failure, but not customers', async () => {
    const staff = await createUserAndSignIn();
    await User.updateOne({ email: staff.email }, { $set: { role: 'manager' } });
    await signIn(staff.email, 'wrong-password-1');
    await signIn(staff.email, staff.password);
    const customer = await createUserAndSignIn();
    await signIn(customer.email, customer.password);

    const logs = await AuditLog.find({ path: '/v1/auth/sign-in' }).lean();
    expect(logs.map((l) => [l.actorEmail, l.statusCode])).toEqual([
      [staff.email, 401],
      [staff.email, 200],
    ]);
  });
});
