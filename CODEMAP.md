# Codemap — Alberta Government Enterprise Template

> Architectural blueprint: execution flows, dependency graph, API surfaces, and component relationships.
> For developer onboarding and AI agent context. Reduces codebase to ~5% of tokens, ~90% of understanding.

---

## Project Tree

```
vue-node-alberta-enterprise-template/
├── apps/
│   ├── api/                       Express REST API server
│   │   ├── vitest.config.ts       Test config (node env)
│   │   └── src/
│   │       ├── server.ts          ← ENTRY POINT (production)
│   │       ├── app.ts             ← Middleware chain + route registration
│   │       ├── controllers/       HTTP request/response mapping
│   │       ├── services/          Business logic + driver orchestration
│   │       ├── routes/            Endpoint definitions
│   │       ├── middleware/        Auth, CSRF, rate-limit, logger
│   │       ├── config/            DB pool + session store setup
│   │       └── utils/             Helpers (db-retry, logger)
│   │
│   └── web/                       Vue 3 SPA (GoA Design System)
│       ├── vitest.config.ts       Test config (happy-dom env)
│       └── src/
│           ├── main.ts            ← ENTRY POINT (frontend)
│           ├── App.vue            Root component
│           ├── router/            Routes + nav guards
│           ├── stores/            Pinia auth state
│           ├── views/             Page components
│           ├── components/        Layout + GoA wrappers
│           └── assets/            Styles
│
├── packages/
│   ├── shared/                    Types, Zod schemas, constants
│   ├── config/                    Env loading, validation, presets
│   │   └── vitest.config.ts       Test config (node env)
│   └── auth/                      Auth drivers (SAML, Entra ID, Mock)
│       └── vitest.config.ts       Test config (node env)
│
├── scripts/
│   └── migrations/                SQL migrations (app schema)
├── docker/                        Dockerfiles (api, web)
├── docs/                          Auth, deployment, development, testing, troubleshooting, compliance
├── e2e/                           Playwright E2E tests
├── .env.example                   Dev config template
├── .env.internal.example          Entra ID config template
└── .env.external.example          SAML config template
```

---

## Tech Stack (Required)

All code added to this template **must** use these technologies. Do not introduce alternatives.

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Language** | TypeScript (strict) | All application/library/test code in TS. JS allowed only for config/build tooling (e.g., `tailwind.config.js`, `postcss.config.js`, `node -e` scripts). |
| **Frontend** | Vue 3 (Composition API + `<script setup>`) | Single-file components only. |
| **State** | Pinia | Stores in `apps/web/src/stores/`. No Vuex, no raw composables for global state. |
| **Routing** | Vue Router 4 | Lazy-load views: `() => import('./views/X.vue')` |
| **Styling** | Tailwind CSS + GoA Design System | Use `@abgov/web-components` + `@abgov/design-tokens`. No custom color values. |
| **Backend** | Express 5 | Route → Controller → Service pattern. |
| **Auth** | Session-based (express-session) | **Not JWT.** Pluggable drivers via `BaseAuthDriver`. |
| **Validation** | Zod | Config schemas, shared types. No Joi, Yup, or class-validator. |
| **Database** | PostgreSQL (pg driver) | `app` schema only. Parameterized queries. No ORM. |
| **Build** | Vite (frontend), tsc (backend + packages) | Monorepo with npm workspaces. |
| **Testing** | Vitest (unit), Playwright (E2E), Supertest (API) | Colocated tests or dedicated `tests/` dirs. |
| **Linting** | ESLint 9 + Prettier | Flat config format. |

**Do NOT introduce**: JWT auth, Vuex, ORMs (Prisma/TypeORM/Sequelize), Webpack, Joi/Yup, CSS-in-JS, Redux-style patterns.

---

## Dependency Flow

