# Uploaded company ID cards and the Driver Digital ID page

## Release

1. In the existing Supabase project, run all of
   `supabase/driver-digital-id-upload.sql`, through its final `commit;`.
2. This requires the existing company-ID and HR portrait-upload setup. It adds
   file metadata and a private bucket; it does not delete employee records,
   previous files, generated cards or passwords.
3. After SQL success, merge the matching GitHub portal release. Confirm the
   Vercel production deployment and the custom portal domain serve the new files.
4. Do not rerun older company-ID patches over this patch: they do not include
   the uploaded-file fields, snapshot output or file permission checks.

## Admin/HR

- Open HR → Driver photos & IDs.
- Save the Driver's profile portrait first, if missing.
- Next to that Driver, choose Upload Digital ID and select the actual company
  ID card as JPEG, PNG, WebP or PDF, up to 10 MB.
- The complete card image/document is retained without portrait-style cropping.
  The filename and declared MIME type must match supported file contents in the
  browser; registration separately validates stored MIME, size and target path.
- Optionally choose a valid-until date. Confirm the upload to save and issue
  this file as the Driver's current Digital ID. This does not approve HR checks.
- Do not put passports, driving licences or other private vetting evidence here:
  the Driver can show this company-ID document to someone requesting it.
- Replace the uploaded Digital ID to issue an updated file. Existing company
  references are retained. Revoke disables its display in the Driver portal.
- Read-only HR can review, but cannot upload, replace, issue or revoke.

## Driver

- Use the separate Digital ID tab in the Driver navigation.
- The page displays the current uploaded card image, or a PDF viewer with an
  Open Digital ID PDF link for phones that cannot embed PDFs.
- The image is displayed in full. Reference and current validity status appear
  outside the uploaded file.
- A profile photo alone does not create an uploaded Digital ID.
- Revoked, expired, missing-file or otherwise suspended IDs do not expose the
  file as usable identification. The Driver must contact Admin/HR.
- Older portal-generated cards remain readable as legacy cards.

## Privacy and verification

The new `driver-company-ids` bucket is private. Only HR managers upload files.
HR readers can review them; an active Driver can read only their current active
company-ID file. Private HR screening evidence remains in its separate bucket.
Signed links last 120 seconds and the open ID page refreshes periodically.
Already issued links can remain usable until expiry; downloaded files and
screenshots cannot be remotely revoked. Use the current portal validity display.

Check with dedicated test accounts: image and PDF upload, own-Driver retrieval,
failed-registration retry without duplicate storage, replacement, revocation,
expiry, another Driver/Client denial, and legacy generated cards. Never use
real employee ID evidence as test fixtures.
