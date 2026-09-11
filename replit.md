# UK On Wheels Portal

A full operations portal for UK vehicle collection and delivery workflows, covering bookings, dispatch, customers, drivers, finance, reporting, HR and communications.

## Run & Operate

- `pnpm --filter @workspace/uk-on-wheels run dev` — run the web portal
- `pnpm --filter @workspace/uk-on-wheels run build` — build the production portal
- Vercel deploys the static portal and serves it through `portal.ukonwheels.org`

## Stack

- Frontend: connected single-page HTML portal built with Vite
- Authentication: Supabase Auth with persistent browser sessions
- Backend: Supabase tables, realtime updates and row-level security
- Operational store: the existing `app_store` JSON document and `profiles` table

## Where things live

- `artifacts/uk-on-wheels/index.html` — production portal UI, Supabase integration and module behavior
- `artifacts/uk-on-wheels/vite.config.ts` — local and production build configuration
- `vercel.json` — static custom-domain deployment configuration

## Architecture decisions

- Preserve the existing Supabase backend, authentication, profiles, permissions and `app_store` data model. Do not replace or migrate them without explicit approval.
- The portal loads protected operational data only after Supabase authentication so row-level security remains effective.
- Refresh restores the Supabase session; logout must call Supabase sign-out rather than reload the page.
- Parent navigation groups and child links use separate visual treatments so the sidebar hierarchy remains clear.
- On desktop, the sidebar and main workspace scroll independently.

## Visual guardrails

- Preserve the established navy and red brand palette; use brand red rather than green/teal for primary actions and active navigation.
- Parent sidebar items must remain unboxed, using spacing, icons and text color for hierarchy. Nested links may use a subtle active treatment.
- Keep typography restrained and lightweight. Reserve heavier weights for page titles and critical values rather than applying bold text throughout.
- Prefer crisp, subtle surfaces and compact radii over oversized rounded cards or old-style admin-panel decoration.

## Product

- Live dashboard summaries and recent operational activity
- Searchable and filterable bookings
- Booking creation, detail, assignment and status updates
- Structured surfaces for businesses, drivers, accounts, reports, HR, communications and settings
- Responsive desktop and mobile navigation