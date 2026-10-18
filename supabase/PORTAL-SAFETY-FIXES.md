# Portal safety upgrade

This is **not another reset**. It does not delete accounts, bookings, evidence,
businesses or stored files. Do not run the reset script again.

## Release order

1. Open the same Supabase project used by the live portal.
2. Open **SQL Editor → New query**.
3. Paste the entire contents of `supabase/portal-safety-fixes.sql`.
4. Run it once. The expected result is **Success. No rows returned**.
5. Release the matching portal code through the existing GitHub → Vercel route.
6. Close old portal tabs and sign in again.

The SQL and portal code must be released together. The SQL closes direct access
to the operations-wide shared record for Client and Driver accounts. Old portal
versions cannot sign those roles in until the matching code is deployed; this is
intentional rather than exposing the record as a fallback. Admin access remains
available. The SQL is transactional and safe to run again.

## Changes

- Client/Driver snapshots are produced by an authenticated server function.
  Clients receive only invoices whose **every** vehicle belongs to them, and
  public invoice company details. Drivers receive only their own staff record,
  payslips and holidays. Normalized booking/evidence access keeps its existing RLS.
- Client/Driver snapshots refresh every 30 seconds; normalized booking updates
  still use realtime. They never write the full shared operations snapshot.
- Driver holiday submissions use a narrowly authorized function which derives
  identity and Pending status on the server.
- Admin user edits update the email sign-in identity, profile, role, permissions
  and saved staff details in one transaction. Passwords and verification state
  are preserved. Changing an email changes that user's sign-in address immediately.
  A Driver with active jobs cannot be changed to Staff until those jobs are reassigned.
- Invoice settlement requires the full invoice amount and commits the invoice,
  booking payment statuses and payment transaction together. Retrying a completed
  payment does not create duplicate transactions. Partial-payment accounting is
  not introduced by this upgrade.
- Single Client and Excel bookings use the same rich booking contract, retaining
  booking date, estimated miles, requested delivery date, drop-off deadline and notes.

## Verification

Automated database tests run in a new disposable, local PostgreSQL cluster with
synthetic accounts. They never connect to the live Supabase database.

```sh
node --test artifacts/uk-on-wheels/tests/*.test.cjs
node --test supabase/tests/reset-portal-data.test.cjs
pnpm --filter @workspace/uk-on-wheels run build
```

After release, verify using authorized real accounts: Admin edits survive a fresh
sign-in; a Client sees only their jobs/invoices; a Driver sees their own jobs and
can request holiday; an underpayment cannot settle an invoice; a Client booking's
date, miles and deadline survive reload. No automated live accounts or bookings
are created as part of this upgrade.