```
packages ═══════════════════════════════════════════════════════════════
  shared ───► config ───► auth

apps ═══════════════════════════════════════════════════════════════════
  auth ───► api/services ───► api/controllers ───► api/routes
  config ──────► api/server
  shared ──────► web/stores

middleware chain ═══════════════════════════════════════════════════════
  helmet ───► cors ───► rate-limit ───► morgan ───► body-parser
    ───► db-pool ───► session ───► csrf ───► routes ───► static/SPA

HUBS: app.ts (9←), auth.service.ts (4←), base.driver.ts (3←)
```

**Build order**: shared → config → auth → api + web (parallel)

---

## API Surface (Type Signatures)

```typescript
// === packages/auth/src/drivers/base.driver.ts ===
interface AuthUser {
  id: string
  email: string
  name: string
  roles?: string[]
  attributes?: Record<string, any>
}

abstract class BaseAuthDriver {
  abstract getDriverName(): string
  abstract login(req: Request, res: Response): Promise<void>
  abstract callback(req: Request, res: Response): Promise<AuthUser>
  abstract logout(req: Request, res: Response): Promise<void>
  getUser(req: Request): AuthUser | null
  hasRole(user: AuthUser | null, role: string | string[]): boolean
}

// === packages/config/src/loader.ts ===
function loadEnv(envPath?: string): boolean
function loadApiConfig(options?: { autoLoad?, envPath?, throwOnError? }): ApiConfig | null
function loadWebConfig(options?: { autoLoad?, envPath?, throwOnError? }): WebConfig | null
function validateConfig(type: 'api' | 'web'): SafeParseResult
function getValidationErrors(type: 'api' | 'web'): string[] | null

// === apps/api/src/middleware/auth.middleware.ts ===
function requireAuth(req, res, next): void        // 401 if no session
function requireRole(...roles: string[]): Middleware  // 403 if missing role
function optionalAuth(req, res, next): void       // Attaches user if present

// === apps/web/src/stores/auth.store.ts (Pinia) ===
state: { user: User | null, loading: boolean, error: string | null }
getters: { isAuthenticated: boolean, hasRole(role): boolean }
actions: { fetchUser(), login(userIndex), logout(), checkStatus() }
```

---

## Execution Flows

### 1. HTTP Request → Response

```
Browser
  │
  ▼
server.ts                  Listen on HOST:PORT
  │
  ▼
app.ts                     createApp() → middleware chain:
  ├── helmet               Security headers, CSP (GoA CDN allowed)
  ├── cors                 Restricted to CORS_ORIGIN
  ├── rate-limit           100 req/15min general │ 5/15min auth
  ├── morgan               PII-redacted request logging
  ├── body-parser          JSON + URL-encoded (10MB)
  ├── db-pool              Conditional (only if DB_CONNECTION_STRING set)
  ├── session              Memory (dev) │ PostgreSQL (prod)
  ├── csrf                 Token validation on POST/PUT/PATCH/DELETE
  │
  ├── /api/v1/auth/*       ───► auth.routes ───► auth.controller ───► auth.service ───► driver
  ├── /api/v1/health       ───► inline (DB pool stats)
  ├── /api/v1/info         ───► inline (API metadata)
  ├── /api/v1/csrf-token   ───► inline (token generation)
  │
  ├── Static files         Production: serves apps/web/dist/
  └── SPA fallback         Non-API routes → index.html
```

### 2. Authentication (Strategy Pattern)

```
AUTH_DRIVER env var
  │
  ├── "mock"      ───► MockDriver      ───► ?user=0|1|2 query param ───► instant callback
  ├── "saml"      ───► SamlDriver      ───► SAML 2.0 redirect to IdP ───► assertion POST
  └── "entra-id"  ───► EntraIdDriver   ───► OIDC + PKCE to Microsoft ───► code exchange
                                                                              │
                                                              ┌───────────────┘
                                                              ▼
                                                  req.session.user = AuthUser
                                                  redirect → /profile
```

**Driver files**: `packages/auth/src/drivers/{mock,saml,entra-id}.driver.ts`
**Selection**: `apps/api/src/services/auth.service.ts` (switch on AUTH_DRIVER)

### 3. Frontend Navigation

