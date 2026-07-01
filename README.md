# Al Madina API

Production-ready REST API for the **Al Madina** luxury Arabian perfume (Ittar) eCommerce platform — powering a React Native (Expo) mobile app and an admin panel.

Built with **Node.js · Express · TypeScript · MongoDB/Mongoose · Redis · BullMQ · JWT · Cloudinary**.

## Architecture

Layer + Feature based. Each feature in `src/modules/<feature>/` is isolated into `controller → service → repository → routes → schema`, sharing cross-cutting infrastructure:

```
src/
├── config/        # env validation, db, redis, cloudinary, logger
├── constants/     # business rules, error codes, cache keys
├── database/      # Mongoose models + seed
├── middlewares/   # auth, validate, rate-limit, upload, audit, error
├── modules/       # auth, products, categories, collections, reviews,
│                  #   wishlist, cart, orders, notifications, users,
│                  #   contact, search, admin
├── jobs/          # BullMQ queues + processors (email, push, notification)
├── emails/        # mailer + HTML templates
├── storage/       # Cloudinary upload helper
├── docs/          # OpenAPI 3.0 spec
├── routes/        # root /v1 router
├── utils/         # api-error, api-response, jwt, hash, paginate, cache, serialize
├── app.ts         # Express app (middleware chain)
└── server.ts      # HTTP server + graceful shutdown + workers
```

## Getting Started

```bash
npm install
cp .env.example .env        # then fill in secrets
docker compose up -d mongo redis   # or run your own
npm run seed                # optional demo data (admin@almadina.com / Admin@12345)
npm run dev                 # http://localhost:5000
```

Full stack via Docker:

```bash
docker compose up --build
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch-mode dev server (tsx) |
| `npm run build` / `start` | Compile to `dist/` and run |
| `npm test` | Jest + Supertest (in-memory Mongo) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Seed baseline data |

## API

- Base URL: `/v1`
- Docs (Swagger UI): **`/docs`** · raw spec: **`/docs.json`**
- Health: **`/health`**
- Response envelope: `{ data, message? }` · Error: `{ status, message, code, details? }`

### Auth
JWT access tokens (15m) + opaque refresh tokens (30d, stored hashed, rotated on refresh). Roles: `user`, `manager`, `admin`. Guest checkout supported.

## Notes
- Caching (Redis) and background jobs (BullMQ) **degrade gracefully** — if Redis is down, requests still succeed (cache misses fall to the DB; job enqueues are logged and skipped).
- Email delivery logs to console when SMTP is unconfigured.
- Push delivery (Expo/FCM) is stubbed as a deployment concern.
