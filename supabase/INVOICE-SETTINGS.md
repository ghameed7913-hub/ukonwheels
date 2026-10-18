# Shared company details, logo and invoice PDF update

This update is **not a reset**. It keeps users, bookings, invoices and evidence.

## Release order

1. In the existing portal Supabase project, open **SQL Editor → New query**.
2. Copy the entire `supabase/invoice-settings-patch.sql`, including `begin;`
   and the final `commit;`. Paste and run it.
3. Expect **Success. No rows returned**. If it fails, keep the error and stop.
4. Release the matching portal update through GitHub main → Vercel.
   Do not run any reset script.

## Use

- Admin → Accounts → Invoices → **Edit company, bank details & invoice logo**.
- Enter UK On Wheels company and bank details once, optionally upload a PNG/JPG
  logo (maximum 2 MB), then **Save Company / Bank Details & Logo**.
- A confirmed save is reused across Clients, devices and sign-ins. Saved details
  are collapsed by default; open Edit only when changing them.
- The logo checkbox applies to future invoices. Without an upload, the existing
  UK On Wheels logo is used. Untick it for an invoice without a logo.
- Every newly generated invoice snapshots the saved issuer and customer details.
  Later changes to the company, bank or logo do not rewrite these invoices.
- Admin and the authorized Client can use **Download PDF** in their invoice
  registers or invoice view. This downloads a real PDF, not a print dialog.
- VAT remains optional per invoice. PDF totals use the saved VAT selection.
- Older invoices without a company snapshot use the saved global company details,
  as before, and can also be downloaded.

## Storage and access

Logos use a dedicated public `invoice-branding` Supabase bucket, containing only
public company branding. Booking/incident photos remain in their existing buckets
with unchanged permissions. Only active Admin or authorized Accounts Staff may
upload logos or save issuer defaults. Old logo files are retained for older PDFs.
No bank details or invoice records are stored in the public bucket.
Client access to issuer defaults requires ownership of the requested invoice;
Drivers and anonymous users cannot call these settings functions.

PDFs are generated on the device from saved invoice data. There is no new service
subscription or dependency on the browser's Save as PDF support.
