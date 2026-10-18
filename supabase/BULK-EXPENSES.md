# Bulk Expense setup and use

Run all of `supabase/bulk-expenses.sql`, including its final commit, in the
existing Supabase project before merging the matching portal update. It uses
the installed HR/payslip permission helpers and existing `app_store` row.
It adds no replacement database and deletes no existing expense or payslip.

Accounts → Expenses keeps the single-expense form and adds Bulk Expense.
Open it, enter each receipt on its own row, add/remove rows as needed and press
Save All. Every row has Date, Expense Type, Amount, Method, Receipt/Reference,
Supplier/Paid To and Notes, matching the single form. One to 200 rows are allowed.
Amounts must be positive, with at most two decimal places; dates must exist.
Each row is saved separately in the existing register and monthly P&L.

Invalid rows prevent the whole batch from saving and remain editable. Rows clear
only after the server confirms every expense. Removing an unsaved row does not
delete a saved expense. Closing a filled draft requires confirmation.

If a network error leaves the save uncertain, the original rows are locked and
Retry save reuses their original batch ID/content. Do not start a replacement
batch for the same receipts: retry first. Same-ID retries cannot duplicate rows.
Known setup/validation failures keep the draft editable because no rows committed.

Only active Admin or Staff with Accounts management permission can submit.
View-only Staff, HR-only managers, Drivers and Clients cannot use this RPC.
The finance read response now includes `canManageExpenses`; it still excludes
private payslips from Accounts-only readers.

Server-derived row IDs, actor/time, payload fingerprint and a row lock ensure
atomic append, reliable retry and concurrent-batch retention. Newly saved
`source=expense-batch` rows are canonical: ordinary whole-store snapshot saves
cannot erase/rewrite them. This guard composes with payslip expense protection.
It does not alter the old single-expense path or recalculate payroll.
Future edit/delete functionality for saved batch rows must use an authorised
server operation rather than overwrite the shared snapshot.

The local visual fixture
`/?ui-preview=admin&ui-page=expenses&ui-bulk=1` is restricted to localhost or
127.0.0.1 and the synthetic local-preview Admin; it does not write to Supabase.
