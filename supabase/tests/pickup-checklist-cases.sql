select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
create table public.test_checklist(value jsonb);
insert into public.test_checklist values ('{
 "version":1,"ready":true,"declaration":true,"condition":"Good","mileage":1200,
 "fuelLevel":"Half","notes":"Synthetic test only","electricVehicle":"no",
 "chargingCable":"","chargingCableReason":"","spareTyre":"no","logBook":"no",
 "serviceHistory":"no","damagePresent":"no","damageComments":""
}');
-- Capture assertions against the real RPC, not a simulated frontend.
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),false)$$,'Front of car');
insert into public.booking_evidence
select '10000000-0000-4000-8000-000000000001','pickup',
 '10000000-0000-4000-8000-000000000001/'||n||'.jpg',label
from unnest(array['Front of car','Driver side','Driver side front wheel','Driver side rear wheel',
 'Back side','Passenger side','Passenger side front wheel','Passenger side rear wheel','Mileage','Exterior','Back seats','Keys'])
 with ordinality labels(label,n);
-- Metadata alone, without stored bytes, does not satisfy a required photo.
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),false)$$,'Front of car');
insert into storage.objects select 'booking-evidence',storage_path from public.booking_evidence;
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),true)$$,'Save pickup evidence');
select public.test_expect_error(
 $$select public.update_booking_status('10000000-0000-4000-8000-000000000001','Picked Up')$$,'Save the pickup checklist');
select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),false);
do $$ begin
 if (select status from bookings)<>'Driver Assigned' then raise exception 'Saving advanced status'; end if;
 if (select checklist from booking_inspections) is distinct from (select value from test_checklist) then raise exception 'Checklist not persisted'; end if;
end $$;
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"notes":"Changed"}' from test_checklist),true)$$,'Save pickup evidence');

-- Conditional answers and validation.
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value-'logBook' from test_checklist),false)$$,'logBook');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"mileage":-1}' from test_checklist),false)$$,'Invalid odometer');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"electricVehicle":"yes","chargingCable":"no"}' from test_checklist),false)$$,'no charging cable');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"electricVehicle":"yes","chargingCable":"yes"}' from test_checklist),false)$$,'Charging cable');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"spareTyre":"yes"}' from test_checklist),false)$$,'Spare tyre');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"logBook":"yes"}' from test_checklist),false)$$,'Log book');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"serviceHistory":"yes"}' from test_checklist),false)$$,'Service history');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"damagePresent":"yes"}' from test_checklist),false)$$,'Describe the damage');
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value||'{"damagePresent":"yes","damageComments":"Scratch"}' from test_checklist),false)$$,'damage photo');
-- An unrelated Driver, Client or inactive Driver cannot save or complete.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),false)$$,'not assigned');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),false)$$,'active Driver');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
update profiles set status='Inactive' where id=auth.uid();
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),false)$$,'active Driver');
update profiles set status='Active' where id=auth.uid();

-- Full conditional evidence, with multiple damage photos, survives re-read.
update test_checklist set value=value||'{"electricVehicle":"yes","chargingCable":"yes","spareTyre":"yes","logBook":"yes","serviceHistory":"yes","damagePresent":"yes","damageComments":"Rear scratch"}';
insert into public.booking_evidence
select '10000000-0000-4000-8000-000000000001','pickup',
 '10000000-0000-4000-8000-000000000001/extra-'||n||'.jpg',label
from unnest(array['Charging cable','Spare tyre','Log book','Service history','Damage photo 1','Damage photo 200'])
 with ordinality labels(label,n);
insert into storage.objects
select 'booking-evidence',storage_path from public.booking_evidence where label in ('Charging cable','Spare tyre','Log book','Service history','Damage photo 1','Damage photo 200');
select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),false);
-- A lost photo or reassignment after Save is rechecked, never silently accepted.
delete from storage.objects where name like '%extra-1.jpg';
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),true)$$,'Charging cable');
insert into storage.objects select 'booking-evidence',storage_path from public.booking_evidence where label='Charging cable';
update bookings set driver_id='00000000-0000-4000-8000-000000000002';
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),true)$$,'not assigned');
update bookings set driver_id=auth.uid();
select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),true);
do $$ begin
 if (select status from bookings)<>'Picked Up' then raise exception 'Pickup status not advanced'; end if;
 if (select count(*) from booking_events)<>1 then raise exception 'Expected one status event'; end if;
 if (select count(*) from booking_evidence)<>18 then raise exception 'Evidence was lost'; end if;
 if (select checklist from booking_inspections) is distinct from (select value from test_checklist) then raise exception 'Answers were lost'; end if;
end $$;
select public.test_expect_error(
 $$select public.save_pickup_checklist('10000000-0000-4000-8000-000000000001',(select value from test_checklist),true)$$,'before pickup');
select 'All isolated pickup-checklist SQL assertions passed' as result;
