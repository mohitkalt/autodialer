# Autodialer

Next.js **16** (App Router) frontend for agent login and the **leads dashboard**: LeadSquared-style queues (dialed vs queue tabs), **last-call** snapshot, dialer **break/shift** controls, and dark/light theme. The browser calls **same-origin** `/api/*` routes; each handler proxies to your upstream APIs using **`NEXT_PUBLIC_AUTH_BASE_URL`** (login + OTP only) or **`NEXT_PUBLIC_API_BASE_URL`** (everything else, including permission lookup as routed today).

---

## Prerequisites

- **Node.js ≥ 20.9** (required by Next.js 16)
- **npm** (project ships `package-lock.json` for reproducible installs)

---

## Environment variables

Create **`.env.local`** for local dev (`npm run dev` loads it via `env-cmd`). Use **`.env.production`** for `npm run prod` / container runtime where applicable.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_AUTH_BASE_URL` | **Yes** | Upstream base URL for **email login** and **OTP verify** only (`/api/auth/login/email`, `/api/auth/verify-otp`). Missing scheme is normalized server-side (e.g. internal IPs). |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | Upstream base URL for **leads**, **lead-dialer** (config, breaks, shifts, last-call), **permission** proxy, and other API routes under `/api/*` that use `requireApiBaseUrl`. |
| `PORT` | No | HTTP port for `next dev` / `next start` (default **3000**). |

Example:

```env
NEXT_PUBLIC_AUTH_BASE_URL=https://your-auth.example.com
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com
PORT=3000
```

**Docker / CI:** `NEXT_PUBLIC_*` values are baked in at **`next build`**. Pass build-args as in `Dockerfile` comments when URLs differ per environment.

---

## Scripts

| Command | Env file | Description |
|---------|-----------|-------------|
| `npm run dev` | `.env.local` | Development server. |
| `npm run local` | `.env.local` | Alias of `dev`. |
| `npm run build` | shell / CI | Production build only (no `env-cmd` file). |
| `npm run start` | shell / CI | Production server (expects env already set). |
| `npm run prod` | `.env.production` | `next build` then `next start` with that file. |
| `npm run start:prod` | `.env.production` | `next start` only. |
| `npm run lint` | — | ESLint (`eslint` via Next config). |

---

## Architecture (high level)

```text
Browser (React + Redux / RTK Query)
    → same-origin GET/POST/PATCH `/api/...`
    → Next route handlers (`src/app/api/**/route.ts`)
    → upstream `NEXT_PUBLIC_AUTH_BASE_URL` OR `NEXT_PUBLIC_API_BASE_URL`
```

1. **`/`** redirects to **`/login`** (`src/app/page.tsx`).
2. **`src/proxy.ts`** (Next “proxy” convention): redirects unauthenticated users away from `/dashboard` and signed-in users away from `/login` (matcher: `/dashboard/:path*`, `/login`).
3. Login sets **`token`** / **`accessToken`** (and related) cookies via OTP flow (`src/app/(auth)/login/page.tsx`).
4. **Protected UI** (`src/app/(protected)/`) uses **`ProtectedShell`**: nav, theme toggle, logout.
5. **Dashboard** (`src/app/(protected)/dashboard/page.tsx`): MUI tabs for **queue leads** vs **dialed leads** (`is_dialed` query param on upstream); toolbar refresh refetches both lists + last-call card; break/shift actions via RTK mutations.

---

## Redux / RTK Query

| Module | Role |
|--------|------|
| `src/redux/services/api.ts` | Shared `createApi`, `fetchBaseQuery` (`baseUrl: "/"`, cookies, Bearer prefers `accessToken`, skips literal `token=true`). |
| `src/redux/services/authApi.ts` | **Login**, **verify OTP**, **`getPermission`** (lazy hook reserved for future UI gating). Side-effect import in `store.ts` registers endpoints. |
| `src/redux/services/dialerApi.ts` | **Dialed / undialed leads**, dialer **config**, **breaks**, **shifts**, **last-call**. |
| `src/redux/store.ts` | Store + `api` middleware; imports `authApi` and `dialerApi` so injected endpoints register. |

---

## Main UI pieces

| Area | Location |
|------|-----------|
| Login + OTP | `src/app/(auth)/login/page.tsx` |
| Dashboard | `src/app/(protected)/dashboard/page.tsx` |
| Last call card | `src/components/dashboard/call-status-card.tsx` |
| Lead tabs (MUI) | `src/components/dashboard/leads-queue-tabs.tsx`, `tab-panel.tsx` |
| Shared table | `src/components/table/data-table.tsx` |
| Theme (default light) | `src/components/theme-provider.tsx` |

---

## API proxies (selection)

| App route | Typical upstream (via env) |
|-----------|---------------------------|
| `POST /api/auth/login/email` | `{AUTH}/auth/login/email` |
| `POST /api/auth/verify-otp` | `{AUTH}/auth/login/verify-otp` |
| `GET /api/auth/permission` | `{API}/auth/permission` |
| `GET /api/vehicle/leadsquared/leads` | `{API}/leadsquared/leads` (+ query e.g. `is_dialed=true|false`) |
| `GET /api/lead-dialer/*` | `{API}/lead-dialer/*` |

Shared proxy helpers: `src/app/api/_lib/upstream-headers.ts` (URL normalization, cookie/Bearer forwarding, FleetOS-style Origin headers for login).

---

## Folder layout (abbrev.)

```text
src/
├── proxy.ts                    # Auth redirects /dashboard ↔ /login
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # / → /login
│   ├── (auth)/login/
│   ├── (protected)/            # dashboard, shell, logout
│   └── api/
│       ├── auth/               # login, verify-otp, permission
│       ├── vehicle/leadsquared/leads/
│       └── lead-dialer/        # config, breaks, shifts, last-call
├── components/                 # theme, dashboard widgets, data-table
├── lib/                        # auth cookies, RTK error helpers
└── redux/
```

Static assets: **`public/`** (may contain only `.gitkeep` until you add files).

---

## Docker

See **`Dockerfile`**: multi-stage image, `npm ci`, `npm run build`, production `npm run start`. Ensure **`public/`** exists in the repo (e.g. `public/.gitkeep`) so `COPY … /public` succeeds.

Optional: **`.github/workflows/`** for CI/CD (build, push image, deploy).

---

## Adding features

- **New authenticated page:** add under `src/app/(protected)/` and extend **`src/proxy.ts`** `matcher` if the path must be cookie-gated like `/dashboard`.
- **New upstream API:** add `src/app/api/.../route.ts`, then inject endpoints into **`dialerApi`** or **`authApi`** (keep login-only traffic on auth base URL).
- **Permission:** keep **`authApi.getPermission`** / **`useLazyGetPermissionQuery`** and **`src/app/api/auth/permission/route.ts`** aligned with your backend contract.

---

## Further docs (repo)

- **`FRONTEND_API_LOGIN_FLOW.md`** — login/API notes  
- **`LOGIN_CHANGES.md`**, **`DASHBOARD_CHANGES.md`** — historical change logs  

---

## Tech stack

Next.js **16**, React **19**, TypeScript, Tailwind **4**, **Redux Toolkit / RTK Query**, **MUI** (tabs), **js-cookie**, **env-cmd** for env-specific scripts.
