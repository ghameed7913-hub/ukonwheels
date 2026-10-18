# Payslip Paid / Unpaid status and linked expenses

## Setup and release

Run the whole `supabase/payslip-payments.sql` in the existing Supabase project,
through `commit;`, before merging the matching portal update.
It uses the existing `app_store` data and HR permission helpers. No historical
record or file is deleted. Previously unmarked payslips display as Unpaid; the
setup does not infer payments or backfill expenses.

Refresh older portal tabs after setup. The old generation form must not be used:
new payslip creation and payment changes now use authorised atomic RPCs. Generic
shared-store saves retain authoritative payslips and linked payroll expenses.
Unrelated booking/settings/manual-expense saves continue to work.

## Use

- HR → Payslips offers Paid / Unpaid when generating, default Unpaid.
- An existing payslip also has a payment-status control.
- Paid creates exactly one linked expense for the stored net amount payable
  after tax and advances, including allowances already included in net pay.
  Driver category is Wages; Staff/other employee roles use Salary.
- The expense contains the payslip reference, employee name and pay month.
  Its accounting date is the actual recording date in Europe/London, not
  necessarily the payslip's work month.
- This records a payment; it does not send money or run bank transfers.
  Payment method is explicitly Not recorded, not an invented cash/bank method.
- Zero-net payslips can be settled with a zero-value linked record. Negative
  balances owed by the employee cannot be marked Paid as outgoing wage payments.
- Confirming Unpaid on a paid payslip removes only its linked payroll expense.
  Manual expenses and other payslips remain unchanged. This is a correction to
  recorded payment status, not an actual refund or bank reversal.
- The printed payslip displays its payment status and recorded payment date.
- Expensing/reversing a payslip does not recalculate historical tax or totals.

## Safety

HR management is required to create or change payment status. HR viewers are
read-only; Accounts readers can read expenses without receiving payroll records.
Drivers and Clients cannot read this financial endpoint or change statuses.
Existing Driver-own payslip reads remain separate.

Writes lock the shared row and commit the payslip and expense together.
Deterministic linked expense IDs, current versions and same-state no-op retries
prevent duplicates or stale opposite-status overwrites. Failed creation cannot
leave a partial paid payslip/expense. Frontend retries retain the original
payslip reference after a lost response.

Stale ordinary snapshot saves cannot remove, change or duplicate protected
payroll records/expenses. New pages refetch authoritative payroll/expenses;
realtime keeps other sessions fresh. A status save updates only the register and
selected printed document, preserving an in-progress payslip form.
