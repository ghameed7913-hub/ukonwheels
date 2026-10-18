# Visible HR photo and identity-document uploads

## Setup and release

1. In the existing Supabase project, run the complete
   `supabase/hr-driver-photo-upload.sql`.
2. The earlier HR screening and Driver company ID setup must already be installed.
   This patch adds a restricted HR portrait writer; it does not delete records,
   change passwords, approve vetting, or change Driver sign-in requirements.
3. After success, merge the matching portal release and confirm the production
   site serves the updated files.
4. If installing everything from scratch, run `hr-screening-patch.sql`, then the
   existing Driver document-access setup, then `driver-company-id.sql`, and
   finally `hr-driver-photo-upload.sql`. Do not replace the new portrait
   permission function with the older company ID patch afterward.

## Upload a Driver's profile photo as Admin/HR

- Open **HR → Driver photos & IDs**. Employee Registration also has a
  **Driver photos & company IDs** shortcut.
- The list contains existing portal users assigned the Driver role. Creating
  an HR employee record alone does not create a Driver login.
- Choose **Upload profile photo** next to the correct Driver, select a JPEG,
  PNG or WebP image (up to 10 MB), and confirm the upload.
- The portrait is resized and saved privately to that Driver's account, and
  is available in the Driver Profile on its next refresh.
- Replacing an existing photo invalidates an issued ID. The confirmation
  explains this; HR must reissue the card after reviewing the new photo.
- Read-only HR staff cannot upload photos, issue IDs or revoke IDs.
- The Driver can still upload their own portrait from Driver Profile.

## Upload private ID documents

- Open **HR → Employee Registration** and register or open an employee.
- Use the prominent **ID documents** button to go straight to the uploader.
- For a new record, complete the required personal details, then use
  **Save draft to enable uploads**. Saving keeps the record separate from
  portal login creation.
- A previously approved/rejected record must explicitly be reopened as Draft;
  the confirmation explains that HR must review it again.
- Choose the document, select its category and use **Upload document**.
  PNG, JPEG, WebP and PDF files up to 10 MB are supported.
- Uploaded evidence remains private to authorised HR staff. It does not
  automatically mark identity or any other screening check as passed.

## Verification

- Test both upload buttons with a dedicated employee/Driver account.
- Confirm portraits remain visible after navigation/refresh and in Driver
  Profile, and that a changed portrait makes an issued card invalid.
- Confirm document metadata and private evidence remain linked to the correct
  saved employee. Confirm read-only HR and unrelated users cannot upload.
- On a failed upload, the selected file must remain available for retry.
