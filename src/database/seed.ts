/* eslint-disable no-console */
import { connectDatabase, disconnectDatabase } from '../config/database';
import {
  User,
  Category,
  Product,
  Collection,
  UserPreference,
} from './models';
import { hashPassword } from '../utils/hash';

/**
 * Seed baseline data: an admin user, scent-family categories, a handful of
 * products, and one curated collection. Idempotent-ish — it clears the seeded
 * collections first so re-running gives a clean slate.
 */
async function seed(): Promise<void> {
  await connectDatabase();
  console.log('🌱 Seeding database...');

  await Promise.all([
    User.deleteMany({}),
    UserPreference.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Collection.deleteMany({}),
  ]);

  // ─── Admin user ────────────────────────────────────────────────────────────
  const admin = await User.create({
    fullName: 'Al Madina Admin',
    email: 'admin@almadina.com',
    passwordHash: await hashPassword('Admin@12345'),
    role: 'admin',
    tier: 'Maison Elite',
    isEmailVerified: true,
  });
  await UserPreference.create({ userId: admin._id });
  console.log('✓ Admin user: admin@almadina.com / Admin@12345');

  // ─── Categories ────────────────────────────────────────────────────────────
  const categoryDefs = [
    { name: 'Oud', tagline: 'Deep, resinous, regal', scentFamily: 'oud' },
    { name: 'Floral', tagline: 'Rose, jasmine, blossom', scentFamily: 'floral' },
    { name: 'Amber', tagline: 'Warm, golden, enveloping', scentFamily: 'amber' },
    { name: 'Musk', tagline: 'Soft, intimate, lasting', scentFamily: 'musk' },
    { name: 'Woody', tagline: 'Sandalwood and cedar', scentFamily: 'woody' },
  ];
  const categories = await Category.create(
    categoryDefs.map((c, i) => ({
      name: c.name,
      tagline: c.tagline,
      image: `https://res.cloudinary.com/demo/image/upload/almadina/categories/${c.scentFamily}.jpg`,
      sortOrder: i,
    })),
  );
  const catByFamily = new Map(categoryDefs.map((c, i) => [c.scentFamily, categories[i]]));
  console.log(`✓ ${categories.length} categories`);

  // ─── Products ──────────────────────────────────────────────────────────────
  const productDefs = [
    { name: 'Royal Oud', family: 'oud', price: 320, notes: ['oud', 'amber', 'saffron'], isFeatured: true, isSignature: true, badge: 'exclusive' },
    { name: 'Midnight Rose', family: 'floral', price: 180, originalPrice: 220, notes: ['rose', 'jasmine'], isBestSeller: true, badge: 'bestseller' },
    { name: 'Amber Nights', family: 'amber', price: 260, notes: ['amber', 'vanilla'], isFeatured: true, isSeasonal: true },
    { name: 'White Musk', family: 'musk', price: 140, notes: ['musk', 'white florals'], isNewArrival: true, badge: 'new' },
    { name: 'Sandal Reserve', family: 'woody', price: 290, notes: ['sandalwood', 'cedar'], isSignature: true },
    { name: 'Saffron Oud', family: 'oud', price: 380, notes: ['oud', 'saffron', 'leather'], isBestSeller: true, badge: 'limited' },
  ];
  const products = await Product.create(
    productDefs.map((p, i) => ({
      name: p.name,
      brand: 'Al Madina',
      categoryId: catByFamily.get(p.family)!._id,
      description: `${p.name} — a luxury Arabian ittar with notes of ${p.notes.join(', ')}.`,
      notes: p.notes,
      scentFamily: p.family,
      volumeMl: 50,
      price: p.price,
      originalPrice: p.originalPrice,
      images: [`https://res.cloudinary.com/demo/image/upload/almadina/products/p${i + 1}.jpg`],
      rating: 4 + (i % 2) * 0.5,
      reviewCount: 10 + i,
      inStock: true,
      badge: p.badge,
      isFeatured: Boolean(p.isFeatured),
      isNewArrival: Boolean(p.isNewArrival),
      isBestSeller: Boolean(p.isBestSeller),
      isSignature: Boolean(p.isSignature),
      isSeasonal: Boolean(p.isSeasonal),
    })),
  );
  console.log(`✓ ${products.length} products`);

  // Keep category productCount in sync.
  for (const [family, category] of catByFamily) {
    const count = products.filter((p) => p.scentFamily === family).length;
    await Category.updateOne({ _id: category._id }, { $set: { productCount: count } });
  }

  // ─── Collection ────────────────────────────────────────────────────────────
  const signature = products.filter((p) => p.isSignature);
  await Collection.create({
    title: 'The Signature Collection',
    subtitle: 'Our most iconic compositions',
    image: 'https://res.cloudinary.com/demo/image/upload/almadina/collections/signature.jpg',
    accent: 'gold',
    productIds: signature.map((p) => p._id),
    productCount: signature.length,
    sortOrder: 0,
  });
  console.log('✓ 1 collection');

  console.log('🌱 Seed complete.');
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
