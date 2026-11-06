create role anon;
create role authenticated;
create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql as
$$select nullif(current_setting('test.actor',true),'')::uuid$$;
create table public.profiles(id uuid primary key,status text);
insert into public.profiles values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Active');
create function public.is_portal_admin() returns boolean language sql as
$$select auth.uid()='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid$$;
create table public.bookings(id uuid primary key,reference text,status text,delivered_at timestamptz,amount numeric);
create table public.booking_evidence(id uuid primary key,booking_id uuid,evidence_type text,storage_path text,label text);
create table public.hr_employee_records(id uuid primary key,reference text,data jsonb);
create table public.hr_employee_documents(id uuid primary key,employee_id uuid,path text,name text,category text);
create table public.driver_identities(user_id uuid,photo_path text,card_photo_path text,company_id_path text,version integer);
create schema storage;
create table storage.objects(id uuid primary key,bucket_id text,name text,metadata jsonb);
create table public.invoices(amount numeric);
insert into public.invoices values(500);
insert into public.bookings values
 ('11111111-1111-1111-1111-111111111111','UKOW00001','Delivered',now()-interval '100 days',123),
 ('22222222-2222-2222-2222-222222222222','UKOW00002','Delivered',now()-interval '89 days',456),
 ('33333333-3333-3333-3333-333333333333','UKOW00003','On Route',now()-interval '100 days',789);
insert into public.booking_evidence
 select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,b.id,'pickup',
 b.id::text||'/front.jpg','Front' from public.bookings b
 cross join lateral(select case b.reference when 'UKOW00001' then 1 when 'UKOW00002' then 2 else 3 end n) nums;
insert into public.booking_evidence values
 ('00000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','pickup','11111111-1111-1111-1111-111111111111/signature.jpg','Signature'),
 ('00000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','pickup','11111111-1111-1111-1111-111111111111/invoice.pdf','Document');
insert into storage.objects select id,'booking-evidence',storage_path,
 jsonb_build_object('mimetype',case when label='Document' then 'application/pdf' else 'image/jpeg' end)
 from public.booking_evidence;
insert into public.hr_employee_records values
 ('44444444-4444-4444-4444-444444444444','HR-OLD','{"firstName":"Test","lastName":"Leaver","portalUserId":"55555555-5555-5555-5555-555555555555"}'),
 ('66666666-6666-6666-6666-666666666666','HR-ACTIVE','{"firstName":"Still","lastName":"Employed"}');
insert into public.hr_employee_documents values
 ('00000000-0000-0000-0000-000000000006','44444444-4444-4444-4444-444444444444','44444444-4444-4444-4444-444444444444/passport.jpg','passport.jpg','Identity'),
 ('00000000-0000-0000-0000-000000000007','44444444-4444-4444-4444-444444444444','44444444-4444-4444-4444-444444444444/payslip.jpg','payslip.jpg','Other'),
 ('00000000-0000-0000-0000-000000000008','66666666-6666-6666-6666-666666666666','66666666-6666-6666-6666-666666666666/photo.jpg','photo.jpg','Identity');
insert into storage.objects select id,'hr-screening',path,'{"mimetype":"image/jpeg"}' from public.hr_employee_documents;
insert into public.driver_identities values
 ('55555555-5555-5555-5555-555555555555','55555555-5555-5555-5555-555555555555/portrait.jpg',null,'55555555-5555-5555-5555-555555555555/card.png',1);
insert into storage.objects values
 ('00000000-0000-0000-0000-000000000009','driver-portraits','55555555-5555-5555-5555-555555555555/portrait.jpg','{"mimetype":"image/jpeg"}'),
 ('00000000-0000-0000-0000-000000000010','driver-company-ids','55555555-5555-5555-5555-555555555555/card.png','{"mimetype":"image/png"}');
