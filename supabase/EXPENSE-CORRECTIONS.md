# Expense corrections and complete filtered reports

## Install on the live portal

1. Existing prerequisites: `bulk-expenses.sql` and `expense-types.sql`.
   Do not rerun those prerequisites on an already configured portal.
2. In the correct Supabase project's SQL Editor, paste all of
   `expense-corrections.sql` and Run. It installs the authorised correction
   function, private audit history and stale-save protection. It does not delete
   existing expenses. It is safe to rerun.
3. Merge the portal update into GitHub main and wait for its Vercel deployment
   to be Ready. Refresh the portal and open Accounts → Add Expenses.
4. Each manual expense offers Edit and Delete. Delete requires confirmation.
   Date, category, amount, method, payee, reference and notes can be edited.
5. In Spending report, choose From, To and Category. Inclusive dates apply.
   The complete matching list opens automatically, with the same total as the
   graphs. Corrections update the register and report without clearing new
   expense drafts.

Only Admin and Accounts-management Staff can correct expenses. Drivers, Clients,
and view-only Staff cannot. Payslip-linked expenses remain controlled through
payroll to prevent differing wage totals.

Deleted expenses leave the active register and totals, but the private audit
history retains who changed them and the before/after values. This is not an
erasure of the underlying financial history.

If another account has changed the expense, the correction is rejected rather
than overwriting it. Refresh and reopen the current record. After a connection
failure, refresh the register to confirm its state before retrying.

No new Driver binary or Google Play release is needed for this Accounts change.

## Verification

`node --test artifacts/uk-on-wheels/tests/expense-*.test.cjs`

The SQL tests use disposable local PostgreSQL instances, never the live database.
