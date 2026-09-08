# UK On Wheels Portal

A full operations portal for UK vehicle collection and delivery workflows, covering bookings, dispatch, customers, drivers, finance, reporting, HR and communications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/uk-on-wheels run dev` — run the web portal
- `pnpm run typecheck` — check the entire workspace
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API clients after editing OpenAPI
- `pnpm --filter @workspace/db run push` — apply development database schema changes
- Required env: `DATABASE_URL`

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Wouter and TanStack Query
- Backend: Express, TypeScript, Zod validation and an OpenAPI-generated contract
- Database: PostgreSQL with Drizzle ORM

## Where things live

- `artifacts/uk-on-wheels/` — responsive portal frontend
- `artifacts/api-server/` — shared REST API
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/` — PostgreSQL schema
- `lib/api-client-react/` — generated frontend API hooks
- `lib/api-zod/` — generated server validators

## Architecture decisions

- The former single-file HTML application is separated into independently maintainable frontend, API, contract and database packages.
- API contracts are authored in OpenAPI first, then generated into typed React Query hooks and Zod validators.
- Operational data is persisted in PostgreSQL rather than browser storage.
- Parent navigation groups and child links use separate visual treatments so the sidebar hierarchy remains clear.

## Product

- Live dashboard summaries and recent operational activity
- Searchable and filterable bookings
- Booking creation, detail, assignment and status updates
- Structured surfaces for businesses, drivers, accounts, reports, HR, communications and settings
- Responsive desktop and mobile navigation