```
URL change
  │
  ▼
router/index.ts            beforeEach guard:
  ├── First visit?         fetchUser() → GET /api/v1/auth/me
  ├── requiresAuth?        No session → redirect /login
  ├── guestOnly?           Has session → redirect /profile
  └── Set document title
  │
  ▼
  /              ───► HomeView.vue       (public)
  /about         ───► AboutView.vue      (public)
  /login         ───► LoginView.vue      (guestOnly)
  /profile       ───► ProfileView.vue    (requiresAuth)
  /*             ───► 404 → redirect /
```

### 4. Build Pipeline

```
npm run build
  │
  ▼
clean:build                Remove all dist/ + .tsbuildinfo
  │
  ▼
build:packages             Sequential:
  ├── @template/shared     tsc --build → packages/shared/dist/
  ├── @template/config     tsc --build → packages/config/dist/
  └── @template/auth       tsc --build → packages/auth/dist/
  │
  ▼
build:apps                 Parallel:
  ├── @template/api        tsc → apps/api/dist/
  └── @template/web        vue-tsc + vite build → apps/web/dist/
```

### 5. Test Pipeline

```
npm test                   Runs "vitest run" in all workspaces:
  │
  ├── packages/shared      (no tests yet — passWithNoTests)
  ├── packages/config      4 test files │ 49 tests
  │   ├── schemas/api.config.schema.test.ts   Zod coercion, enums, required fields, defaults
  │   ├── schemas/web.config.schema.test.ts   Timeout bounds, feature flags, URL validation
  │   ├── presets.test.ts                     getPreset(), generateEnvFile()
  │   └── loader.test.ts                     loadEnv(), loadApiConfig(), validateConfig()
  │
  ├── packages/auth        3 test files │ 34 tests
  │   ├── drivers/base.driver.test.ts         AuthUserSchema, getUser(), hasRole(), session lifecycle
  │   ├── drivers/mock.driver.test.ts         Production guard, login redirect, callback lookup
  │   └── utils/token-encryption.test.ts      AES-256-GCM round-trip, IV randomness, tamper detection
  │
  ├── apps/api             5 test files │ 64 tests
  │   ├── middleware/auth.middleware.test.ts   requireAuth, requireRole, optionalAuth
  │   ├── middleware/csrf.middleware.test.ts   Token generation, validation, skip paths
  │   ├── services/auth.service.test.ts       Driver selection, callback URL priority chain
  │   ├── utils/db-retry.test.ts              SQLSTATE allowlist, retry backoff, transaction lifecycle
  │   └── utils/logger.test.ts                PII sanitization (recursive, case-insensitive)
  │
  └── apps/web             1 test file  │ 15 tests
      └── stores/auth.store.test.ts           Pinia state, getters, fetchUser dedup, logout
                                              ─────────────────────────────────────
                                              Total: 13 files │ 162 tests
```

**Test co-location**: Each `*.test.ts` sits next to the source file it tests.
**Environments**: Backend tests run in `node`; frontend tests run in `happy-dom` (browser simulation).

**Mocking patterns**:
- **Pure functions** (schemas, encryption): No mocks — call and assert directly.
- **Express middleware**: Mock `req`/`res`/`next` objects with `vi.fn()` spies.
- **Workspace packages** (`@template/auth` in api tests): `vi.mock()` with inline Zod schema (avoids needing built artifacts).
- **Native modules** (pino in api tests): `vi.mock('pino')` since native bindings can't load in vitest.
- **Pinia stores**: Fresh `createPinia()` + `setActivePinia()` per test; `vi.mock('axios')` for API calls.

---

## Component Map

### API: Route → Controller → Service → Driver

```
auth.routes.ts
  │  defines endpoints, applies rate limiting
  ▼
auth.controller.ts
  │  HTTP ↔ service mapping, error handling, redirects
  ▼
auth.service.ts
  │  selects driver, orchestrates login/callback/logout
  ▼
{mock|saml|entra-id}.driver.ts
  │  provider-specific authentication logic
  ▼
External IdP or mock user list
```

### Web: Component Hierarchy

