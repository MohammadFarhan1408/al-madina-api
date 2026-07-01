import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../src/app';
import { Category, Product, User } from '../src/database/models';

export const app: Application = createApp();

/** Register a user and return its tokens + id. */
export async function createUserAndSignIn(
  overrides: { email?: string; password?: string; fullName?: string } = {},
) {
  const body = {
    fullName: overrides.fullName ?? 'Test User',
    email: overrides.email ?? `user_${Date.now()}_${Math.random().toString(36).slice(2)}@a.com`,
    password: overrides.password ?? 'secret123',
  };
  const res = await request(app).post('/v1/auth/sign-up').send(body);
  return {
    accessToken: res.body.data.accessToken as string,
    refreshToken: res.body.data.refreshToken as string,
    userId: res.body.data.user.id as string,
    email: body.email,
    password: body.password,
  };
}

/** Promote a user to admin and return a fresh admin access token. */
export async function makeAdmin(email: string, password: string): Promise<string> {
  await User.updateOne({ email }, { $set: { role: 'admin' } });
  const res = await request(app).post('/v1/auth/sign-in').send({ email, password });
  return res.body.data.accessToken as string;
}

/** Seed a category + product for catalogue tests. */
export async function seedProduct(overrides: Record<string, unknown> = {}) {
  const category = await Category.create({ name: 'Oud', image: 'http://x/o.jpg', sortOrder: 1 });
  const product = await Product.create({
    name: 'Royal Oud',
    brand: 'Al Madina',
    categoryId: category._id,
    description: 'Deep oud fragrance with amber',
    notes: ['oud', 'amber'],
    scentFamily: 'oud',
    volumeMl: 50,
    price: 300,
    images: ['http://x/p1.jpg'],
    inStock: true,
    isFeatured: true,
    ...overrides,
  });
  return { category, product };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
