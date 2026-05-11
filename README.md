# Autodialer

Next.js (App Router) frontend for login, dashboard leads, and lead-dialer flows (breaks, shifts). It talks to a backend API through **Next.js route handlers** under `src/app/api/**` that proxy requests to `NEXT_PUBLIC_API_BASE_URL`.

---

## Prerequisites

- **Node.js ≥ 20.9** (required by Next.js 16)
- **npm** (or compatible package manager)

---

## First-time setup

1. **Clone the repository** and enter the project directory.

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment variables**

   Create **`.env.local`** in the project root (Next.js loads it automatically for local development). Do not commit secrets you consider sensitive; `.env.local` is normally gitignored.

   | Variable | Required | Purpose |
   |----------|----------|---------|
   | `NEXT_PUBLIC_API_BASE_URL` | **Yes** | Base URL of the upstream API (no trailing slash). Used by all `src/app/api/**` proxy routes to forward auth, leads, dialer config, breaks, and shifts. |

   Example:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com
   PORT=3000
   ```

   Optional:

   | Variable | Purpose |
   |----------|---------|
   | `PORT` | HTTP port for **`next dev`** / **`next start`**. Set this in **`.env.local`** (dev) or **`.env.production`** (prod scripts). Next defaults to **3000** if omitted. |

   **`npm run dev`**, **`npm run local`**, **`npm run prod`**, and **`npm run start:prod`** load those files via `env-cmd` first, so **`PORT` in the same file** is applied—do not rely on `-p` in the npm script.

   Production builds may use **`.env.production`** with the same keys where applicable.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open `http://localhost:<PORT>` (default **3000** if `PORT` is unset). The home route redirects to `/login`.

   **`npm run dev`** and **`npm run local`** load environment variables from **`.env.local`** (via `env-cmd`). Create that file before running; without it, the command may fail.

---

## Scripts

| Command | Env file used | Description |
|---------|----------------|-------------|
| `npm run dev` | **`.env.local`** | Development server; **`PORT`** from `.env.local` (Next default **3000** if unset). |
| `npm run local` | **`.env.local`** | Same as `dev` (alias). |
| `npm run prod` | **`.env.production`** | **`next build`** then **`next start`**; **`PORT`** from `.env.production`. |
| `npm run start:prod` | **`.env.production`** | Production server only; **`PORT`** from `.env.production`. |
| `npm run build` | Shell / CI env | Plain `next build` (no forced file; use for CI when vars are injected another way). |
| `npm run start` | Shell / CI env | Plain `next start`. |
| `npm run lint` | — | ESLint. |

Next.js still merges its own env loading rules in addition to variables injected by `env-cmd`; forcing `-f .env.local` / `-f .env.production` makes the intended file the primary source for those runs.

---

## Project flow (high level)

1. **`/`** → redirects to **`/login`** (`src/app/page.tsx`).
2. User signs in with email/password → OTP verification; tokens and email are stored in **cookies** (`js-cookie` on the client).
3. **`src/middleware.ts`** guards **`/login`** vs **`/dashboard`**: no `token` cookie → redirect to `/login`; with token on `/login` → redirect to `/dashboard`.
4. **Protected UI** (`src/app/(protected)/`) shows the shell (nav, theme toggle, logout) and pages like the dashboard.
5. **Data fetching**: React components use **RTK Query** (`src/redux/services/authApi.ts`) → HTTP calls go to **same-origin** paths like `/api/auth/...`, `/api/vehicle/...`, `/api/lead-dialer/...` → **Route handlers** proxy to `NEXT_PUBLIC_API_BASE_URL` with forwarded cookies/authorization.

```text
Browser → Next.js page (RTK Query) → /api/* route handler → upstream API (NEXT_PUBLIC_API_BASE_URL)
```

---

## Folder structure

