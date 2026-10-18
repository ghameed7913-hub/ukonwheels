# Separate HR employee registration and manual screening

This update does not reset data or change portal sign-ins.

## Release

1. In the existing Supabase project, SQL Editor → New query, run the entire
   `supabase/hr-screening-patch.sql`, including `begin;` and `commit;`.
2. Expect **Success. No rows returned**. Stop and keep the error if it fails.
3. Release the matching GitHub update to Vercel.
4. Open HR → Employee Registration.

## Workflow

- Create User remains the simple portal-account form. Assign roles separately.
- HR registration creates an employee record, not an authentication account.
  An existing internal portal user may optionally be linked.
- Save the employee as a draft, then upload private evidence documents.
- Record identity, right-to-work, address history, employment history/gaps,
  references, DVLA, qualifications and DBS checks where applicable.
- Checks start Pending. A document upload is not verification. A reviewer must
  record the result and notes; the server stamps reviewer identity and time.
- Explain non-applicable checks. Required checks must pass before final approval.
  Approvals and rejections require final review notes.
- Changing documents requires a draft record. Reopen an approved/rejected record
  by saving it as Draft, then review it again.
- Employee references are unique and searchable. Server version checks prevent
  one reviewer's stale form overwriting another's work.
- Records survive sign-out and refresh. No private HR data is put in the shared
  `app_store` or browser localStorage by this feature.

## Privacy and limits

Only active Admin/authorized HR Staff can access these records. HR-view Staff
can read; HR-manage Staff can edit. Clients, Drivers and other Staff cannot read
the HR tables or private document bucket. Documents use the existing Supabase
storage service in a new **private** `hr-screening` bucket. PNG, JPEG, WebP and PDF
up to 10 MB are accepted. Only paths and metadata go into the database. Signed
download links expire after two minutes. There is no public document URL.

This records manual checks; it does not run external DBS/DVLA/Home Office checks,
certify a screening standard or decide legal suitability. Limit DBS information
to what your organisation is entitled to process and retain. Do not upload
unnecessary sensitive information. Existing legacy HR data is not deleted or
automatically copied. Existing holidays/payslips still use portal users.
