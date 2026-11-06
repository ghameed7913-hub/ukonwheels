\set ON_ERROR_STOP on
select set_config('test.actor','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
do $$
declare s jsonb; j jsonb; n integer;
begin
 if has_function_privilege('authenticated','public.image_retention_worker(text,jsonb)','EXECUTE')
 or has_function_privilege('anon','public.manage_image_retention(text,jsonb)','EXECUTE')
 then raise exception 'Unsafe RPC permissions'; end if;
 s:=public.image_retention_worker('claim');
 if not (s->>'disabled')::boolean then raise exception 'Must install disabled'; end if;
 begin
   perform public.manage_image_retention('enable','{"confirmation":"DELETE ELIGIBLE IMAGES"}');
   raise exception 'Enabled without preview';
 exception when raise_exception then if SQLERRM='Enabled without preview' then raise; end if; end;
 perform public.manage_image_retention('rule',jsonb_build_object('kind','employee',
   'owner_id','44444444-4444-4444-4444-444444444444','left_on',(current_date-interval '5 years 1 day')::date));
 s:=public.manage_image_retention('preview');
 if (s->>'eligible')::int<>4 then raise exception 'Wrong cutoff/MIME/signature/financial/current employee filtering: %',s; end if;
 perform public.manage_image_retention('rule','{"kind":"delivery","reference":"UKOW00001","held":true}');
 s:=public.manage_image_retention('preview');
 if (s->>'eligible')::int<>3 or (s->>'held')::int<>1 then raise exception 'Hold failed'; end if;
 perform public.manage_image_retention('rule','{"kind":"delivery","reference":"UKOW00001","held":false}');
 perform public.manage_image_retention('preview');
 perform public.manage_image_retention('enable','{"confirmation":"DELETE ELIGIBLE IMAGES"}');
 j:=public.image_retention_worker('claim');
 if j->>'bucket'<>'booking-evidence' then raise exception 'Expected oldest delivery'; end if;
 begin
   update public.bookings set status='On Route' where id=(j->>'owner_id')::uuid;
   raise exception 'Edited active deletion';
 exception when raise_exception then if SQLERRM='Edited active deletion' then raise; end if; end;
 begin
   perform public.manage_image_retention('rule','{"kind":"delivery","reference":"UKOW00001","held":true}');
   raise exception 'Held during active request';
 exception when raise_exception then if SQLERRM='Held during active request' then raise; end if; end;
 begin
   perform public.image_retention_worker('complete',jsonb_build_object('token',j->>'token'));
   raise exception 'Removed metadata before Storage';
 exception when raise_exception then if SQLERRM='Removed metadata before Storage' then raise; end if; end;
 -- Simulate a successful Storage HTTP deletion followed by a process crash.
 delete from storage.objects where id=(j->>'object_id')::uuid;
 update ukow_retention_private.jobs set lease_until=now()-interval '1 second';
 j:=public.image_retention_worker('claim');
 perform public.image_retention_worker('complete',jsonb_build_object('token',j->>'token'));
 if exists(select 1 from public.booking_evidence where id=(j->>'source_id')::uuid) then raise exception 'Crash recovery failed'; end if;
 -- Finish every employee image, leaving PDFs / financial attachments intact.
 for n in 1..3 loop
   j:=public.image_retention_worker('claim');
   if j->>'kind'<>'employee' then raise exception 'Expected employee image: %',j; end if;
   delete from storage.objects where id=(j->>'object_id')::uuid;
   perform public.image_retention_worker('complete',jsonb_build_object('token',j->>'token'));
 end loop;
 if public.image_retention_worker('claim')<>'{}'::jsonb then raise exception 'Unexpected remaining claim'; end if;
 if (select count(*) from public.bookings)<>3
 or (select sum(amount) from public.invoices)<>500
 or (select sum(amount) from public.bookings)<>1368
 or (select count(*) from public.hr_employee_records)<>2
 then raise exception 'Non-image records changed'; end if;
 if not exists(select 1 from public.hr_employee_documents where name='payslip.jpg')
 or not exists(select 1 from public.booking_evidence where label='Signature')
 or not exists(select 1 from storage.objects where metadata->>'mimetype'='application/pdf')
 then raise exception 'Protected evidence removed'; end if;
 perform public.manage_image_retention('pause');
 if not (public.image_retention_worker('claim')->>'disabled')::boolean then raise exception 'Pause failed'; end if;
 perform set_config('test.actor','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
 begin
   perform public.manage_image_retention('status');
   raise exception 'Nonadmin accessed retention';
 exception when insufficient_privilege then null; end;
 raise notice 'Image retention SQL checks passed: boundaries, holds, permissions, crash recovery and financial preservation';
end $$;
