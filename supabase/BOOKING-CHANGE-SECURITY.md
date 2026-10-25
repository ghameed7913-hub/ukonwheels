# Amount and destination approval

Run `booking-change-security.sql` in the existing Supabase project's SQL Editor
**before merging the matching portal update**. The earlier
`pending-booking-approvals.sql` setup must already be installed.
Expected result: **Success. No rows returned**. Safe to rerun; no data is erased.

- A charge entered when creating a booking is saved normally, including zero.
- Operations can propose a new charge from **Update Amount** and a new address
  from **Update Destination**. Both display the current saved value.
- **Single Booking Update** also submits proposals without applying them.
- If **Edit Booking** includes an amount or destination change, those changes
  are submitted for approval. Other dialog edits are not saved in that case;
  the confirmation explicitly explains that they must be saved separately.
- Admin/Super Admin account holders must also submit protected changes first.
  Admin applies them through **Pending Approval**, individually or in bulk.
- Approval retains the existing stale-value checks and records who approved
  and when. Requests are saved with the signed-in user's server-verified name.
- Database guards protect canonical bookings and older shared-store records
  against direct writes and forged approvals. Only the approval transaction
  opens its private write context; a caller-supplied flag cannot open it.
- Initial creation writes are allowed only in the transaction that inserts the
  booking. A later update, even to a newly created job, needs approval.
- Normal status updates, driver assignment, payment status and unprotected edits
  continue to work. Authenticated browser users cannot delete/recreate bookings
  to bypass the protection. Trusted SQL Editor/service maintenance is separate.

Do not rerun older SQL files that replace `approve_booking_updates` after this
patch without rerunning this security patch last. The guards fail closed if the
approval wrapper is replaced; ordinary amount/destination changes remain blocked.

The existing saved shared store can contain old values. If a snapshot save is
rejected, refresh rather than changing an amount/address to bypass the check.
No SMS service is required for this approval workflow.
