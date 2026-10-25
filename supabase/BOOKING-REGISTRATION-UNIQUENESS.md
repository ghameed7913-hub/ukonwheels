# Customer/branch vehicle registration protection

Run the complete `supabase/booking-registration-uniqueness.sql` file in the
portal's Supabase SQL Editor, then deploy the matching portal update.

- Each saved Business Client record is a separate customer/branch.
- The same registration cannot be booked again for that customer/branch,
  even if the earlier booking was delivered.
- Another saved customer/branch can book that registration.
- Private Clients are identified by their linked Client account.
- Spaces, hyphens and letter case do not distinguish registrations.
- Single, manual multiple and Excel bookings use the same database rule.
- Concurrent submissions are protected; failed rows remain available to correct.
- Retrying a confirmed booking's existing reference is not a new booking.

The patch is safe to rerun. It does not delete historical duplicate records or
prevent ordinary status, evidence, payment or approved destination updates on
them. New bookings and customer/registration changes are checked. All creation
paths must link a saved customer before the transaction commits.

Expected SQL Editor result: **Success. No rows returned**.
