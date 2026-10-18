# Client Excel bulk booking: release instructions

Run the setup **before merging the Excel bulk-booking update**. The existing
Admin booking function is unchanged; this patch enables saving Excel bookings
from Client accounts.

## 1. Run the Client setup patch

1. Open the Supabase project already used by the UK On Wheels portal.
2. Open **SQL Editor** and create a **new query**.
3. Open [`client-bulk-booking-patch.sql`](./client-bulk-booking-patch.sql).
4. Copy the **entire file**, including `begin;` and `commit;`, into the new query.
5. Click **Run**. The expected result is **Success. No rows returned**.

The patch is additive and can be run again. It does not delete existing
bookings, users or photos. It requires the portal's existing production schema
and booking workflow patches. Do not rerun the entire base schema as a substitute.

If an error appears, keep the GitHub update unmerged and share the complete error
text or a screenshot. Do not treat an error as a successful setup.

### What the patch permits

- Active Clients can create bookings only for their own account.
- Business Clients must belong to the selected active business.
- Clients cannot set customer charges or gain Admin access.
- Every imported vehicle is saved as a separate **New Booked Vehicle**.
- Retrying a save uses the same reference rather than creating another booking.

The patch does not create a booking when it runs.

## 2. Merge the GitHub update

After the SQL setup succeeds:

1. Open the Excel bulk-booking pull request on GitHub.
2. Open **Conversation**, scroll below the checks and click **Merge pull request**.
3. Click **Confirm merge**.
4. Wait for the connected Vercel production deployment to complete.
5. Refresh `https://portal.ukonwheels.org` and sign in normally.

Creating this pull request does not itself update the live portal.

## 3. Use Excel bulk booking

1. Open **Create Booking** and choose **Bulk vehicles (Excel)**.
2. Click **Download Excel template**.
3. Read the workbook's **Instructions** sheet. Fill the **Bookings** sheet with
   one vehicle per row, retaining the template headings. The template includes
   all single-booking fields.
4. Keep telephone numbers as text so leading zeroes are not lost. Use the saved
   business name or ID when filling an Admin workbook. Client workbooks use the
   signed-in Client's account; Clients should leave customer identity and charge
   columns blank, as explained in their template.
5. Save as `.xlsx` and upload it. Each file supports up to **100 vehicles** and
   **5 MB**.
6. Review every vehicle. Open **Full details** to inspect or correct its fields.
   Fix highlighted errors before saving. Uploading alone creates no bookings.
7. Click **Create all vehicle bookings**. Each saved vehicle shows its own
   booking reference and appears under **New Booked Vehicle**; Clients can also
   find their saved vehicles in their Bookings list.

Vehicles save individually. If part of a batch fails, retain the current batch,
correct the failed rows and retry. Already saved rows stay locked and are not
resubmitted. Do not start a new batch or re-upload the same file to retry an
uncertain save; resolve its existing reference first.

## Verification status

The update passed automated tests, its production build and isolated browser
checks for real Excel download/upload, validation, partial-save retries and
Client account restrictions. Browser booking requests used a synthetic backend.
The SQL patch has **not** been executed against the live Supabase project by
Replit Agent. Confirm a real Client booking and its visibility to Admin after
setup and deployment.
