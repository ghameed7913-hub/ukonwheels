# Driver pickup checklist

This additive update keeps all existing bookings, inspections and uploaded photos.
It uses the existing private `booking-evidence` bucket and booking access rules;
it does not move files or make the bucket public.

## Install before merging the portal update

1. Open the **same Supabase project used by portal.ukonwheels.org**.
2. Open **SQL Editor → New query**.
3. Paste the **entire** contents of `supabase/pickup-checklist.sql`.
4. Press **Run**. Expected result: **Success. No rows returned**.
5. Merge the corresponding GitHub update after the Vercel check passes.
6. Refresh the portal.

Do these steps together when no Driver is submitting a pickup. The SQL blocks
the older Driver pickup/status flow until the updated portal is merged and
refreshed. Existing photos, saved jobs and completed pickups are not removed.

No new secrets, buckets, dependencies or environment variables are needed.
The existing production architecture, workflow inspection setup, and Driver
document-access setup remain in use.

## Behaviour

- Drivers take 11 required vehicle views plus the existing Keys photo using
  the existing live camera, timestamp and GPS flow.
- Explicit Yes/No answers are required for Electric vehicle, Spare tyre,
  Log book, Service history, and Damage present.
- An electric vehicle also requires Charging cable Yes/No: Yes needs a
  photo; No needs a reason. Non-electric vehicles do not need cable evidence.
- Spare tyre, Log book, Service history: Yes needs a photo; No does not.
- Damage Yes needs comments and at least one photo. Drivers can add more
  damage-photo slots without a fixed count.
- **Save pickup evidence** validates the photos and checklist, then saves
  the inspection without changing the booking status.
- **Picked Up** requires the same previously saved checklist. Editing an
  answer requires another save. The server rechecks the current assignment,
  booking status, persisted photo records and private storage objects.
- Only an active assigned Driver may save or complete the checklist. The
  existing document-expiry check still applies to Data API requests.
- A failed save/completion does not advance the status. A photo already
  uploaded stays saved. No automatic clearing/deletion is performed.
- Admin and the correct Client can open booking evidence to see the saved
  answers, comments and all photos, including after delivery. Existing
  booking-based row-level security remains unchanged.

## After setup

Use a designated test booking/Driver, not a customer's live collection:
confirm that a missing wheel photo, missing conditional document photo, or
missing cable reason blocks Save. Complete all evidence, Save, then Picked Up.
Open the same booking as Admin and its linked Client to confirm the answers
and pictures. An unrelated Client must not see the booking.

If the Driver sees a missing `save_pickup_checklist` function error, confirm
the whole SQL file ran successfully in the correct project and refresh.

The SQL is repeatable. Historical inspections without a checklist still open
with their original notes/photos. Existing in-progress pickup photos are kept;
newly required views must be captured if they were not previously recorded.
