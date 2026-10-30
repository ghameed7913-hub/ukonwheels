# Client booking deletion

Run all of `client-booking-deletion.sql` in the existing portal's Supabase SQL
Editor, then release the matching portal update through GitHub → Vercel.
“Success. No rows returned” is the expected setup result.

Clients get **Delete booking** in Bookings / Tracking and booking details. They
must confirm before the server changes anything. Their own private bookings and
bookings belonging to an active business membership are eligible while New Booked,
Driver Assigned or Picked Up. Once a journey has started, a later delay or status
change does not reopen deletion. Unknown statuses are blocked.

Deletion means cancellation: it disappears from the Client's booking lists and
the Driver's assigned jobs, but Admin retains the Cancelled booking, timestamp,
actor, journey history and all photos. Registration reuse protection is unchanged.
The server locks the booking before checking its current status and ownership,
and rejects attempts to revive a cancelled booking from an old screen.

Legacy unlinked bookings fail explicitly and need Admin assistance; there is no
local-only deletion. This setup does not delete any existing booking or photo.
