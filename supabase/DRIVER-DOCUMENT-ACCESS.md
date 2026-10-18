# Driver expiry alerts and access

1. In the existing Supabase project's SQL Editor, run the **entire**
   `supabase/driver-document-access.sql` file. It requires the existing HR setup.
   Success should say “Success. No rows returned.” This changes no passwords,
   deletes no records, and does not disable Admin, Client or HR accounts.
2. Release the portal code together with `public/driver-compliance.js` and the
   updated HR registration screen. Old portal versions will also be denied Data
   API access for expired Drivers once the SQL is installed.
3. In HR → Employee Registration, open each Driver's record and link the correct
   existing portal user. Matching emails link automatically; display names are
   never used for matching. Check unmatched/different-email records manually.
4. Record actual document expiry dates. Leave non-applicable dates blank (for
   example, no visa for someone who does not need one). Dates remain valid for
   the whole expiry day in Europe/London. Do not use fictitious future dates.
5. Drivers see only their account name, email and phone, plus notices listing
   expired document names/dates. They do not receive HR screening notes, identity
   numbers, uploaded evidence or editable HR fields. Passwords are never shown.
6. Any recorded expired document generates an in-app notice. An expired driving
   licence, passport or visa blocks Driver portal entry and API/storage access.
   Existing sessions are rechecked every minute and on returning to the app;
   Data API requests are blocked immediately on the server. Other expiry
   notices do not prevent login. There is no email/SMS in this update.
7. HR must update the existing linked record after receiving renewed documents.
   Normal HR permissions and manual vetting/approval remain in force. The
   Driver can then sign in again. Update any duplicate linked records too;
   an older expired linked record is not ignored.

## Verify after setup

Use a dedicated test Driver, not a working Driver:

- Yesterday's licence/passport/visa date individually blocks new login and a
  restored session, while Admin/HR/Client still work.
- The same account's Data API requests must return a permission error even when
  the portal UI is bypassed. `driver_document_status()` remains available only
  for the signed-in account so the lock message can name expired documents.
- Renew the date through HR; the Driver can sign in again without HR changing
  the account password or account status.
- An expired qualification/right-to-work/check date only shows a notice.
- Expiry today and a non-applicable blank date do not block access.
- Check another Driver cannot read the first Driver's private HR records.

The SQL stops safely if a different PostgREST pre-request hook is already
configured: do not replace it manually; combine the security hooks first.
Existing signed download links may remain usable until their short expiry.
This blocks portal access; it does not delete the underlying Supabase Auth
identity, change its password, or claim to verify replacement documents.