```
App.vue
└── AppLayout.vue
    ├── AppHeader.vue              GoA nav bar + user menu
    ├── <router-view />
    │   ├── HomeView.vue           Landing page
    │   ├── LoginView.vue          Auth method selection
    │   ├── ProfileView.vue        User info (protected)
    │   └── AboutView.vue          App info
    └── AppFooter.vue              Alberta Government footer

GoA wrappers:  GoabButton.vue │ GoabInput.vue │ GoabModal.vue
```

### Config: Environment → Validation → App

```
.env (monorepo root)
  │  find-up locates, dotenv loads
  ▼
loader.ts                  loadApiConfig() / loadWebConfig()
  │
  ▼
schemas/
  ├── api.config.schema.ts    Zod validates 50+ env vars (DB, auth, session, security)
  └── web.config.schema.ts    Zod validates frontend config (API URL, features)
  │
  ▼
presets.ts                 Development │ Internal │ External defaults
```

---

## Endpoints

| Method | Path | Auth | Rate | Handler |
|--------|------|:----:|------|---------|
| GET | `/api/v1/auth/login` | - | 5/15m | `authController.login` |
| GET | `/api/v1/auth/callback` | - | 5/15m | `authController.callback` |
| POST | `/api/v1/auth/logout` | Y | general | `authController.logout` |
| GET | `/api/v1/auth/me` | Y | general | `authController.getMe` |
| GET | `/api/v1/auth/status` | - | general | `authController.getStatus` |
| GET | `/api/v1/health` | - | - | inline |
| GET | `/api/v1/info` | - | - | inline |
| GET | `/api/v1/csrf-token` | - | - | inline |

**Response shape**: `{ success: boolean, data?: {}, error?: { code, message, details? } }`

---

## Database

```
PostgreSQL (Azure Standard)
├── Schema: app (NEVER public)
│   ├── app.session        sid VARCHAR PK │ sess JSON │ expire TIMESTAMP
│   └── [your tables]     Add via scripts/migrations/
│
└── Pool: min 2 │ max 10 │ connect 5s │ idle 30s │ statement 30s │ SSL in prod

SESSION_STORE=memory    → MemoryStore     (dev, lost on restart)
SESSION_STORE=postgres  → connect-pg-simple (prod, survives restart)
```

---

## Security Stack

```
Request ───► Helmet ───► CORS ───► Rate Limit ───► CSRF ───► Auth ───► Handler
               │          │           │              │         │
               │          │           │              │         ├── requireAuth()  → 401
               │          │           │              │         ├── requireRole()  → 403
               │          │           │              │         └── optionalAuth()
               │          │           │              │
               │          │           │              └── Token on POST/PUT/PATCH/DELETE
               │          │           └── 100 general │ 5 auth per 15min/IP
               │          └── CORS_ORIGIN whitelist
               └── CSP, X-Frame-Options, HSTS

Cookies:  httpOnly │ secure (prod) │ sameSite=lax
Logging:  PII redaction (passwords, emails, tokens, SSNs, credit cards)
```

---

## Invariants

1. **Single process** — Express serves API + static SPA. No separate web server.
2. **Pluggable auth** — Swap `AUTH_DRIVER` env var. All drivers extend `BaseAuthDriver`.
3. **All features optional** — Runs without DB, IdP, or cloud. Degrades gracefully.
4. **`app` schema only** — Azure PostgreSQL compliance. Never `public`.
5. **Session-based, not JWT** — Server-side state. Frontend reads via `GET /auth/me`.
6. **Packages before apps** — `build:packages && build:apps`. Never reversed.
7. **No sticky connections** — Pool with `allowExitOnIdle: true`. Serverless-safe.
8. **PII never logged** — Middleware redacts sensitive data before writing logs.
9. **GoA Design System** — All UI uses `@abgov/web-components` via Vue wrappers.

---

## Quick Reference: Adding Features

**New API endpoint**:
`routes/*.ts` → `controllers/*.ts` → `services/*.ts` → register in `app.ts`

