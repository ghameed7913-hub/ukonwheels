# Short booking references

Run all of `supabase/short-booking-references.sql` in the existing portal's
Supabase SQL Editor, then merge the matching portal update.
Expected result: **Success. No rows returned**.

New bookings use **UKOW00001**, **UKOW00002**, … **UKOW99999**.
Existing booking references, links, evidence and documents are not renamed.
All new Admin, Operations and Client bookings use the same database sequence,
including each vehicle saved through manual multiple entry or Excel.

Draft UUIDs remain private retry keys. They do not become the displayed booking
reference. A lost response or page refresh can still recover the original booking
and its short reference, rather than create another vehicle booking.

The sequence is concurrency-safe, never resets on a rerun, and does not wrap.
If 99999 is reached, creation fails explicitly instead of generating a duplicate
or more than five digits. Failed transactions can leave gaps; numbers are unique,
not a gap-free count of vehicles.

This setup depends on the existing Client bulk-booking function. If that function
is replaced by rerunning `client-bulk-booking-patch.sql`, rerun this setup last to
restore retry-key lookup. The customer/registration duplicate protection remains
in force.
