# Custom expense types

Run the complete `supabase/expense-types.sql` in the existing portal's Supabase SQL Editor. Expected result: **Success. No rows returned**. The existing Bulk Expenses setup must already be installed.

Publish the matching portal update through the existing GitHub-to-Vercel route. Workspace changes alone do not update portal.ukonwheels.org.

In **Accounts → Add Expenses → Create expense type**, enter a name such as Parking charges and select **Save expense type**. Once the server confirms the save, the type appears in both the single-expense and bulk-expense dropdowns. Choose it, fill in the expense details and use **Add Expense** or **Save All** to record the actual expense.

Types are shared across authorised Accounts users and stay saved after refresh or sign-out. The 13 built-in types are kept. Case-insensitive duplicates do not create another type. Names are limited to 80 characters.

Only active Admin and Accounts-management Staff may create types; Accounts-view Staff may read them. Drivers and Clients cannot access them. There is no delete/rename operation in this update, so historical expense labels remain unchanged.

The patch changes only the existing batch function's category validation; it keeps its atomic save, retry and financial-validation guards. It refuses to proceed if the installed function has an unexpected definition. Rerunning the older `bulk-expenses.sql` later replaces that function, so rerun `expense-types.sql` afterwards.

Real acceptance check after publishing: save a new type, refresh, confirm it in both dropdowns, save a single and bulk expense with it, and confirm those entries in the selected month's register. Reopen from another authorised Accounts session to confirm the shared list. A failed type save keeps the typed name and does not claim success.