```text
autodialer/
├── .env.local                 # Local env (create yourself; not committed by default)
├── .env.production          # Production env example / deployment
├── package.json
├── README.md
├── FRONTEND_API_LOGIN_FLOW.md   # Extra docs: login/API flow
├── LOGIN_CHANGES.md             # Auth/login change notes (if present)
├── src/
│   ├── middleware.ts          # Auth redirects for /login and /dashboard
│   ├── app/
│   │   ├── layout.tsx         # Root layout: fonts, Redux + Theme providers
│   │   ├── globals.css        # Global styles (Tailwind)
│   │   ├── page.tsx           # "/" → redirect /login
│   │   ├── (auth)/            # Route group: unauthenticated pages (URL has no "(auth)" segment)
│   │   │   ├── layout.tsx     # Passthrough layout for auth routes
│   │   │   └── login/
│   │   │       └── page.tsx   # Login + OTP UI
│   │   ├── (protected)/       # Route group: logged-in area
│   │   │   ├── layout.tsx     # Wraps children with ProtectedShell (nav, theme)
│   │   │   ├── protected-shell.tsx
│   │   │   ├── logout-button.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx   # Dashboard (leads table, breaks, shift)
│   │   └── api/               # Next.js Route Handlers (server-side proxies)
│   │       ├── auth/          # login, verify-otp, permission
│   │       ├── vehicle/       # e.g. LeadSquared leads
│   │       └── lead-dialer/   # config, breaks, shifts
│   ├── components/
│   │   ├── theme-provider.tsx # Dark/light theme + localStorage
│   │   ├── theme-toggle.tsx
│   │   └── table/
│   │       └── data-table.tsx # Reusable table for leads
│   └── redux/
│       ├── provider.tsx       # Redux Provider for client components
│       ├── store.ts           # RTK store + api middleware
│       └── services/
│           ├── api.ts         # createApi + fetchBaseQuery (baseUrl "/", credentials)
│           └── authApi.ts     # Endpoints: auth, leads, dialer, breaks, shifts
```

---

## Adding new pages

### Page under **login / public** (no shell)

- Add a folder under **`src/app/(auth)/`**, e.g. `src/app/(auth)/register/page.tsx` → URL **`/register`**.
- If the route must be reachable **without** a token, extend **`src/middleware.ts`**:
  - Treat that path like `/login` in `isAuthPage`, or add it to the matcher so unauthenticated users are not redirected away incorrectly.

### Page under **dashboard / authenticated** (with top nav)

- Add under **`src/app/(protected)/`**, e.g. `src/app/(protected)/settings/page.tsx` → URL **`/settings`**.
- **`middleware.ts`** currently matches **`/dashboard/:path*`** and **`/login`**. For other protected URLs you should **expand `matcher`** (and redirect logic if needed) so unauthenticated users hitting `/settings` are sent to `/login`.

### New API integration

1. Add a **route handler** under **`src/app/api/.../route.ts`** that proxies to `NEXT_PUBLIC_API_BASE_URL` (follow existing auth/vehicle/lead-dialer patterns).
2. Register endpoints in **`src/redux/services/authApi.ts`** (or a new slice injected into **`src/redux/services/api.ts`**).
3. Use generated hooks from **`authApi`** in your client page.

### Shared UI

- Put reusable pieces in **`src/components/`**.
- Use **`src/components/table/data-table.tsx`** for tabular data when it fits.

---

## Key files (purpose)

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Cookie-based gate between `/login` and `/dashboard`. |
| `src/app/layout.tsx` | HTML shell, fonts, `ReduxProvider`, `ThemeProvider`. |
| `src/app/page.tsx` | Root `/` redirect to `/login`. |
| `src/app/(protected)/layout.tsx` | Wraps protected routes with `ProtectedShell`. |
| `src/app/(protected)/protected-shell.tsx` | Header, nav, theme toggle, logout. |
| `src/app/(protected)/dashboard/page.tsx` | Main dashboard: leads, breaks, shifts, session UI state. |
| `src/app/(auth)/login/page.tsx` | Email/password + OTP login. |
| `src/redux/services/api.ts` | RTK Query `createApi`, `fetchBaseQuery`, cookie header prep. |
| `src/redux/services/authApi.ts` | All API endpoint definitions consumed by the UI. |
| `src/app/api/**/route.ts` | Server proxies to upstream API; env: `NEXT_PUBLIC_API_BASE_URL`. |

---

## Additional documentation

- **`FRONTEND_API_LOGIN_FLOW.md`** — Login and API integration details (if present in the repo).

---

## Deploy notes

- Prefer **`npm run prod`** locally or in scripts when you want **`.env.production`** values during both **build** and **start**, or set **`NEXT_PUBLIC_*`** in the hosting dashboard and use **`npm run build`** / **`npm run start`** there.
