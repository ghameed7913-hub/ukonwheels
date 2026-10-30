# Review latest booking

Run the complete `review-booking-approvals.sql` file in the existing Supabase SQL
Editor after the pending-approval and booking-change security setups. Then release
the portal changes through GitHub → Vercel. No existing booking is changed by setup.

In Pending Approval:

1. Click **Review latest booking** on an outdated request.
2. Compare Original, Latest saved, and Requested values.
3. Keep only the requested changes that still apply.
4. Click **Submit replacement request** and confirm.
5. Review and approve the new Pending Approval request separately.

Unchanged fields from the old snapshot are not copied back. The original request
is retained as Superseded with its author and a link to the replacement. No booking
changes until the replacement is approved. If the booking or proposal changes
during review, submission is rejected and the comparison must be refreshed.

Only an active Admin may review or resubmit. Deleted bookings cannot be restored,
and Delivered bookings cannot be moved backwards. If no requested changes remain,
close the comparison and reject the outdated request.

If submission fails with “Amount and destination must match the approved booking”,
rerun the current complete SQL file. The corrected function refreshes stale shared
charge/address copies from the approved booking records before saving the new
request. It does not apply proposed charges/addresses or change booking records.
