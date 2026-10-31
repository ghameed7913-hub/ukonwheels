# Pickup and delivery reminders

## Rules

- **Pickup:** notify every active Admin and the currently assigned active Driver on the UK calendar day before the booking's collection date (`booking_date`), provided it has not been picked up.
- **Delivery:** notify those recipients on the UK calendar day before `requested_delivery_date`, only once the vehicle has been picked up or is in an in-progress journey status.
- First scheduled reminder is at/after **08:00 Europe/London**, checked every 15 minutes. A qualifying booking created or picked up later that day is included in the next run.
- Each booking/date/type/recipient gets one notification. Repeated scheduler runs do not send duplicates. Changing the date or assigning another Driver can create the appropriate new recipient/date reminder.
- Admin sees in-portal alerts. The Driver sees in-portal alerts and receives remote push through the existing registered-device delivery queue, provided the native app and Expo/FCM/APNs delivery setup are working. Admin phone push, SMS and WhatsApp are not part of this setup.
- From **one calendar day before delivery**, picked-up vehicles are shown in red with a **Delayed** action label. This remains through the due date and while overdue, until delivered/cancelled or the delivery date is moved later.
- The action label **does not overwrite the actual journey status**. An On Route vehicle stays On Route; it can still be completed using the normal workflow.
- Delivered/cancelled/deleted jobs are excluded. Old Driver notices are hidden after reassignment; unsent reminders are cancelled when their assignment, date or journey stage no longer qualifies.
- No delivery reminder is sent for a vehicle that has not been picked up. Missing dates do not create reminders.

## Existing Supabase setup

1. This uses the **same Supabase project** as the live portal, not a new database.
2. `supabase/driver-push-notifications.sql` must already have been run successfully. It provides the notification booking link, private push queue, scheduler extensions and sender. If the new script says this prerequisite is missing, run that complete script first.
3. Open a new SQL Editor query, copy **all** of `supabase/booking-deadline-reminders.sql`, then Run.
4. Expected result: success (possibly a count or scheduled job ID). Running the file again is safe.
5. Merge the corresponding GitHub portal update and allow its existing Vercel deployment to finish. No new native build is required solely for this web-portal alert display; native phone push still requires an installed configured build, not Android Expo Go.

The new script adds a private reminder ledger and named scheduler, extends the existing push sender with generic reminder titles and stale-reminder checks, and exposes an authenticated Admin/Driver-only reminder RPC. It does not delete business records or change booking statuses.

Read-only checks:

```sql
select jobname,schedule,active from cron.job
where jobname in ('ukow-booking-deadlines','ukow-driver-push');

select notification_type,count(*)
from public.notifications
where notification_type in ('booking_pickup_reminder','booking_delivery_reminder')
group by notification_type;
```

Full booking references and vehicle registrations appear only inside the authenticated portal. Lock-screen push content is generic. Do not share private device tokens or credentials.

## Verification

The SQL tests execute the actual push and reminder functions in a disposable local PostgreSQL cluster with a simulated push HTTP transport. They do not contact real phones or mutate production.
