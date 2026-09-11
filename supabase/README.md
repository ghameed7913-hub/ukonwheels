# UK On Wheels Supabase setup

## What to run

Open the Supabase SQL Editor, create a new query, and paste the full contents of:

`supabase/ukow_production_architecture.sql`

Run it once.

The migration is additive. It does not delete or modify the existing `app_store` data.

## Then enable public registration

In Supabase:

1. Open **Authentication → Providers → Email**.
2. Enable the Email provider.
3. Enable **Allow new users to sign up**.
4. Decide whether users must confirm their email before entering the portal.
5. Keep `booking-evidence` and `profile-documents` storage buckets private.

## Account rules

- Every public signup starts as `client`.
- A client cannot promote themselves.
- Admin promotes an existing user through `admin_set_user_role`.
- Admin can create accounts through Supabase Auth and then assign their role.
- Staff permissions live in `user_permissions`.
- Drivers only receive bookings where `driver_id` matches their account.
- Business clients only receive bookings belonging to their business membership.

## Client attributes

Private and business clients share:

- Full name
- Email
- Mobile number
- Account type
- Status

Business clients also use:

- Legal and trading name
- Company registration and VAT numbers
- Business type
- Contact details
- Registered/trading address
- Accounts contact details
- Invoice cycle
- Tariff type, per-mile rate and minimum charge

Invoice and tariff fields should be controlled by Admin.

## Important

Do not remove `app_store` after running this migration. The current portal still uses it. Once the SQL succeeds, the frontend can be migrated module-by-module to the secure tables with `app_store` retained as a rollback source.