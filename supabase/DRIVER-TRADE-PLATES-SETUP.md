# Driver trade plates

This setup adds new trade plate records. It does not delete or change existing
users, bookings, employee documents, portraits or company IDs.

## 1. Set up Supabase

1. Open the same Supabase project used by `portal.ukonwheels.org`.
2. Open **SQL Editor → New query**.
3. Copy the **whole** `supabase/driver-trade-plates.sql` file, from the first
   comment through the final `commit;`.
4. Paste it into the empty query and press **Run**.
5. The expected result is **Success. No rows returned**.

If an error appears, keep the full error text. Do not run only the last line or
remove permission checks. The existing HR screening setup must already be installed.
This file can be run again without deleting assignments.

## 2. Update the portal

After the SQL succeeds, merge the trade plate GitHub update. Wait for the Vercel
deployment to finish, then refresh the portal.

Admin/HR: **HR → Trade plates**

- Choose an active Driver from the saved Driver accounts.
- Enter the trade plate number and expiry date, then **Save assignment**.
- Use **Edit** to change a current assignment or **Remove** to unassign it.
- Replacing an assignment or removing one asks for confirmation.
- A plate can only be assigned to one Driver, and each Driver has one current plate.
- Spaces and hyphens in plate numbers are removed when saving.
- If another Admin/HR user changes an assignment while it is open, refresh and
  review the latest assignment before saving.

Driver portal: **Assigned trade plate**

- The Driver sees only their own plate number, Driver name and expiry date.
- There are no editing or removal controls.
- The page refreshes every minute while open and when it regains focus.
- An expired plate is marked **Expired**. Trade plate expiry does not block
  login; driving licence/passport/visa access rules remain unchanged.
- Removing the assignment causes the Driver view to show that no plate is assigned.

## 3. Native Driver app

The web Driver portal gains the tab after the portal update. The native Driver
app source also includes an **Assigned trade plate** home shortcut.
An already-installed native app needs an updated app build to receive that new
shortcut. Merging the portal update does not install a new app on Drivers' phones.

## Permissions and storage

Assignments are stored separately from the shared portal JSON and HR document
files. The database permits writes only from active Admin/HR managers using the
existing HR management permission. Drivers can read their own assignment only;
Clients and ordinary Operations accounts cannot manage trade plates.
