# Trends Bird — Ecommerce Admin Dashboard

Backend Developer Intern assignment for Trends Bird Limited.

An admin-only REST API for an e-commerce catalog: authentication with refresh-token
rotation, a role/permission system enforced on every route, and a full catalog domain
(nested categories, brands, attributes, shared media, products with variants).

There is no storefront, cart, order or customer side — admin dashboard only, as specified.

---

## 1. Status at a glance

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Authentication | **Complete** | Login, refresh with rotation, real logout, session, change password |
| 2 | Permission | **Complete** | Groups + actions, normalisation, custom actions |
| 3 | Role | **Complete** | Grant/revoke, grant-all, user counts, lockout guard |
| 4 | User | **Complete** | One role each, filters, soft delete, self-escalation guard |
| 5 | Media | **Complete** | Cloudinary, content-based validation, generated thumbnails |
| 6 | Category | **Complete** | Unlimited nesting, tree endpoint, cycle rejection |
| 7 | Brand | **Complete** | CRUD, status filter, logo from library |
| 8 | Attribute | **Complete** | 5 types, typed reference values, per-attribute uniqueness |
| 9 | Product | **Complete** | Simple + variable, variants, media attachments, atomic create |
| — | **Frontend** | **Not attempted yet** | See §9 |

**67 routes** under `/api/v1`, **62** of them behind an explicit permission check.
The 5 that are not: three public auth routes (`login`, `refresh`, `logout`) and two that
only need a valid session (`GET /auth/session`, `POST /auth/change-password`).

---

## 2. Tech stack

| Area | Choice |
|---|---|
| Runtime | **Node.js 22.14 LTS** (`>=22` enforced in `package.json`) |
| Language | TypeScript (CommonJS) |
| Framework | Express 5 |
| Database | PostgreSQL 17 (Neon) |
| Data access | Prisma 6 — migrations committed under `backend/prisma/migrations` |
| Auth | JWT access + refresh token, refresh stored hashed and revocable |
| Passwords | bcrypt, cost 12 |
| Validation | Zod 4 — body, route params **and** query string |
| File storage | Cloudinary (upload via memory buffer, `sharp` for validation + thumbnails) |

---

## 3. Setup

