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

- Every public signup starts immediately as an active `client`.
- Admin approval is not required. Email confirmation depends on the Supabase Email provider setting.
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

## Driver incident reports

After the base production architecture is installed, open a new SQL Editor query
and run the full contents of `supabase/incident_reports_patch.sql`.

This creates dedicated report and photo-metadata tables, secure save/submit
functions and the **private** `incident-evidence` bucket. It does not delete
bookings, evidence, users or `app_store` records.

- Only active Drivers can create their own reports and add photos to drafts.
- Drivers can reopen their own reports; Admin can review all reports.
- Clients and ordinary Staff cannot access incident reports or licence/insurance
  images. These are separate from Client-visible collection/delivery evidence.
- Submitted reports and registered photos cannot be edited or deleted through
  the portal. Save a draft to continue entering details later.
- Images support JPEG, PNG and WebP, up to 10 MB each, with no small fixed
  photo-count limit. File bytes stay in Storage, not JSON or browser storage.
- Viewing links expire; **Refresh viewing links** issues new authorized links
  without replacing or deleting the stored images.

In the Driver portal, open **Incidents**, or **Full incident report** on a job.
Admin reviews reports through **Incident Reports**. Apply this SQL before
releasing the updated frontend; missing setup produces an explicit error rather
than a false save confirmation.

### Permanent report references and PDF downloads

Every saved incident report has a permanent reference beginning `UKOW-INC-`,
followed by its complete database UUID without hyphens. Existing reports receive
the same deterministic reference without a database migration; it does not change
when a draft is edited, submitted or reopened.

- **Admin → Incident Reports** and **Driver → Incidents → My reports** can search
  by reference, original report ID, registration or Driver name.
- Open a report and choose **Download PDF** to save the details and every stored
  photo to the device. Saved drafts are clearly marked **DRAFT / NOT SUBMITTED**.
  Unsaved edits/photos must be saved first; the PDF reads the persisted report.
- PDFs include scene, licence and insurance evidence and are private. Downloads
  use the existing authenticated owner/Admin access controls, renew photo links
  and stop if any photo is unavailable rather than produce an incomplete file.
- A PDF is a downloaded snapshot, not another public upload. Keep downloaded
  copies secure. Download again to obtain a later saved version.
- History and photo reads are paginated, not limited to the API's first page.
  No additional SQL patch is required for references or PDF downloads.

## Important

Do not remove `app_store` after running this migration. The current portal still uses it. Once the SQL succeeds, the frontend can be migrated module-by-module to the secure tables with `app_store` retained as a rollback source.