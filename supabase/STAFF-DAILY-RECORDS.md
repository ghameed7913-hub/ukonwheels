# Staff Daily Record

## Setup

1. In the same Supabase project used by the portal, open SQL Editor → New query.
2. Paste the entire contents of `supabase/staff-daily-records.sql` and press Run.
3. Expect **Success. No rows returned**. This setup needs the existing payslip payments setup, which is already used by the portal. Do not rerun the old payslip payments script afterwards: it would replace the new protection against bypassing staff daily records.
4. Release the portal update through its existing GitHub → Vercel route. A Replit preview is not the live portal.ukonwheels.org site.

No old data is deleted or automatically converted. Existing staff payments must be entered manually if they should reduce a new payslip.

## Spreadsheet layout update

After the original setup, run the entire `supabase/staff-daily-spreadsheet.sql`
file in a new Supabase SQL query before releasing the spreadsheet frontend.
This adds one transaction-safe save operation using the existing staff records.
It does not delete, reset or automatically convert records.

## Daily use

For the simplified all-employee sheet, also run
`supabase/staff-simple-sheet.sql` after both setup files above.
The page automatically lists internal portal users, saved Create User records
(including not-yet-assigned staff), HR employee registrations and existing ledger
people. Matching email addresses appear once. Client sign-ins are not employees.
Accounts receives only name, email, role and source—not private screening details.

The main sheet has Name, Normal pay, Expenses, Overtime, Bonus, Fuel, Advances,
Paid and Total payable. Type new amounts for the chosen date; existing month
totals are included in the payable column. Monthly salary is still counted once.
Bonus and fuel are separate saved amounts and carry into the payslip. The portal's
optional manual tax remains on wages and overtime only; this is not PAYE advice.
Untouched automatic employee rows are not saved as new financial records.
Manual rows can be saved with a name alone; email is optional for the sheet.
An email must be supplied before the employee's first save if you also want to
link that row to HR Payslips. No fabricated addresses are created.

- Open **Accounts → Staff Daily Record**.
- Choose the month and add spreadsheet rows. Type a new name, email and **monthly salary** or **daily rate** directly into a row, or select an existing employee. Use the employee's existing email when they already have a payslip/login record. Saving this financial record does not create a login.
- Enter dated normal work pay, overtime, reimbursable expenses, advances and payments directly into their columns. Monthly salary is counted once per employee, not once per row. Daily staff earn the work amounts entered. Expenses mean money owed **to the employee**, not a second general company expense.
- Review each person's payable balance and the grand total at the bottom. Draft amounts are estimates until saved. Optional tax applies only to normal pay and overtime. Negative balances remain visible as overpayments.
- Use **Save rows** to save all filled draft rows together. If any row fails validation, none of that batch is saved and all typed values stay available for correction. Up to 100 rows may be saved at a time.
- Saved history remains read-only so previous payments cannot be silently overwritten. Remove only unsaved rows. Employees' existing pay terms cannot be changed by typing over a previous rate.
- Advances and payments mean money already handed over. They reduce the balance and create a Salary expense once. Do not add that cash payment again in Add Expenses.
- Use Refresh saved records to see another user's latest entries. Saved records remain after sign-out.

## Payslips

1. After all entries for the month are complete, open HR → Payslips.
2. Choose the employee and month, then **Load Daily Record**. Manually added staff appear in the employee list without needing a login.
3. Normal pay, overtime, general reimbursements and all advances/payments load automatically. Optional tax applies to wages and overtime, not reimbursements.
4. Generate the payslip. The server checks the latest entries again and rejects changed figures. One daily-record payslip closes that person's month, preventing the same salary and advances from being used twice.
5. The payslip's net amount is the **remaining balance**, not the total of earlier payments. Marking it Paid adds only that final balance as a Salary expense. Marking it Unpaid removes only that final linked expense; earlier dated advances/payments remain.
6. Review a negative balance instead of marking it Paid. No money is transferred by these controls. This remains the portal's manual tax calculation, not PAYE or National Insurance payroll.

Finalized months are read-only in the daily record. Record the final payment through the payslip's Paid status, not as another daily payment.

## Access and safety

Active Admin and authorized Accounts/HR staff can read these records. Only managers can add entries. Payslips still require HR management access. Drivers and Clients have no access to other staff's salary records.

Entries use retry-safe references. Rates/people are create-only to avoid silently changing historical salary calculations. Existing ledger records cannot be erased by an older portal tab saving its shared data.
