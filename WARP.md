# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

Node.js Express API using ES modules, Drizzle ORM with Neon Postgres, Zod validation, JWT-based auth, and Winston logging. The entrypoint is `src/index.js`, which loads `src/server.js` and `src/app.js`.

## Common commands

All commands below assume a Node/npm environment.

- Install dependencies:
  - `npm install`
- Start development server with file watching:
  - `npm run dev`
- Lint JavaScript with ESLint:
  - `npm run lint`
- Auto-fix lint issues:
  - `npm run lint:fix`
- Format code with Prettier:
  - `npm run format`
- Check formatting without writing changes:
  - `npm run format:check`
- Drizzle database operations (use `DATABASE_URL` from `.env`):
  - Generate migrations from models: `npm run db:generate`
  - Apply migrations: `npm run db:migrate`
  - Open Drizzle studio: `npm run db:studio`

There is currently no configured test runner or test scripts; add one (e.g. Vitest/Jest) before expecting `npm test`-style commands to work.

## High-level architecture

### Entry & HTTP layer

- `src/index.js`
  - Loads environment variables via `dotenv/config.js`.
  - Imports `src/server.js`, which starts the HTTP server.
- `src/server.js`
  - Imports the Express app from `src/app.js`.
  - Binds `app.listen` on `PORT` (default `3000`) and logs the server URL.
- `src/app.js`
  - Creates the Express application.
  - Global middleware:
    - `helmet` for security headers.
    - `cors` for cross-origin requests.
    - `express.json` and `express.urlencoded` for body parsing.
    - `cookie-parser` for cookie handling.
    - `morgan` HTTP logging, wired to the shared Winston `logger`.
  - Routes:
    - `GET /` – simple health/info endpoint that logs a message.
    - `GET /health` – structured health check with status, timestamp, and uptime.
    - `GET /api` – basic API status endpoint.
    - Mounts auth routes under `/api/auth` via `src/routes/auth.routes.js`.

### Routing & controllers

- `src/routes/auth.routes.js`
  - Sets up an Express router under `/api/auth`.
  - `POST /sign-up` → `signup` handler in `src/controllers/auth.controller.js`.
  - `POST /sign-in` and `POST /sign-out` are currently placeholder handlers.
- `src/controllers/auth.controller.js`
  - `signup(req, res, next)` flow:
    - Validates `req.body` against `signupSchema` from `src/validations/auth.validation.js`.
    - On validation failure, responds with `400` and human-readable error messages from `formatValidationError`.
    - Calls `createUser` in `src/services/auth.service.js` to persist a user.
    - Generates a JWT via `jwtToken.sign` (from `src/utils/jwt.js`) and stores it in a secure cookie via `cookies.set`.
    - Logs a signup event with the shared `logger`.
    - On known conflict (e.g. user already exists), returns `409`; otherwise delegates to Express error handling.

### Services & business logic

- `src/services/auth.service.js`
  - `hashPassword(password)` – bcrypt-based password hashing with logging and error normalization.
  - `createUser({ name, email, password, role })` – wraps Drizzle DB access:
    - Queries the `users` table for an existing user by email.
    - If found, throws a conflict error.
    - Hashes the password, inserts a new user row, and returns a subset of fields using `.returning`.
    - Logs creation and normalizes low-level DB errors.

### Data access & ORM

- `src/config/database.js`
  - Creates a Neon HTTP client from `DATABASE_URL` and passes it to Drizzle.
  - Exports both the raw `sql` client and the Drizzle `db` instance for queries.
- `src/models/user.model.js`
  - Defines the `users` table via `drizzle-orm/pg-core` with fields: `id`, `name`, `email` (unique), `password`, `role`, `created_at`, `updated_at`.
- `drizzle.config.js`
  - Points Drizzle at `./src/models/*.js` for schema generation.
  - Uses `DATABASE_URL` for migrations.
  - Outputs migration artifacts under `./drizzle`.

### Validation & utilities

- `src/validations/auth.validation.js`
  - `signupSchema` – validates and constrains `name`, `email`, `password`, and optional `role` (`user` or `admin`).
  - `signinSchema` – basic email/password validation for future sign-in flow.
- `src/utils/format.js`
  - `formatValidationError` – converts Zod error objects into user-friendly comma-separated strings, used by controllers.
- `src/utils/jwt.js`
  - Central JWT helper (`jwtToken.sign` / `jwtToken.verify`).
  - Reads `JWT_SECRET` (with a non-production-safe default) and configures a `1d` expiry.
  - Logs token errors through the shared logger and rethrows normalized errors.
- `src/utils/cookies.js`
  - Encapsulates secure cookie handling with environment-aware defaults (e.g. `secure` only in production, `httpOnly`, strict `sameSite`).
  - Provides `set`, `clear`, and `get` helpers for Express `req`/`res` objects.

### Logging

- `src/config/logger.js`
  - Creates a Winston logger with JSON output and a service name of `acquisitions-api`.
  - File transports:
    - `logs/error.log` for level `error`.
    - `logs/combined.log` for all logs.
  - In non-production environments, adds a colorized console transport with a simple format.
  - Used across controllers, services, and utilities for consistent logging.

## Module resolution & path aliases

The project uses Node ESM and `package.json#imports` for path aliases. Key aliases include:

- `#config/*` → `./src/config/*`
- `#db/*` → `./src/db/*` (not yet used in the current files but reserved for DB helpers)
- `#controllers/*` → `./src/controllers/*`
- `#models/*` → `./src/models/*`
- `#services/*` → `./src/services/*`
- `#utils/*` → `./src/utils/*`
- `#validations/*` → `./src/validations/*`
- `#middleware/*` → `./src/middleware/*`
- `#routes/*` → `./src/routes/*`

When adding new modules, prefer these aliases in imports to keep paths consistent and avoid deep relative imports.

## Environment configuration

- Environment variables are loaded via `dotenv/config` (see `src/index.js` and `drizzle.config.js`).
- Required variables for a working local environment:
  - `DATABASE_URL` – Neon/Postgres connection string for both runtime DB access and Drizzle migrations.
  - `JWT_SECRET` – secret key for JWT signing and verification (do not rely on the default in production).
  - `LOG_LEVEL` (optional) – Winston minimum log level; defaults to `info`.
  - `NODE_ENV` (optional) – controls logger console transport and cookie `secure` flag.
  - `PORT` (optional) – HTTP port; defaults to `3000`.
- The repo includes `.env.example`; copy to `.env` and fill in values before running the app or migrations.
