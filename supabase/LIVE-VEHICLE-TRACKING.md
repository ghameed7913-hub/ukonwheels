# Live vehicle tracking setup

## Supabase first

Run the whole `supabase/live-vehicle-tracking.sql` file in the existing UK On Wheels
Supabase SQL Editor. It requires the existing portal profiles, bookings,
business membership and HR document setup. It adds separate tracking tables,
RPCs and a booking trigger; it does not delete users, bookings or evidence.
Expected result: **Success. No rows returned**.

Then deploy the portal update through the existing GitHub/Vercel release process.
This setup is not applied merely by merging code.

## Admin and Client portals

Open **Track Vehicle**. Search a booking reference or registration, then select
the right booking. Blank search lists up to 50 recent visible bookings.

Admin can track business bookings. Clients can see only their own business's
bookings (including private bookings Admin linked to their Client account).
Different customers' vehicles
cannot be looked up by guessing their references.

The page shows current booking status, collection/delivery addresses, Driver,
status timeline and actual latest GPS position with accuracy and update time.
It refreshes approximately every 15 seconds. No GPS fix means no location pin.
After two minutes without a fresh fix, the location is marked offline/stale.
The position comes from the assigned Driver's phone, not a fitted vehicle tracker.

## Driver consent and sharing

After pickup, open the assigned job and tap **Start sharing**. Location is shared
only for that selected vehicle. Starting another job ends the previous session.
Use **Stop sharing** to end it early.

Delivery, cancellation, reassignment, account deactivation or expiry of a
required licence/passport/visa invalidates tracking on the server. The phone
stops its location task when the server rejects its next update.
Sessions expire after 24 hours; start sharing again if a delivery runs longer.
Client location access ends when sharing ends.

The browser portal supports foreground sharing only and explains this limitation
before starting. It is not a background tracking solution.

## Locked-phone tracking: new native Driver build required

The existing Expo Driver source includes an iOS/Android background location task.
Its build needs the new `expo-task-manager`, `expo-secure-store`, and
`expo-location` plugin configuration. **Expo Go and an old installed app do not
gain background tracking from a portal deployment.**

Build and install an updated Driver app through the existing Android/iOS release
process. Do not publish to stores before testing on real phones:

1. Sign in as an assigned Driver with valid required documents.
2. Mark the vehicle Picked Up, start sharing and grant precise foreground plus
   **Always / Allow all the time** location permission.
3. Confirm an Android persistent delivery-tracking notification, or the iOS
   background location indicator.
4. Lock the phone and move with it; confirm the correct Admin/Client map updates.
5. Turn off mobile data: the portal must become stale/offline rather than invent
   movement. Restore data and confirm fresh fixes resume.
6. Deliver or reassign the job, and confirm no further locations become visible.
7. Stop sharing and sign out; confirm the phone's location task ends.
8. Test denial/revocation of background permission and phone battery restrictions.

OS force-stop, a reboot, poor GPS, lost signal, or restrictive battery settings
can interrupt tracking. Never advertise an offline marker as live. If the OS
ends tracking, reopen the job and start sharing again.

## Security and privacy

Portal sign-in tokens stay in the WebView. The native task gets only a random,
expiring, write-only capability for the selected booking, encrypted in native
SecureStore. The server rechecks Driver status, current assignment and delivery
state on each upload. It cannot use that capability to read any booking.
Only the latest location is stored, not a historical location trail. Older
revoked tracking credentials are cleared when new sessions are started.

The map embeds OpenStreetMap and loads third-party map tiles. Before store
submission, the business must update its privacy notice and store Data Safety /
App Privacy and background-location declarations to describe Driver location
sharing, its purpose and recipients.
