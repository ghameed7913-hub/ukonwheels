# HR-managed Driver photos and Digital ID expiry

Run all of `driver-photo-access-and-id-expiry.sql` in the existing Supabase
project after the earlier Digital ID upload setup, then merge the matching
portal update. The last SQL line must be `commit;`. Do not rerun earlier photo
or company-ID patches over this one: they can restore outdated permissions.

This patch deletes no data or uploaded files and changes no passwords.

## Driver photos

The Driver Profile page displays the saved picture, without upload, replace
or delete controls. Missing photos direct the Driver to Admin/HR; the compulsory
photo requirement stays in place.

Admin/HR managers retain portrait upload/replacement under HR → Driver photos
& company IDs. Read-only HR cannot change photos.

Server-side storage guards deny Driver photo insertion, overwrite and deletion,
including when older broad storage policies exist. The former self-service
photo registration RPC is disabled, so cached clients cannot bypass the UI.
Drivers keep read access to their own portraits.

## Digital ID expiry

Under HR → Driver photos & company IDs, choose Set ID expiry or Edit ID expiry
next to an existing card. The current date is prefilled. Save a new date without
reuploading the card; its reference, original file and issue details are retained.

A blank value means no expiry; removing an existing date requires confirmation.
A past date requires confirmation and makes the ID expired immediately. The
current date stays valid through that date in Europe/London. This changes portal
validity, not dates printed on uploaded card images/PDFs.

Expired IDs do not offer a usable file to the Driver. Extending/removing expiry
can restore an otherwise eligible expired ID, but never unrevoke a revoked ID,
reactivate an inactive account, or override missing portraits or expired critical
HR documents. Driver views refetch periodically and on window focus.

Edits require HR management permission and the current version; stale edits are
rejected. Retrying a successfully saved date is idempotent. Drivers, Clients and
read-only HR cannot change expiry. Existing licence/passport/visa login expiry
restrictions remain unchanged.
