# Reset the portal while keeping one Admin sign-in

**Destructive, manual maintenance only.** Never include the reset SQL in automatic
migrations, startup scripts or a deployment command. A GitHub/Vercel publish is
not required to reset Supabase data.

## Authorized scope

Delete all businesses, Clients, other users and their sign-ins, bookings,
evidence, inspections, operational history, financial records, incidents, photos,
notifications and legacy shared-store records. Keep exactly the Admin account
specified for this reset, including its existing sign-in/password.

The reset also clears invoice and messaging preferences stored in the shared
record. Re-enter any preferences needed after the reset.

The reset is not a backup. Export any records/files that must be retained first.
Database rollback cannot restore files already removed using Storage.

## Before running

1. Run the read-only preflight against the **same Supabase project used by the
   live portal**. Verify the exact retained email is an active Admin.
2. Review the full public table list, storage bucket names/file counts, other
   Auth account count and legacy shared-store sections. Stop if this project
   contains unrelated applications or data.
3. Sign out of the portal and close its open tabs. Pause use of the portal while
   clearing it; do not create new records until verification is complete.
4. In **Supabase → Storage**, remove every file from the portal buckets using
   the dashboard/API. Keep the empty buckets and their private settings:
   - `booking-evidence`
   - `incident-evidence`
   - `profile-documents`

   Use **Empty bucket** if available, or select and delete the files, including
   nested folders and additional pages. Wait until all removals finish. Do not
   delete rows directly from `storage.objects` or `storage.buckets`: SQL removes
   metadata, not the underlying stored files. Do not delete the buckets.

## Run the reset

Open `reset-portal-data.sql` in a **new Supabase SQL Editor query**:

1. Replace `REPLACE_WITH_ADMIN_EMAIL` with the exact Admin sign-in email confirmed
   in the preflight.
2. Replace `NOT_CONFIRMED` with `ERASE_PORTAL_DATA_KEEP_ONE_ADMIN`.
3. Run the **whole file** as the default `postgres` database role.
4. Expect **Success. No rows returned**. If any error appears, stop and share it;
   do not remove guards, disable triggers or add `CASCADE` to force it.

The SQL refuses to run without explicit configuration, a unique active Admin,
the expected portal tables, empty Storage, the main shared record and existing
shared-store access policies. Unexpected tables, buckets or dependencies stop it.
All relational changes run in one transaction. It does not drop tables, delete
the retained Auth row, change its password or reset reference sequences.

The reset replaces all legacy shared data with empty arrays and a reset
generation. The existing portal preserves this marker when saving. A write
guard rejects an old browser snapshot; restrictive shared-store policies also
deny deleted accounts and anonymous access without granting new permissions.

## Verify before using the portal again

Run:

```sql
select
  (select count(*) from auth.users) as sign_in_accounts,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.bookings) as bookings,
  (select count(*) from public.businesses) as businesses,
  (select count(*) from storage.objects) as uploaded_files,
  (select jsonb_array_length(data::jsonb -> 'bookings')
     from public.app_store where id = 'main') as older_bookings,
  (select jsonb_array_length(data::jsonb -> 'staffUsers')
     from public.app_store where id = 'main') as older_staff;
```

Expected: **1 sign-in account, 1 profile, and zero in every other column**.
Confirm **Authentication → Users** contains only the retained Admin email.

Sign in again with the same Admin email and password. Check Users, Businesses,
Bookings and Accounts are empty before adding real records. Signing out through
the portal clears that account's in-progress bulk-booking draft. If an old draft
still appears, discard it or clear this portal's website data on that device;
the cloud reset cannot remotely erase downloaded Excel/PDF files or offline
copies/browser drafts on other devices. Use a fresh private/incognito window for
the initial check if needed.

## Verification of the maintenance script

Run `node --test supabase/tests/reset-portal-data.test.cjs`. It starts its own
temporary PostgreSQL cluster with synthetic users and the actual portal table
definitions, never the development or production database. Tests cover complete
cleanup, Admin preservation, rollback guards, stale-tab protection, deleted
account access and continued access for newly created active Clients.
