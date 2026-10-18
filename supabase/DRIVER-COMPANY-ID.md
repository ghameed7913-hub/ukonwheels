# Compulsory Driver portrait and digital company ID

## Release order

1. In the **existing** Supabase project, open SQL Editor → New query.
2. Run all of `supabase/driver-company-id.sql`, from `begin;` to `commit;`.
   It requires the HR screening and Driver document-access setup already used
   by this portal. No records or files are deleted, and no passwords are changed.
3. After “Success. No rows returned”, merge the matching GitHub portal release.
   The new SQL immediately requires a portrait for Driver job actions, so deploy
   the matching upload screen promptly. Do not rerun older document-access setup
   files over this update; they do not include the required-photo check.
4. Confirm the custom portal domain serves the new files. Replit Publish is a
   separate route and does not release this Vercel-hosted portal.

## Driver

- The Driver signs in as normal, subject to the existing HR document-expiry lock.
- Without a saved portrait, the Driver sees Profile and the compulsory upload
  instead of job screens. The server also rejects job actions without a portrait.
- Upload a JPEG, PNG or WebP image, up to 10 MB. The portal crops it to a square,
  resizes it to at most 800 pixels and stores a normalized JPEG privately.
- The photo is displayed on the profile. It remains saved across sign-out,
  reload and devices; it is not saved in the shared operations JSON or browser.
- Profile → Show company ID displays the card once Admin/HR issues it.
  A saved portrait does not issue an ID or approve any HR screening checks.
- Replacing a portrait invalidates an issued card. HR must review and reissue
  it. The Driver sees a confirmation before replacing an active card's photo.

## Admin and HR

- Open HR → Driver Company IDs.
- Staff need existing private HR read permission to view the directory and
  private HR management permission to issue/revoke; Admin already has access.
- Review the Driver's name and portrait, then issue the card. A portrait is
  compulsory. Optionally choose a valid-until date.
- The server assigns a unique `UKOW-ID-…` reference and records the issuer/date.
  Reissues keep the Driver's reference. Drivers cannot create or edit card data.
- Revoke a card with a reason when it must no longer be used.
- A revoked/expired card, an inactive account or expired critical HR documents
  must not appear as an active company ID. The Driver view periodically checks
  server state while it is on screen and when returning to the app.

## Privacy and limitations

Portraits use the existing Supabase storage in a private `driver-portraits`
bucket. Drivers can upload and read only their own portraits. HR can read
portraits using the established private HR permissions. Drivers cannot overwrite
or delete stored image objects; replacement uploads use new paths.
Short-lived signed photo links last 120 seconds. A screenshot of an old card
cannot be remotely revoked: show the current portal view, not a screenshot.
There is no public verification link, physical-card print service or background
identity verification in this update.

## Checks after live setup

Use a dedicated test Driver:

1. No portrait → Driver can reach upload, but cannot start job actions.
2. Upload → profile photo displays; refresh and sign in again to confirm it stays.
3. Driver cannot issue/revoke IDs or see another Driver's photo/card.
4. HR issues → Driver's Show company ID displays the photo, name and reference.
5. HR revokes → Driver's refreshed ID is clearly not valid.
6. Driver replaces portrait → old ID is invalid until HR reissues.
7. Invalid image/failed network → explicit error, no false success; retry works.
8. Expired licence/passport/visa still blocks access, and Admin/HR still work.
