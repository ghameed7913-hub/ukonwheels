# Staff Daily Record

## Setup

1. In the same Supabase project used by the portal, open SQL Editor → New query.
2. Paste the entire contents of `supabase/staff-daily-records.sql` and press Run.
3. Expect **Success. No rows returned**. This setup needs the existing payslip payments setup, which is already used by the portal. Do not rerun the old payslip payments script afterwards: it would replace the new protection against bypassing staff daily records.
4. Release the portal update through its existing GitHub → Vercel route. A Replit preview is not the live portal.ukonwheels.org site.

No old data is deleted or automatically converted. Existing staff payments must be entered manually if they should reduce a new payslip.

## Daily use

- Open **Accounts → Staff Daily Record**.
- Save a name, email and **monthly salary** or **daily rate**. Use the employee's existing email when they already have a payslip/login record. Saving this financial record does not create a login.
- Choose the person and month. Monthly salary is counted once; daily staff earn the work amounts recorded for their days.
- Add dated overtime, reimbursable expenses, advances or payments. Work entries accept days × rate, or a manually entered amount. Expenses here mean money owed **to the employee**, not a second general company expense.
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