**New frontend page**:
`views/*.vue` → add route in `router/index.ts` → add nav link in `AppHeader.vue`

**New shared type**:
`packages/shared/src/` → export from `index.ts` → `npm run build -w packages/shared`

**New auth driver**:
extend `BaseAuthDriver` → register in `auth.service.ts` switch → add config schema

**New database table**:
`scripts/migrations/NNN_*.sql` (use `app` schema) → types in `packages/shared/`

**New unit test**:
Create `foo.test.ts` next to `foo.ts` → mock external deps with `vi.mock()` → run `npm run test -w <workspace>`

---

## Conventions

**TypeScript**:
- Strict mode enabled. No `any` unless unavoidable (mark with `// eslint-disable-line` + comment why).
- Use `interface` for object shapes, `type` for unions/intersections.
- Shared types go in `packages/shared/`, app-local types stay in the app.

**Frontend**:
- `<script setup>` for all components. No Options API.
- Prefer GoA web components via Vue wrappers (`components/goa/`), especially when you need `v-model`/event bridging.
- Raw `<goa-*>` tags may be used directly in views where no wrapper behavior is required (some existing views do this).
- Lazy-load all views in router: `component: () => import('../views/X.vue')`
- Pinia stores for any state shared across components. Local `ref()`/`reactive()` for component-only state.

**Backend**:
- Controllers handle HTTP only (req/res). Business logic lives in services.
- Controller error handling: controllers may either forward errors with `next(error)` to shared middleware or catch errors and send HTTP responses directly (e.g., `auth.controller.ts`).
- Database queries use parameterized `$1, $2` placeholders. Never string interpolation.
- All tables in `app` schema. Migrations are plain SQL files, not ORM-generated.

**Security**:
- Auth middleware on every protected route: `requireAuth` or `requireRole()`.
- CSRF tokens required for all state-changing requests (POST/PUT/PATCH/DELETE).
- Never log PII. The logger middleware redacts automatically, but don't bypass it.
- Environment secrets via `process.env` — never hardcode credentials.

**Testing**:
- Unit tests colocated with source: `foo.ts` → `foo.test.ts` in the same directory.
- Each workspace has its own `vitest.config.ts` with appropriate environment (node or happy-dom).
- Run all: `npm test` from root. Run one: `npm run test -w packages/config`.
- Express middleware tests use mock `req`/`res`/`next` objects (not Supertest).
- Pinia store tests use fresh `createPinia()` per test with mocked axios.
- Workspace cross-references (e.g., `@template/auth` in api) must be mocked with `vi.mock()`.
- API integration tests use Supertest against the Express app (not running server).
- E2E tests in `e2e/` with Playwright.

---

## Further Reading

> **For coding agents**: This codemap is the canonical replacement for the old `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `TEMPLATE-GUIDE.md`.
> It contains everything you need for architecture, security posture, and template customization overview.
> Only read the docs below when you need **operational how-to details** for a specific task.

| Doc | When to read |
|-----|-------------|
| `CODEMAP.md` | Architectural overview, security model, and template customization map (start here) |
| `README.md` | First-time project setup and quick start |
| `PLACEHOLDERS.md` | Replacing `{{VARIABLE}}` placeholders when customizing the template |
| `docs/AUTH-SETUP.md` | Configuring SAML, Entra ID, or Mock identity providers |
| `docs/DEPLOYMENT.md` | Deploying to Azure, OpenShift, Docker, or Render |
| `docs/DEVELOPMENT.md` | Local dev setup, debugging, hot reload, IDE config |
| `docs/GOA-COMPONENTS.md` | Using GoA Design System components with code examples |
| `docs/TESTING.md` | Writing and running unit, integration, and E2E tests |
| `docs/TROUBLESHOOTING.md` | Diagnosing common errors and issues |
| `docs/AZURE_POSTGRESQL_COMPLIANCE.md` | Azure PostgreSQL compliance audit details |
| `docs/CONNECTION_BUDGET.md` | Database connection pool capacity planning |
| `scripts/migrations/README.md` | Running and writing database migrations |