### Prerequisites
- Node.js 22+
- A PostgreSQL 17 database (local, or a free [Neon](https://neon.com) project)
- A free [Cloudinary](https://cloudinary.com) account (only needed for the Media module)

### Steps

```bash
git clone <repository-url>
cd "Trends Bird LTD/backend"

npm install
cp .env.example .env      # then fill in the values below

npx prisma migrate deploy # apply all migrations
npm run seed              # permissions, roles, and the two accounts

npm run dev               # http://localhost:5000
```

`GET http://localhost:5000/health` should return `200`.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run lint` | ESLint over `src/` |
| `npm run prisma:migrate` | Create + apply a migration in development |
| `npm run prisma:deploy` | Apply existing migrations (use this in production) |
| `npm run seed` | Idempotent seed — safe to re-run |
| `npm run db:reset` | Drop, re-migrate and re-seed |

### Environment variables

Every key below is read by [`backend/src/app/config/env.ts`](backend/src/app/config/env.ts),
which validates on import and **crashes at boot** on a missing value rather than failing
later at request time. `.env.example` is kept in sync.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `development` \| `production` \| `test` |
| `PORT` | yes | Default `5000` |
| `FRONTEND_URL` | yes | Exact origin — CORS credentials mode forbids `*` |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | yes | Long random string |
| `JWT_ACCESS_EXPIRES` | yes | `15m` |
| `JWT_REFRESH_SECRET` | yes | Different long random string |
| `JWT_REFRESH_EXPIRES` | yes | `7d` |
| `BCRYPT_SALT_ROUND` | yes | 10–15, default 12 |
| `SUPER_ADMIN_*`, `CATALOG_USER_*` | yes | Seeded accounts (name, email, password) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Media only | Absent → uploads return a clean `503`, rest of the API still runs |
| `CLOUDINARY_FOLDER` | no | Default `trends-bird/media` |
| `MAX_FILE_SIZE_MB` | no | Default `10` |
| `LOGIN_RATE_LIMIT_WINDOW_MINUTES` | no | Default `15` |
| `LOGIN_RATE_LIMIT_MAX_FAILURES` | no | Default `20` — only **failed** logins count |

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Seeded credentials

`npm run seed` creates all 41 permissions, two roles and two accounts.

| Account | Email | Password | Role |
|---|---|---|---|
| Super administrator | `superadmin@trendsbird.test` | `SuperAdmin@123` | Super Admin — all 41 permissions |
| Limited catalog user | `catalog@trendsbird.test` | `Catalog@123` | Catalog Manager — 26 permissions |

The **Catalog Manager** exists to make 403 checks quick, exactly as §4.4 asks. It holds
`dashboard:watch` plus every `media`, `category`, `brand`, `attribute` and `product`
permission, and **no** `permission:*`, `role:*` or `user:*` permission at all. Any write
to those three modules with its token returns **403**.

Credentials come from `.env`, so change them there before seeding a public deployment.

---

## 5. Token strategy

**HttpOnly cookies are the primary strategy**, with `Authorization: Bearer` accepted as a
documented fallback.

| Cookie | HttpOnly | Lifetime | Path |
|---|---|---|---|
| `accessToken` | yes | 15 minutes | `/` |
| `refreshToken` | yes | 7 days | `/api/v1/auth` |
| `csrfToken` | **no** — JS must read it | 7 days | `/` |

- `sameSite` tracks `secure`: `none` + `secure` in production (cross-domain dashboard),
  `lax` in development, because browsers silently drop a non-secure `SameSite=None`
  cookie over plain http.
- **CSRF**: double-submit. Cookie-authenticated mutating requests must echo the
  `csrfToken` value in the `X-CSRF-Token` header. A third-party site can make the browser
  *send* the cookie but cannot *read* it to build the header. `POST /auth/login` is exempt
  — there is no session to protect yet, and enforcing it there would lock out anyone
  holding a stale cookie.
- **Why Bearer is also accepted**: §4.4 says reviewers will call endpoints directly from
  Postman with a low-privilege token. A request carrying `Authorization: Bearer` is exempt
  from the CSRF header requirement, because a cross-site attacker cannot set that header —
  the same reasoning that makes the double-submit header work. `POST /auth/login` returns
  both the access token and the CSRF token in its body for exactly this purpose.
- **The Authorization header is read before the cookie.** This matters: if the cookie were
  preferred, a request with a junk Bearer header plus a valid session cookie would skip
  CSRF and still authenticate. Reading the header first keeps "authenticated by header"
  and "exempt from CSRF" the same condition.
- **The refresh token is never returned in a response body** — only ever set as a cookie.
  It is stored as a SHA-256 hash, so a database leak does not hand over live sessions.

---

## 6. Access control

Two guards, and the first is mounted on the **entire** API tree:

```ts
app.use("/api/v1", csrfGuard, authGuard, router);
```

Authentication is therefore the default. A newly added route is protected without anyone
remembering to protect it; opening one up means adding it to the explicit three-entry
allowlist in [`authGuard.ts`](backend/src/app/middlewares/authGuard.ts). The failure mode
of a wiring mistake is a route that is *too strict*, which shows up immediately — not one
that is silently open.

The second guard, `requirePermission("product:create")`, is declared per route.

**Permissions are resolved from the database on every request**, not read from JWT claims.
That costs one indexed query and buys correctness: revoking a permission or deactivating
an account takes effect on the **next request**, not whenever the token happens to expire.

| Status | When |
|---|---|
| **401** | Token missing, malformed, expired, wrongly signed, or the account is inactive/deleted |
| **403** | Token valid, but the role lacks the required permission (or CSRF failed) |
| **422** | Validation failure (body, params or query) |
| **404** | Record not found |
| **409** | Conflict — duplicate slug/SKU/email, or a delete blocked by references |
| **413** | Upload exceeds `MAX_FILE_SIZE_MB` |

Prisma error codes are mapped centrally (`P2002 → 409`, `P2025 → 404`, `P2003 → 409`,
`P2000 → 422`), so a predictable bad input never produces a 500.

### Response shapes

```jsonc
// success
{ "statusCode": 200, "success": true, "message": "...",
  "meta": { "page": 1, "limit": 10, "total": 0, "totalPage": 0 },   // list endpoints only
  "data": {} }

// error
{ "statusCode": 422, "success": false, "message": "Validation failed",
  "errorSources": [{ "path": "email", "message": "Enter a valid email address." }],
  "stack": null }   // stack only when NODE_ENV=development
```

---

## 7. Design decisions

### Policy choices the assignment asks us to state

| Question | Decision |
|---|---|
| Deleting a permission held by roles (§5.2) | **Cascade** the role links. The permission goes; roles survive minus that entry, so nothing is left pointing at a missing record. |
| Deleting a role users hold (§5.3) | **Refuse**, 409, with the user count in the message. |
| Deleting a user (§5.4) | **Soft delete** — `isDeleted` + `deletedAt`, excluded from all reads. The email stays reserved; re-using it returns a 409 that says so. |
| **Does a role change take effect on the next request or the next refresh? (§5.4)** | **The next request.** Verified: after a demotion, the same unexpired token returns 403 on the next call. |
| Deleting media still attached (§5.5) | **Refuse** with 409 listing the attachment count; `?force=true` detaches cleanly first. Deleting removes the Cloudinary asset *and* its thumbnail *and* the row. |
| Deleting a category with children (§5.6) | **Refuse**, 409. Children are never orphaned. |
| Deleting a brand with products (§5.7) | **Refuse**, 409. |
| Deleting an attribute/value used by a variant (§5.8) | **Refuse**, 409 with the variant count. |
| Validation failure status | **422** — §4.2 permits 400 or 422; 400 stays reserved for malformed requests that never reach a schema. |

### Guarantees pushed into PostgreSQL

Application checks give good error messages; the database makes them true. Each of these
was verified by bypassing the API with raw SQL and observing `23505`:

- `categories.slug`, `brands.name`, `brands.slug`, `products.slug`, `products.sku`,
  `product_variants.sku` — unique columns.
- `@@unique([attributeId, value])` — a value is unique **within** its attribute, so `Red`
  can exist under both `Colour` and `Material`.
- `@@unique([productId, combinationKey])` — two variants of one product can never share an
  attribute combination. The key is a hash of the *sorted* value ids, so `Red+S` and
  `S+Red` collide as they should.
- **Partial unique indexes**, hand-written in
  [`20260727114124_add_products_and_variants/migration.sql`](backend/prisma/migrations)
  because Prisma cannot express them: at most one thumbnail per product and one per
  variant, and no duplicate attachment of the same asset to the same product.

### Other decisions worth knowing

- **Uploads are validated by content, not by name.** `sharp` decodes the buffer and a
  magic-byte table covers video; the client's `Content-Type` and the file extension are
  both ignored. A JPEG named `photo.png` is stored as `image/jpeg`; a text file renamed
  `evil.png` is rejected with 422. **SVG is deliberately excluded** — it can carry inline
  script.
- **Batch uploads are all-or-nothing.** Every file is inspected before anything is sent to
  storage, and if a later step fails, already-uploaded assets are destroyed.
- **Money is `Decimal(12,2)`**, never a float, and serialized to JSON numbers at the edge.
- **Renaming never re-slugs.** Slugs change only when passed explicitly, so links stay
  stable. Auto-generated slugs rebuild each candidate from the base (`electronics`,
  `electronics-1`, `electronics-2`) rather than appending to the previous suffix.
- **Deactivating a user or resetting their password revokes their refresh tokens**, so an
  ended session cannot be resurrected through `/auth/refresh`.
- **Refresh-token reuse detection**: presenting an already-rotated token revokes the whole
  token chain for that user.
- **Login throttling counts only failures** (20 per 15 minutes by default), so signing in
  repeatedly is never throttled — only repeated *wrong* credentials are.
- **Empty query parameters are treated as absent.** `?roleId=&isActive=` is the same as
  sending nothing, because that is what a dashboard emits when its filters are cleared.

---

## 8. API collection

[`docs/postman_collection.json`](docs/postman_collection.json) — 94 requests across 11
folders, covering every route.

Import it into Postman, set `baseUrl` if you are not on `http://localhost:5000/api/v1`,
and send **Authentication → Login (super admin)**. The access and CSRF tokens are captured
into collection variables automatically; everything else uses them. Running
**Authentication → Seed collection variables** once fills in the permission and role ids
that the Role, User and Product examples reference, so the collection runs top to bottom
in the Collection Runner without hand-editing any id.

The **Access control checks** folder is the quick way to verify §4.4: it logs in as the
limited catalog user and asserts **403** on every permission, role and user route —
including all three delete routes — then shows the same token succeeding on `/products`,
which proves the 403s are permission-based and not a broken token.

The last folder, **Session teardown**, changes the super admin's password and logs out. It
is deliberately last; re-run `npm run seed` afterwards to restore the documented password.

Verified with Newman: **95 requests, 36 assertions, 0 failures.**

```bash
npx newman run docs/postman_collection.json
```

### Route reference

Base URL: `/api/v1`.

<details>
<summary><b>Authentication</b> — 5 routes</summary>

| Method | Path | Permission |
|---|---|---|
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public |
| POST | `/auth/logout` | public |
| GET | `/auth/session` | any signed-in user |
| POST | `/auth/change-password` | any signed-in user |

`GET /auth/session` returns the user, their role, and a **flat array of permission names** —
the dashboard renders from this and drives its sidebar from the `:watch` entries.
</details>

<details>
<summary><b>Permission</b> — 11 routes</summary>

| Method | Path | Permission |
|---|---|---|
| GET | `/permissions/actions` | `permission:read` |
| GET | `/permissions/groups` | `permission:read` |
| POST | `/permissions/groups` | `permission:create` |
| GET | `/permissions/groups/:id` | `permission:read` |
| PATCH | `/permissions/groups/:id` | `permission:update` |
| DELETE | `/permissions/groups/:id` | `permission:delete` |
| GET | `/permissions` | `permission:read` |
| POST | `/permissions` | `permission:create` |
| GET | `/permissions/:id` | `permission:read` |
| PATCH | `/permissions/:id` | `permission:update` |
| DELETE | `/permissions/:id` | `permission:delete` |

Naming a group `Product` and ticking Create + Read produces `product:create` and
`product:read`. Actions are normalised (`"  Create "` → `create`, `"Bulk Import"` →
`bulk-import`). On `PATCH`, `actions` is the **desired end state** — anything missing is
removed, which is how the permission grid submits.
</details>

<details>
<summary><b>Role</b> — 8 routes</summary>

| Method | Path | Permission |
|---|---|---|
| GET | `/roles` | `role:read` |
| POST | `/roles` | `role:create` |
| GET | `/roles/:id` | `role:read` |
| PATCH | `/roles/:id` | `role:update` |
| DELETE | `/roles/:id` | `role:delete` |
| POST | `/roles/:id/permissions` | `role:update` |
| DELETE | `/roles/:id/permissions` | `role:update` |
| POST | `/roles/:id/permissions/grant-all` | `role:update` |

**Lockout guard**: any change that would leave no active role holding `role:update` with an
active user is refused with 409. It fires on all three paths — replacing the permission
set, revoking individually, and deactivating the role.
</details>

<details>
<summary><b>User</b> — 6 routes</summary>

| Method | Path | Permission |
|---|---|---|
| GET | `/users` | `user:read` |
| POST | `/users` | `user:create` |
| GET | `/users/:id` | `user:read` |
| PATCH | `/users/:id` | `user:update` |
| PATCH | `/users/:id/status` | `user:update` |
| DELETE | `/users/:id` | `user:delete` |

Role is **required and never defaulted**. A user cannot change their own role or active
status, nor delete themselves (403) — editing their own name is still allowed.
</details>

<details>
<summary><b>Media</b> — 5 routes</summary>

| Method | Path | Permission |
|---|---|---|
| POST | `/media/upload` | `media:upload` |
| GET | `/media` | `media:read` |
| GET | `/media/:id` | `media:read` |
| PATCH | `/media/:id` | `media:write` |
| DELETE | `/media/:id` | `media:delete` |

Multipart field name is **`files`** (works for one or many, up to 10); `file` is accepted as
an alias. `requirePermission` runs *before* multer, so an unauthorized upload never gets
buffered into memory.
</details>

<details>
<summary><b>Category</b> — 6 routes</summary>

| Method | Path | Permission |
|---|---|---|
| GET | `/categories` | `category:read` |
| GET | `/categories/tree` | `category:read` |
| POST | `/categories` | `category:create` |
| GET | `/categories/:id` | `category:read` |
| PATCH | `/categories/:id` | `category:update` |
| DELETE | `/categories/:id` | `category:delete` |

`GET /categories/tree` returns the real nested tree with a `depth` on every node.
Cycles are rejected at any depth — a category can never become its own ancestor.
</details>

<details>
<summary><b>Brand</b> — 5 routes</summary>

| Method | Path | Permission |
|---|---|---|
| GET | `/brands` | `brand:read` |
| POST | `/brands` | `brand:create` |
| GET | `/brands/:id` | `brand:read` |
| PATCH | `/brands/:id` | `brand:update` |
| DELETE | `/brands/:id` | `brand:delete` |
</details>

<details>
<summary><b>Attribute</b> — 8 routes</summary>

| Method | Path | Permission |
|---|---|---|
| GET | `/attributes` | `attribute:read` |
| POST | `/attributes` | `attribute:create` |
| GET | `/attributes/:id` | `attribute:read` |
| PATCH | `/attributes/:id` | `attribute:update` |
| DELETE | `/attributes/:id` | `attribute:delete` |
| POST | `/attributes/:id/values` | `attribute:update` |
| PATCH | `/attributes/:id/values/:valueId` | `attribute:update` |
| DELETE | `/attributes/:id/values/:valueId` | `attribute:delete` |

Types: `DROPDOWN`, `RADIO`, `CHECKBOX`, `COLOR_SWATCH`, `IMAGE_SWATCH`. A colour value
requires `colorCode` (hex); an image value requires `mediaId`; neither is allowed on the
other three types. Changing an attribute's type re-validates its existing values.
</details>

<details>
<summary><b>Product</b> — 13 routes</summary>

| Method | Path | Permission |
|---|---|---|
| GET | `/products` | `product:read` |
| POST | `/products` | `product:create` |
| GET | `/products/:id` | `product:read` |
| PATCH | `/products/:id` | `product:update` |
| DELETE | `/products/:id` | `product:delete` |
| POST | `/products/:id/variants` | `product:update` |
| POST | `/products/:id/variants/generate` | `product:update` |
| PATCH | `/products/:id/variants/:variantId` | `product:update` |
| DELETE | `/products/:id/variants/:variantId` | `product:delete` |
| POST | `/products/:id/media` | `product:update` |
| PATCH | `/products/:id/media/:attachmentId` | `product:update` |
| PATCH | `/products/:id/media/reorder` | `product:update` |
| DELETE | `/products/:id/media/:attachmentId` | `product:delete` |

A **simple** product carries `price`/`salePrice`/`stock`; a **variable** one carries them on
each variant. The `hasVariants` flag drives validation in both directions. Creating a
product with its categories, media and variants is **one transaction** — a failed variant
leaves no half-built product. List rows carry thumbnail, brand, categories, and a flat
price *or* a `priceRange` computed from effective (sale) prices.
</details>

---

## 9. What is not done

- **The frontend has not been started.** The assignment requires a dashboard UI; only the
  API exists so far. This is the single largest gap in the submission and it is stated
  plainly rather than implied.
- **No automated test suite is committed.** Every module was verified with scripted
  end-to-end runs against the live database (532 assertions in total, including access
  control, the 401/403 matrix, transaction atomicity and raw-SQL constraint probes), but
  those scripts were working tools, not a committed `npm test`. §13 lists tests as
  optional; this is still a gap worth naming.

## 10. Known issues and limitations

- **Deleting a media asset leaves the file orphaned in Cloudinary if the remote call fails.**
  The database row is removed first, then storage is cleaned up. That ordering is
  deliberate — the alternative failure mode is a record pointing at a file that no longer
  exists, which §5.5 forbids. An orphaned file costs storage; a broken reference breaks
  pages. There is no reconciliation job.
- **A soft-deleted user's email stays reserved.** Creating a user with that address returns
  409 explaining why. There is no restore endpoint, so freeing the address means editing
  the database directly.
- **The login rate limiter is in-process memory.** It resets on restart and is not shared
  across instances. Behind more than one replica it would need Redis.
- **The category tree is built in memory.** One query fetches all rows and the tree is
  assembled in JavaScript. That is fine for an admin catalog; tens of thousands of
  categories would want a recursive CTE.
- **Variant matrix generation is capped at 200 combinations** per request, to stop a
  five-attribute selection from creating thousands of rows by accident.
- **HTML in `longDescription` is stored as received.** The field is length-capped but not
  sanitized, so a frontend must escape it or run it through a sanitizer before rendering.
- **`GET /permissions/actions` requires `permission:read`**, so a role that can only manage
  roles cannot fetch the standard action list for the grid. Arguably it should be readable
  by anyone who can edit a role.

---

## 11. Repository layout

```
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # committed, runnable in order
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.ts               # middleware order, guards, /api/v1 mount
│   │   ├── server.ts            # connect, listen, signal handlers
│   │   └── app/
│   │       ├── config/          # env, prisma, cloudinary, multer
│   │       ├── error/           # AppError
│   │       ├── helpers/         # prisma/zod/multer error normalisers
│   │       ├── interfaces/      # shared types, Express augmentation
│   │       ├── middlewares/     # authGuard, requirePermission, csrfGuard, validateRequest
│   │       ├── modules/<name>/  # constant · interface · validation · service · controller · route
│   │       ├── routes/          # single moduleRoutes array
│   │       └── utils/           # catchAsync, sendResponse, buildListQuery, tokens, slug
│   └── .env.example
├── docs/
│   └── postman_collection.json
└── frontend/                    # not started
```

Each module keeps routing, business logic and data access separate: routes declare the
path, guards and validation; controllers only read the request and hand off; services hold
every rule and every query and never see `req`/`res`.
