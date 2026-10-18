# Driver Payments page

This release uses the existing `read_own_portal_store` RPC already installed
through `portal-safety-fixes.sql`. No new SQL patch or data migration is required.
HR Paid/Unpaid functionality continues to use the installed `payslip-payments.sql`.

Drivers open Payments in their bottom navigation. HR-generated payslips appear
with their references, pay month, original net amount and optional breakdown.
Unpaid/unmarked records display Pending; Paid records display Paid and their
recorded payment date. Drivers cannot edit status or amounts.

The server filters by authenticated Driver profile ID, with a legacy email
fallback only when no profileId property exists. The browser applies the same
ownership check before rendering and never authorises by display name. Clients,
other Drivers, HR screening files and customer invoices are not included.

Opening the page fetches private saved data. Existing 30-second scoped-store
refreshes update it; returning to the window and Refresh also fetch current
status. Late requests cannot repopulate a signed-out/changed account. Errors
explicitly mark any retained same-account results as stale, never as confirmed
current payments. Empty history is shown only after a successful empty read.

Pending negative balances are labelled owed to the company and do not reduce
the outgoing pending-payments total. Historic stored net totals are never
recomputed or replaced with missing component sums.

Local visual fixture: on localhost/127.0.0.1 only,
`/?ui-preview=driver&ui-tab=payments`. Its synthetic records are not enabled
on a live domain and never write to Supabase.
