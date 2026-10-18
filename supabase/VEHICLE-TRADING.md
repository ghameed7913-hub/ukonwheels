# Buying & Selling

Run the complete `supabase/vehicle-trading.sql` in the existing Supabase project
before merging the portal update. Existing permission helpers must already be
installed. This creates an isolated private `vehicle_trades` table and its read /
save operations. It does not migrate or replace any existing database, or change
bookings, invoices, expenses or payslips.

Admin and Staff assigned Accounts see Buying & Selling → Buying / Selling.
Active Admin / Accounts managers can save; Accounts viewers can only read.
Driver, Client and HR-only accounts cannot read the ledger, including through
direct table requests. Authenticated users have no direct table write grants.
Trading data never enters the shared operations snapshot or client/driver cache.

## Calculation

Total cost = purchase amount + fuel + MOT charges + road tax + auction charges.
Profit / loss = sold for − total cost. Costs are positive or zero, with a positive
purchase amount; money supports at most two decimals. Arithmetic uses integer
pence in the browser and exact decimal arithmetic on the server. The server
recalculates the total, profit and weekday; submitted derived totals are ignored.

An empty sold-for field means **Not sold**, not a realised loss.
An explicitly entered zero is a completed zero-price sale and a loss of the full
cost. Profit is green with a plus sign, loss red with a minus sign, break-even
neutral. There is no automatically applied VAT or other unrequested tax.
Mileage is recorded once as a non-negative whole number.

Service history is Full / Partial / None / Unknown. Log book is Yes / No /
Awaiting. These are statuses, not file-upload controls.

Buying creates/edits all vehicle details and can include an optional sold price.
Selling lists stock and sold vehicles; Record sale / Edit sale opens a sold-price
entry while retaining all purchase details/costs. Both pages show the same ledger.
Search accepts registration, make, model or seller/auction name.

## Save safety

Each save keeps a stable record UUID and mutation UUID until confirmed. Network
uncertainty locks the original entry and Retry save resends the exact request.
Successful same-mutation retries do not duplicate records or increase versions.
A record lock serializes create retries; optimistic versions prevent one editor
silently overwriting another. A version conflict keeps the draft and offers
Recover / reload latest, with confirmation before discarding unsaved edits.

This feature does not delete financial records, post trading costs into the
delivery expense ledger, or add sales to client booking invoices. Automatically
posting into the existing ledgers would double-count manually entered expenses
without an agreed reconciliation rule. Trading profit is shown in this area.

Browser checks use synthetic data only. Local visual previews are available on
localhost / 127.0.0.1 with `?ui-preview=admin&ui-page=buying` or `selling`; the
synthetic local-preview Admin uses memory only and cannot write to Supabase.
