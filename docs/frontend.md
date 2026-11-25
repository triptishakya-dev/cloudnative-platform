# CloudNativ storefront

## Implemented experience

- Responsive workspace shell with sidebar/mobile navigation and a clear order count.
- Live product listing, search, stock filtering, price sorting and pagination.
- Product details and an order review with persistent browser-local selection.
- Account registration, sign-in, HTTP-only session cookies, sign-out and expired-session handling.
- Customer order history, order details, status timeline and confirm/cancel/complete controls.
- Administrator product listing, create/edit forms and delete confirmation.
- Native confirmation dialogs, focus outlines, labelled controls, empty/error/loading states,
  reduced-motion support and keyboard-accessible navigation.
- A separately labelled sample collection at /products?mode=preview. Sample products cannot
  be ordered, and they are not inserted into the catalog database.

The root route presents the storefront collection. Existing landing-page components remain
in the repository for future reuse. Product pictures are vector illustrations, not product photos.

## Local addresses

| Service | Address |
| --- | --- |
| Frontend | http://127.0.0.1:3003 |
| Gateway | http://127.0.0.1:3100 |
| Catalog | http://127.0.0.1:3001 |
| Orders | http://127.0.0.1:3002 |
| Mailpit | http://127.0.0.1:8025 |

Use explicit IPv4 upstream addresses and separate ports. The previous Next.js instance
on IPv6 port 3001 must not compete with the catalog service.

## Start locally (Git Bash, project root)

```bash
docker compose -f infrastructure/docker/docker-compose.yaml up -d postgres rabbitmq mailpit
npm --prefix applications/api-gateway install
npm --prefix applications/catalog-service install
npm --prefix applications/frontend install
npm --prefix applications/api-gateway run auth:setup
```

The account initializer supports existing PostgreSQL volumes and creates auth_db and its
accounts table without resetting data. Fresh volumes also get auth_db from init-db.sql.
AUTH_DATABASE_URL and AUTH_DATABASE_ADMIN_URL are documented in the gateway .env.example.
Catalog's additive category-table migration fixes its previously missing Category model.
If upgrading, stop the catalog first (Windows can lock Prisma's DLL), then:

```bash
cd applications/catalog-service
npm run db:migrate
npm run db:generate
cd ../..
```

Keep these commands running in separate terminals from the project root:

```bash
PORT=3001 npm --prefix applications/catalog-service run dev
```

```bash
PORT=3002 CATALOG_SERVICE_URL=http://127.0.0.1:3001 npm --prefix applications/order-service run dev
```

```bash
PORT=3100 CATALOG_SERVICE_URL=http://127.0.0.1:3001 ORDER_SERVICE_URL=http://127.0.0.1:3002 npm --prefix applications/api-gateway run dev
```

```bash
npm --prefix applications/notification-worker run dev
```

```bash
npm --prefix applications/frontend run dev
```

Follow notifications.md and outbox-reliability.md for their first-time DB setup/migrations.
The frontend defaults to the gateway above. Override API_GATEWAY_URL and FRONTEND_ORIGIN
in applications/frontend/.env.local if necessary. Never expose JWT_SECRET through NEXT_PUBLIC.
The server makes gateway requests; browser requests are same-origin.

## Create accounts

Open /login and choose Create an account. Public registration always creates a customer.
Passwords require 12–128 characters and are salted/hashed using scrypt.
No administrator credentials are shipped or automatically created.
To create your own initial administrator, run this in Git Bash:

```bash
read -rp 'Administrator email: ' ADMIN_EMAIL
read -rsp 'Administrator password (12+ characters): ' ADMIN_PASSWORD
printf '\n'
export ADMIN_EMAIL ADMIN_PASSWORD
npm --prefix applications/api-gateway run auth:setup
unset ADMIN_EMAIL ADMIN_PASSWORD
```

The script creates a new administrator only when the email is unused. It does not change
credentials or elevate an existing customer. Sign in normally, then open /admin/products.

## API additions and reuse

Gateway additions:

- POST /auth/register: { email, password }, creates a customer and issues a signed 15-minute JWT.
- POST /auth/login: { email, password }, verifies credentials and issues a signed JWT.
- GET /auth/me: requires a valid bearer token and returns current account details.

Next.js /api/session handles browser login, registration, logout and account state. It stores
the token in an HTTP-only, SameSite=Lax cookie (Secure when served over HTTPS), and never
returns the bearer token to client code. Mutations check the configured same origin.
The allowlisted /api/gateway/... bridge forwards catalog/order calls with the server-held token.

Existing catalog/order routes are reused. Product queries now additionally accept:
`inStock=true|false` and `sort=latest|low|high`. Filtering and sorting happen before pagination.
Server validation and gateway role checks enforce permissions independently of the interface.

## Verified

- Frontend production build and TypeScript checks.
- Gateway/account password tests and isolated PostgreSQL account integration tests.
- Frontend API integration: cookie flags, CSRF rejection, anonymous protection, account isolation,
  customer write rejection, admin CRUD, stock filtering, price sorting and pagination.
- Browser: desktop/narrow layout, navigation, live and preview catalogs, search, registration,
  sign-in/out, checkout return, order placement, history/details and customer admin-access denial.
- The browser-created local test order 914dea9a-1e6c-445f-837d-c30af9d7bfe0 produced an email in Mailpit.
- Confirmation of that persisted test order was blocked by automatic approval review; its status
  remains PENDING and that browser mutation check needs explicit approval. It was not bypassed
  through another tool or API.

```bash
npm --prefix applications/frontend run build
npm --prefix applications/api-gateway run build
npm --prefix applications/api-gateway test
npm --prefix applications/api-gateway run test:accounts:integration
npm --prefix applications/frontend run test:integration
```

The frontend integration test requires the local running services. It creates unique test
accounts and catalog fixtures and removes only those fixtures. It never confirms or cancels
an existing order. Browser QA created a local example.com customer and one pending order;
the browser was signed out afterward. No real payment or external email delivery is involved.

## Remaining product/security work

- Password reset, email verification, refresh/revocable sessions, production role provisioning.
- Production HTTPS, strong shared JWT secrets, separate least-privilege DB roles, and distributed
  login rate limiting. JWT_SECRET is required to differ from the development default in production.
- Logout clears the browser cookie; an already copied bearer token remains valid until expiration.
- The existing order service still needs robust idempotency, stock reservation/deduction, and
  concurrent business-transition checks. The UI uses current catalog prices on the server, but
  its review total is an estimate. This UI does not add payment or shipping functionality.
- Product photo uploads and category assignment are future enhancements; current product images
  are illustrative and category routes remain independent of products.
- Containerizing the application processes and production deployment remain separate milestones.
