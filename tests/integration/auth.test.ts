import request from 'supertest';
import { app, createUserAndSignIn, bearer } from '../helpers';

describe('Auth flow', () => {
  it('signs up, returns tokens and a public user (no passwordHash)', async () => {
    const res = await request(app)
      .post('/v1/auth/sign-up')
      .send({ fullName: 'Jane Doe', email: 'jane@a.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.id).toBeDefined();
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate emails with 409 EMAIL_TAKEN', async () => {
    await request(app).post('/v1/auth/sign-up').send({ fullName: 'A B', email: 'dup@a.com', password: 'secret123' });
    const res = await request(app).post('/v1/auth/sign-up').send({ fullName: 'A B', email: 'dup@a.com', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('rejects invalid sign-up payloads with 422', async () => {
    const res = await request(app).post('/v1/auth/sign-up').send({ fullName: 'A', email: 'bad', password: '123' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('signs in with correct credentials and rejects wrong ones', async () => {
    const { email } = await createUserAndSignIn({ email: 'login@a.com', password: 'secret123' });
    const ok = await request(app).post('/v1/auth/sign-in').send({ email, password: 'secret123' });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/v1/auth/sign-in').send({ email, password: 'nope' });
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the current user from /auth/me and 401 without a token', async () => {
    const { accessToken } = await createUserAndSignIn({ email: 'me@a.com' });
    const ok = await request(app).get('/v1/auth/me').set(bearer(accessToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe('me@a.com');

    const noAuth = await request(app).get('/v1/auth/me');
    expect(noAuth.status).toBe(401);
  });

  it('rotates refresh tokens and revokes the old one', async () => {
    const { refreshToken } = await createUserAndSignIn({ email: 'rot@a.com' });

    const refreshed = await request(app).post('/v1/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);
    const newRefresh = refreshed.body.data.refreshToken;
    expect(newRefresh).not.toBe(refreshToken);

    // The old token is now revoked.
    const reuse = await request(app).post('/v1/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('TOKEN_REVOKED');
  });

  it('revokes a refresh token on sign-out', async () => {
    const { accessToken, refreshToken } = await createUserAndSignIn({ email: 'out@a.com' });
    const out = await request(app).post('/v1/auth/sign-out').set(bearer(accessToken)).send({ refreshToken });
    expect(out.status).toBe(200);
    const refresh = await request(app).post('/v1/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);
  });
});
