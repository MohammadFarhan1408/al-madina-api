import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, createUserAndSignIn, bearer } from '../helpers';
import { RefreshToken, User } from '../../src/database/models';
import { hashToken } from '../../src/utils/hash';

const HOUR = 60 * 60 * 1000;

const signIn = (email: string, password: string) => request(app).post('/v1/auth/sign-in').send({ email, password });
const refresh = (refreshToken: string) => request(app).post('/v1/auth/refresh').send({ refreshToken });

async function staff(role: 'admin' | 'manager') {
  const u = await createUserAndSignIn();
  await User.updateOne({ email: u.email }, { $set: { role } });
  const res = await signIn(u.email, u.password);
  return { ...u, accessToken: res.body.data.accessToken as string, refreshToken: res.body.data.refreshToken as string, body: res.body.data };
}

describe('Auth sessions', () => {
  it('caps an admin session at 24h from sign-in, and rotation never extends it', async () => {
    const admin = await staff('admin');
    const exp = new Date(admin.body.refreshExpiresAt).getTime();
    expect(exp - Date.now()).toBeGreaterThan(23.9 * HOUR);
    expect(exp - Date.now()).toBeLessThanOrEqual(24 * HOUR);

    const rotated = await refresh(admin.refreshToken);
    expect(rotated.status).toBe(200);
    expect(new Date(rotated.body.data.refreshExpiresAt).getTime()).toBe(exp);

    // Once the session cap passes, the latest token stops working.
    await RefreshToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await refresh(rotated.body.data.refreshToken)).status).toBe(401);
  });

  it('keeps the long sliding session for customers', async () => {
    const u = await createUserAndSignIn();
    const res = await signIn(u.email, u.password);
    expect(new Date(res.body.data.refreshExpiresAt).getTime() - Date.now()).toBeGreaterThan(29 * 24 * HOUR);
  });

  it('lets only one of two concurrent refreshes with the same token succeed', async () => {
    const u = await createUserAndSignIn();
    const [a, b] = await Promise.all([refresh(u.refreshToken), refresh(u.refreshToken)]);
    expect([a.status, b.status].sort()).toEqual([200, 401]);
  });

  it('revokes the whole family when a spent token is replayed after the race window', async () => {
    const u = await createUserAndSignIn();
    const first = await refresh(u.refreshToken);
    const latest = first.body.data.refreshToken as string;
    // Pretend the original was spent a minute ago, then replay it (a stolen copy).
    await RefreshToken.updateOne({ token: hashToken(u.refreshToken) }, { $set: { revokedAt: new Date(Date.now() - 60_000) } });
    expect((await refresh(u.refreshToken)).status).toBe(401);
    // The legitimate latest token is now dead too.
    expect((await refresh(latest)).status).toBe(401);
  });

  it('does not revoke the family for a replay inside the race window (two tabs)', async () => {
    const u = await createUserAndSignIn();
    const first = await refresh(u.refreshToken);
    expect((await refresh(u.refreshToken)).status).toBe(401);
    expect((await refresh(first.body.data.refreshToken)).status).toBe(200);
  });

  it('signs out with just the refresh token, even without an access token', async () => {
    const u = await createUserAndSignIn();
    expect((await request(app).post('/v1/auth/sign-out').send({ refreshToken: u.refreshToken })).status).toBe(200);
    expect((await refresh(u.refreshToken)).status).toBe(401);
  });

  it('rejects tokens without the expected issuer/audience or with another algorithm', async () => {
    const u = await createUserAndSignIn();
    const forged = jwt.sign({ sub: u.userId, email: u.email, tier: 'Member', role: 'admin' }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '5m' });
    expect((await request(app).get('/v1/auth/me').set(bearer(forged))).status).toBe(401);
  });

  it('re-checks the role from the database: a demoted admin loses access immediately', async () => {
    const admin = await staff('admin');
    expect((await request(app).get('/v1/admin/dashboard').set(bearer(admin.accessToken))).status).toBe(200);
    await User.updateOne({ email: admin.email }, { $set: { role: 'user' } });
    expect((await request(app).get('/v1/admin/dashboard').set(bearer(admin.accessToken))).status).toBe(403);
  });

  it('deactivating a user ends their sessions; staff guards apply', async () => {
    const admin = await staff('admin');
    const manager = await staff('manager');
    const customer = await createUserAndSignIn();

    await request(app).delete(`/v1/admin/users/${customer.userId}`).set(bearer(admin.accessToken)).expect(200);
    expect((await refresh(customer.refreshToken)).status).toBe(401);

    const managerOnAdmin = await request(app).delete(`/v1/admin/users/${admin.userId}`).set(bearer(manager.accessToken));
    expect(managerOnAdmin.status).toBe(403);
    const self = await request(app).delete(`/v1/admin/users/${admin.userId}`).set(bearer(admin.accessToken));
    expect(self.status).toBe(400);
    const tierSelf = await request(app).patch(`/v1/admin/users/${admin.userId}/tier`).send({ tier: 'Maison Elite' }).set(bearer(admin.accessToken));
    expect(tierSelf.status).toBe(400);
    // A deactivated staff member is locked out on their next request.
    await request(app).delete(`/v1/admin/users/${manager.userId}`).set(bearer(admin.accessToken)).expect(200);
    expect((await request(app).get('/v1/admin/dashboard').set(bearer(manager.accessToken))).status).toBe(401);
  });
});

