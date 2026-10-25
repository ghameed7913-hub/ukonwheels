# Pending booking approvals

Run `pending-booking-approvals.sql` in the existing portal Supabase project's SQL Editor before publishing the matching portal update. It requires the existing `app_store`, `profiles`, normalized `bookings`, `admin_update_booking_details` and `update_booking_status` setup. Safe to rerun; no records or evidence are deleted.

## Using the feature

1. Admin main page → **Pending Approval** in Vehicle Status Overview.
2. Review the booking, current values and proposed changes.
3. Tick individual requests or **Select All**.
4. Press **Approve All**, then confirm.

Only selected, still-pending requests are approved. Existing Staff approval behavior is unchanged; bulk approval requires an active Admin.

The server locks the shared store and affected booking records. It checks each request against the current booking, uses existing protected booking functions and saves the request decisions and approval history in the same database transaction. Any invalid, stale, missing or rejected request causes the whole batch to roll back, including any booking changes and status events. Retrying already-approved request IDs does not repeat changes or append extra events.

If several pending requests concern the same booking, select one proposal for that booking and review the others separately. They may conflict; bulk approval deliberately does not choose one silently.

## Checking

- Refresh after approval: approved requests must leave the pending list and the main-page count must decrease.
- Unselected requests must stay pending.
- Confirm updated status, mileage, amount and delivery address on the booking.
- Existing photos and other portal settings must stay intact.
- If setup is missing, the portal names the required SQL file and does not claim approval succeeded.
