# Save booking changes without approval

The user confirmed that only booking-change approvals should be removed.
HR holiday approvals, role permissions and historical booking records stay intact.

## Install

1. In the existing portal Supabase project, open SQL Editor → New query.
2. Run the entire `booking-direct-updates.sql` file.
3. Confirm `Success. No rows returned`.
4. Merge the matching portal GitHub update and wait for Vercel to finish.
5. Refresh the portal before editing.

The setup replaces functions and permissions; it does not apply, delete or change
existing bookings or approval requests. Old pending requests are retained but cannot
be submitted, approved or resubmitted through the retired functions.

## Behaviour

- No Pending Approval dashboard card, Update Approvals menu or booking approval action.
- Update Amount, Update Destination, Single Booking Update and Edit Booking save
  directly through a server-validated update.
- Changes are recorded with the signed-in person's name and timestamp.
- Existing photos, event timelines, past approvals and holiday records are preserved.
- Only active Admin and appropriately permitted Operations users can save changes.
  Drivers and Clients do not gain editing privileges.
- Editing a charge does not overwrite newer Driver progress. If the same field
  changed while the form was open, refresh before saving again.
- Deleted bookings cannot be restored and Delivered jobs cannot be moved backwards.

Do not rerun old approval/security/review setup files after this migration: those
historical files grant the retired actions again. Use this migration as the current
booking-edit policy.
