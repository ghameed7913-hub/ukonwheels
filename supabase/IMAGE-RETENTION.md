# Automatic image-only retention

## Confirmed scope

- Registered pickup/delivery photos: eligible **90 days after `delivered_at`**, only while the booking remains Delivered.
- HR JPG/PNG/WebP uploads and linked Driver portraits / company-ID images: eligible **five calendar years after the leaving date recorded in Settings**.
- Keep all financial records, bookings, accounts, HR record fields, PDFs, signatures and GPS. No new route history is collected.
- HR categories Employment and Other, financial-looking image names and booking signature/receipt labels are conservatively excluded. Unregistered/orphaned files and legacy embedded images are not automatically purged by this worker.
- A hold excludes the relevant owner’s images. Set a hold before the cutoff when a claim or legal requirement applies. Choosing a leaving date does not deactivate an account.

The periods above are the company’s instructions, not a claim that ICO registration mandates them.

## Installation — no existing images deleted

1. Review and run **all of `supabase/image-retention.sql`** in the existing portal's Supabase SQL editor. It installs disabled and is safe to run again without resetting the enable switch.
2. Release the portal code to its existing GitHub/Vercel target. The new section is **Admin → Settings → Automatic image cleanup**. It is not part of the Driver native binary.
3. Configure the following **server-only Vercel production environment variables** using Vercel’s secure settings, never chat, source code, a browser-side config, or a `VITE_` / `EXPO_PUBLIC_` variable:
   - `UKOW_SUPABASE_URL`: the existing portal Supabase project URL.
   - `UKOW_SUPABASE_SERVICE_ROLE_KEY`: that project’s server-side service-role key.
   - `CRON_SECRET`: a randomly generated secret of at least 32 characters.
   Do not reuse a login password. Do not send the secret values to the agent.
4. Redeploy after configuring the variables. Vercel cron calls `/api/image-retention` daily at **03:15 UTC**, with the cron secret as its Bearer authorization. Confirm this job is registered in the Vercel deployment’s Cron Jobs screen. It is not installed by a Replit preview or by running SQL alone.
5. While disabled, confirm the worker check appears in Admin Settings. A missing configuration gives a non-success response and never falls back to browser credentials.
6. In Settings record the exact leaving date for each leaver; clear it if the person returns. Employees must have an HR registration record. Link the portal user in HR to include Driver portrait/ID images; unlinked portraits are not guessed by name.
7. Set appropriate holds. Click **Preview eligible images**, review the counts and references, then **Enable permanent image deletion** within ten minutes. This is the destructive activation step and includes already-overdue images.

No live database or storage changes were made while developing these files. Installing the SQL does not enable deletion.

## Behaviour and limits

- Uses the supported Supabase Storage API to remove bytes, **not a SQL delete of `storage.objects`**. After Storage confirms removal, deletes the matching image metadata only.
- MIME allowlist requires Storage metadata; unknown types are skipped.
- Admin-only settings/preview and service-role-only worker RPCs. Private queue/rules/audit tables have no public/Client/Driver access.
- Two-minute leases prevent concurrent claims and eligibility changes while requests are in progress. Storage files cannot be replaced during a lease. Metadata acknowledgements cannot succeed while the file still exists.
- Failed Storage requests retain metadata, record an error and can retry on a later run. A timeout after Storage deletion is recoverable from the persisted claim, even though the object is no longer in the candidate view.
- Daily run is bounded to 200 images or 45 seconds. A backlog continues on subsequent runs, so cleanup is **eligible after** the period, not guaranteed at its exact expiration second. Monitor the due count; increase the authorised worker frequency/capacity if needed.
- Parent record values, invoices and payment totals are unchanged. Deleting a photo also removes its evidence/document listing, so future inspection re-validation cannot rely on that expired photo.
- Backups, exported files, device photo libraries, downloaded/shared copies and external caches are outside this worker. Review the actual Supabase backup policy and restore procedures. A restore must reapply the retention rules before reopening access.
- `last_error` stays flagged after a failure so it is not hidden by another successful image in the batch; inspect logs and verify resolution. Operational logs must not contain keys, image contents, signed URLs or private paths.

## Verification

```sh
bash scripts/test-image-retention.sh
node --test tests/image-retention-worker.test.cjs
```

SQL tests use a fresh temporary PostgreSQL cluster, not production. HTTP worker tests use a mock Storage API and do not delete real uploads.

The privacy policy remains a draft: these image-only periods do not establish retention rules for financial, non-image HR, GPS or backup data.
