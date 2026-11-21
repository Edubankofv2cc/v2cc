-- Behavioural tests for V2C Education Bank rules. Run via: npm run test:db
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'EXPECTED ERROR containing "%" but statement succeeded: %', needle, sql;
exception when others then
  if position(needle in sqlerrm) = 0 then
    raise exception 'Wrong error for %: got "%", wanted "%"', sql, sqlerrm, needle;
  end if;
end $$;

create or replace function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Users: sign-up metadata tries to self-assign admin; must be ignored
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', 'donor@example.com',
  '{"full_name":"Kavya Donor","district":"Jaffna","role":"admin","membership_categories":["book_donor","mentor"],"preferred_language":"ta"}'),
 ('22222222-2222-2222-2222-222222222222', 'admin@example.com', '{"full_name":"Admin"}'),
 ('33333333-3333-3333-3333-333333333333', 'other@example.com', '{"full_name":"Other Donor"}');

select pg_temp.ok((select count(*) = 3 from profiles), 'profiles auto-created');
select pg_temp.ok((select array_agg(role::text) = '{donor}' from user_roles where user_id = '11111111-1111-1111-1111-111111111111'), 'signup defaults to donor only');
select pg_temp.ok((select preferred_language = 'ta' and membership_categories = '{book_donor,mentor}' from profiles where id = '11111111-1111-1111-1111-111111111111'), 'profile metadata copied');

insert into user_roles (user_id, role) values ('22222222-2222-2222-2222-222222222222', 'admin');

-- ---------- as donor ----------
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select pg_temp.ok(not is_admin(), 'donor is not admin');
select pg_temp.expect_error($$insert into user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111','admin')$$, 'permission denied');

-- donor tries to self-approve + fake the price
insert into deposits (donor_id, item_type_id, quantity, payment_method, status, total_amount_lkr)
select '11111111-1111-1111-1111-111111111111', id, 4, 'bank_transfer', 'pending', 1 from item_types where slug = 'exercise-books';
select pg_temp.ok((select total_amount_lkr = 1000 and status = 'pending' from deposits limit 1), 'server computes price (4 × 250)');
select pg_temp.expect_error($$insert into deposits (donor_id, item_type_id, quantity, payment_method, status) select '11111111-1111-1111-1111-111111111111', id, 1, 'bank_transfer', 'approved' from item_types limit 1$$, 'row-level security');
select pg_temp.expect_error($$insert into deposits (donor_id, item_type_id, quantity, payment_method) select '33333333-3333-3333-3333-333333333333', id, 1, 'bank_transfer' from item_types limit 1$$, 'row-level security');
select pg_temp.expect_error($$update deposits set status = 'approved'$$, 'row-level security');
select pg_temp.expect_error($$update deposits set admin_notes = 'x'$$, 'permission denied');
select pg_temp.expect_error($$select review_deposit((select id from deposits limit 1), true)$$, 'Admin only');
select pg_temp.expect_error($$insert into distributions (donor_id, item_type_id, quantity, school_name, village_name) select '11111111-1111-1111-1111-111111111111', id, 1, 'S', 'V' from item_types limit 1$$, 'Admin only');
select pg_temp.ok((select count(*) = 1 from profiles), 'donor sees only own profile');

-- ---------- as other donor ----------
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.ok((select count(*) = 0 from deposits), 'cannot see another donor''s deposits');

-- ---------- as admin ----------
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.ok(is_admin(), 'admin detected via user_roles');
select pg_temp.expect_error($$select review_deposit((select id from deposits limit 1), false, '  ')$$, 'reason is required');
select review_deposit((select id from deposits limit 1), true, null);
select pg_temp.ok((select available_quantity = 4 from donor_item_balances where donor_id = '11111111-1111-1111-1111-111111111111' and slug = 'exercise-books'), 'approved deposit credits balance');
select pg_temp.ok((select not is_member and qualifying_quantity = 4 from donor_membership where donor_id = '11111111-1111-1111-1111-111111111111'), '4 books: not yet member');

-- second deposit of 2 books -> member at threshold 6
insert into deposits (donor_id, item_type_id, quantity, payment_method)
select '11111111-1111-1111-1111-111111111111', id, 2, 'physical_delivery' from item_types where slug = 'exercise-books';
select review_deposit((select id from deposits where quantity = 2), true);
select pg_temp.ok((select is_member from donor_membership where donor_id = '11111111-1111-1111-1111-111111111111'), '6 approved books => member');

-- distributions are capped by balance
select pg_temp.expect_error($$insert into distributions (donor_id, item_type_id, quantity, school_name, village_name) select '11111111-1111-1111-1111-111111111111', id, 7, 'Kopay MV', 'Kopay' from item_types where slug = 'exercise-books'$$, 'Insufficient balance');
select pg_temp.expect_error($$insert into distributions (donor_id, item_type_id, quantity, school_name, village_name) select '11111111-1111-1111-1111-111111111111', id, 1, 'Kopay MV', 'Kopay' from item_types where slug = 'school-bags'$$, 'Insufficient balance');
insert into distributions (donor_id, item_type_id, quantity, school_name, village_name, students_reached)
select '11111111-1111-1111-1111-111111111111', id, 5, 'Kopay MV', 'Kopay', 5 from item_types where slug = 'exercise-books';
select pg_temp.ok((select available_quantity = 1 and distributed_quantity = 5 from donor_item_balances where donor_id = '11111111-1111-1111-1111-111111111111' and slug = 'exercise-books'), 'distribution debits balance');
select pg_temp.expect_error($$update distributions set quantity = 7$$, 'Insufficient balance');
update distributions set quantity = 6;
select pg_temp.ok((select available_quantity = 0 from donor_item_balances where donor_id = '11111111-1111-1111-1111-111111111111' and slug = 'exercise-books'), 'distribution update within balance ok');
select pg_temp.expect_error($$update deposits set status = 'rejected' where quantity = 4$$, 'Cannot revoke');
select pg_temp.ok((admin_stats() ->> 'items_distributed')::int = 6, 'admin stats');

-- ---------- donor sees notifications & own distributions ----------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.ok((select count(*) = 3 from notifications), 'bilingual notifications generated');
select pg_temp.ok((select count(*) = 1 from distributions), 'donor sees own distributions');
select pg_temp.expect_error($$select admin_stats()$$, 'Admin only');

-- ---------- storage policies ----------
insert into storage.objects (bucket_id, name) values ('receipts', '11111111-1111-1111-1111-111111111111/slip.jpg');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('receipts', '33333333-3333-3333-3333-333333333333/slip.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('proofs', 'x/photo.jpg')$$, 'row-level security');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.ok((select count(*) = 0 from storage.objects where bucket_id = 'receipts'), 'receipts private to owner');

-- ---------- anonymous ----------
reset request.jwt.claim.sub;
set role anon;
select pg_temp.ok((public_stats() ->> 'items_donated')::int = 6 and (public_stats() ->> 'active_members')::int = 1, 'public stats');
select pg_temp.ok((select count(*) = 3 from public_feed(10)), 'public feed');
select pg_temp.ok((select photo_proof_url is null from recent_distributions(5) limit 1), 'anon never gets photo paths');
select pg_temp.expect_error($$select * from deposits$$, 'permission denied');
select pg_temp.expect_error($$select * from profiles$$, 'permission denied');

reset role;
\echo 'ALL DATABASE TESTS PASSED'
