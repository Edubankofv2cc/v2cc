-- =====================================================================
-- V2C Education Bank — core schema, security and business rules
-- "உதவுகின்றோம் உங்களிற்கு, உதவிடுங்கள் பிறருக்கு"
-- =====================================================================
-- Balances are held in ITEM QUANTITIES, never cash:
--   available(donor, item) = Σ approved deposits − Σ distributions
-- Enforced in the database so no client can overdraw an item account.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role       as enum ('admin', 'donor');
create type public.deposit_status as enum ('pending', 'approved', 'rejected');
create type public.payment_method as enum ('bank_transfer', 'physical_delivery');
create type public.app_language   as enum ('en', 'ta');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  full_name               text not null default '' check (char_length(full_name) <= 120),
  email                   text not null default '' check (char_length(email) <= 254),
  whatsapp_number         text check (char_length(whatsapp_number) <= 32),
  school_attended         text check (char_length(school_attended) <= 160),
  district                text check (char_length(district) <= 80),
  full_address            text check (char_length(full_address) <= 400),
  occupation              text check (char_length(occupation) <= 120),
  referral_source         text check (char_length(referral_source) <= 160),
  membership_categories   text[] not null default '{}' check (cardinality(membership_categories) <= 13),
  account_opening_reason  text check (char_length(account_opening_reason) <= 1000),
  preferred_language      public.app_language not null default 'en',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null default 'donor',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.item_types (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique,
  name_en                  text not null,
  name_ta                  text not null,
  unit_price_lkr           numeric(12, 2) not null check (unit_price_lkr >= 0),
  is_membership_qualifier  boolean not null default false,
  active                   boolean not null default true,
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now()
);

-- Single-row configuration (membership threshold, bank instructions)
create table public.app_settings (
  id                     boolean primary key default true check (id),
  membership_threshold   integer not null default 6 check (membership_threshold > 0),
  bank_name              text not null default 'Bank of Ceylon',
  bank_branch            text not null default 'Jaffna',
  account_name           text not null default 'Village 2 City Club',
  account_number         text not null default '0000000000',
  swift_code             text,
  physical_drop_off_en   text not null default 'Village 2 City Club office — please call ahead on WhatsApp.',
  physical_drop_off_ta   text not null default 'Village 2 City Club அலுவலகம் — முன்கூட்டியே WhatsApp இல் அழைக்கவும்.',
  contact_whatsapp       text not null default '+94 77 000 0000',
  contact_email          text not null default 'hello@v2cclub.org',
  updated_at             timestamptz not null default now()
);

create table public.deposits (
  id                uuid primary key default gen_random_uuid(),
  donor_id          uuid not null references public.profiles (id) on delete restrict,
  item_type_id      uuid not null references public.item_types (id) on delete restrict,
  quantity          integer not null check (quantity > 0 and quantity <= 100000),
  total_amount_lkr  numeric(14, 2) not null default 0 check (total_amount_lkr >= 0),
  payment_method    public.payment_method not null,
  reference_code    text not null unique
                    default ('V2C-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  bank_reference    text check (char_length(bank_reference) <= 120),
  receipt_image_url text check (char_length(receipt_image_url) <= 500), -- storage path in bucket "receipts"
  status            public.deposit_status not null default 'pending',
  admin_notes       text check (char_length(admin_notes) <= 1000),
  reviewed_by       uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz
);
create index deposits_donor_item_idx on public.deposits (donor_id, item_type_id) where status = 'approved';
create index deposits_status_idx on public.deposits (status, created_at desc);

create table public.distributions (
  id               uuid primary key default gen_random_uuid(),
  donor_id         uuid not null references public.profiles (id) on delete restrict,
  item_type_id     uuid not null references public.item_types (id) on delete restrict,
  quantity         integer not null check (quantity > 0 and quantity <= 100000),
  students_reached integer not null default 1 check (students_reached > 0),
  school_name      text not null check (char_length(school_name) between 1 and 200),
  village_name     text not null check (char_length(village_name) between 1 and 200),
  district         text check (char_length(district) <= 80),
  student_grade    text check (char_length(student_grade) <= 40),
  photo_proof_url  text check (char_length(photo_proof_url) <= 500), -- storage path in bucket "proofs"
  recorded_by      uuid references auth.users (id),
  distributed_at   date not null default current_date,
  created_at       timestamptz not null default now()
);
create index distributions_donor_item_idx on public.distributions (donor_id, item_type_id);
create index distributions_recent_idx on public.distributions (distributed_at desc, created_at desc);

-- Bilingual in-app notifications (deposit reviews, distributions)
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,
  title_en   text not null,
  title_ta   text not null,
  body_en    text not null default '',
  body_ta    text not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Role helper (SECURITY DEFINER: avoids RLS recursion, never trusts JWT metadata)
-- ---------------------------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(), 'admin') $$;

-- ---------------------------------------------------------------------
-- Balance helpers
-- ---------------------------------------------------------------------
create or replace function public.item_balance(_donor uuid, _item uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select (
    coalesce((select sum(quantity) from public.deposits
              where donor_id = _donor and item_type_id = _item and status = 'approved'), 0)
    -
    coalesce((select sum(quantity) from public.distributions
              where donor_id = _donor and item_type_id = _item), 0)
  )::integer
$$;
revoke execute on function public.item_balance(uuid, uuid) from public, anon;

create or replace function public.qualifying_quantity(_donor uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(d.quantity), 0)::integer
  from public.deposits d
  join public.item_types it on it.id = d.item_type_id
  where d.donor_id = _donor and d.status = 'approved' and it.is_membership_qualifier
$$;
revoke execute on function public.qualifying_quantity(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- New user bootstrap: profile + 'donor' role ONLY (never admin)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  cats text[];
  lang public.app_language;
begin
  select coalesce(array_agg(left(x, 60)), '{}')
    into cats
    from (select jsonb_array_elements_text(
            case when jsonb_typeof(meta -> 'membership_categories') = 'array'
                 then meta -> 'membership_categories' else '[]'::jsonb end) as x
          limit 13) s;

  lang := case when meta ->> 'preferred_language' = 'ta' then 'ta' else 'en' end;

  insert into public.profiles (
    id, full_name, email, whatsapp_number, school_attended, district, full_address,
    occupation, referral_source, membership_categories, account_opening_reason, preferred_language
  ) values (
    new.id,
    left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 120),
    left(coalesce(new.email, ''), 254),
    left(meta ->> 'whatsapp_number', 32),
    left(meta ->> 'school_attended', 160),
    left(meta ->> 'district', 80),
    left(meta ->> 'full_address', 400),
    left(meta ->> 'occupation', 120),
    left(meta ->> 'referral_source', 160),
    cats,
    left(meta ->> 'account_opening_reason', 1000),
    lang
  ) on conflict (id) do nothing;

  -- Ordinary sign-up is always a donor. Admins are granted by SQL only.
  insert into public.user_roles (user_id, role) values (new.id, 'donor')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Profile guard: users cannot rewrite id/email/created_at
-- ---------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if not public.is_admin() then
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------
-- Deposit guard: server computes price, donors can only create 'pending'
-- ---------------------------------------------------------------------
create or replace function public.deposits_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  price numeric;
  is_active boolean;
  avail integer;
begin
  if tg_op = 'INSERT' then
    select unit_price_lkr, active into price, is_active
      from public.item_types where id = new.item_type_id;
    if price is null or not is_active then
      raise exception 'Item type is not available for deposits' using errcode = 'P0001';
    end if;
    new.total_amount_lkr := round(price * new.quantity, 2);
    new.created_at := now();
    if not public.is_admin() then
      new.status := 'pending';
      new.admin_notes := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.reference_code := 'V2C-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    end if;
    return new;
  end if;

  -- UPDATE: immutable financial facts
  new.id := old.id;
  new.donor_id := old.donor_id;
  new.created_at := old.created_at;
  new.reference_code := old.reference_code;

  if new.item_type_id <> old.item_type_id or new.quantity <> old.quantity then
    if old.status <> 'pending' then
      raise exception 'Only pending deposits can change item or quantity' using errcode = 'P0001';
    end if;
    select unit_price_lkr into price from public.item_types where id = new.item_type_id;
    new.total_amount_lkr := round(price * new.quantity, 2);
  end if;

  if new.status <> old.status then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
    -- Un-approving must not drive the donor's balance negative
    if old.status = 'approved' then
      perform pg_advisory_xact_lock(hashtextextended(old.donor_id::text || old.item_type_id::text, 0));
      avail := public.item_balance(old.donor_id, old.item_type_id);
      if avail - old.quantity < 0 then
        raise exception 'Cannot revoke: % of these items were already distributed', (old.quantity - avail)
          using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger deposits_before_write before insert or update on public.deposits
  for each row execute function public.deposits_before_write();

-- ---------------------------------------------------------------------
-- Distribution guard: NEVER exceed the donor's confirmed balance.
-- Serialised per donor+item with an advisory lock to stop races.
-- ---------------------------------------------------------------------
create or replace function public.distributions_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  avail integer;
begin
  -- Defence in depth (RLS also blocks): only admins / service role record distributions
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.created_at := old.created_at;
    if new.donor_id <> old.donor_id or new.item_type_id <> old.item_type_id then
      raise exception 'Donor and item of a distribution cannot be changed' using errcode = 'P0001';
    end if;
  else
    new.recorded_by := coalesce(new.recorded_by, auth.uid());
    new.created_at := now();
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.donor_id::text || new.item_type_id::text, 0));
  avail := public.item_balance(new.donor_id, new.item_type_id);
  if tg_op = 'UPDATE' then
    avail := avail + old.quantity;
  end if;

  if new.quantity > avail then
    raise exception 'Insufficient balance: donor has % available, tried to distribute %', avail, new.quantity
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger distributions_before_write before insert or update on public.distributions
  for each row execute function public.distributions_before_write();

-- ---------------------------------------------------------------------
-- Notifications (bilingual)
-- ---------------------------------------------------------------------
create or replace function public.notify_deposit_review()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  it public.item_types;
begin
  if new.status = old.status or new.status = 'pending' then
    return new;
  end if;
  select * into it from public.item_types where id = new.item_type_id;
  if new.status = 'approved' then
    insert into public.notifications (user_id, kind, title_en, title_ta, body_en, body_ta)
    values (new.donor_id, 'deposit_approved',
      'Deposit approved: ' || new.quantity || ' × ' || it.name_en,
      'வைப்பு அங்கீகரிக்கப்பட்டது: ' || new.quantity || ' × ' || it.name_ta,
      'Reference ' || new.reference_code || ' has been credited to your item account.',
      'குறிப்பு ' || new.reference_code || ' உங்கள் பொருள் கணக்கில் வரவு வைக்கப்பட்டது.');
  else
    insert into public.notifications (user_id, kind, title_en, title_ta, body_en, body_ta)
    values (new.donor_id, 'deposit_rejected',
      'Deposit not approved: ' || new.reference_code,
      'வைப்பு அங்கீகரிக்கப்படவில்லை: ' || new.reference_code,
      coalesce(new.admin_notes, 'Please contact the club for details.'),
      coalesce(new.admin_notes, 'விவரங்களுக்கு கழகத்தைத் தொடர்பு கொள்ளவும்.'));
  end if;
  return new;
end;
$$;
create trigger deposits_notify after update of status on public.deposits
  for each row execute function public.notify_deposit_review();

create or replace function public.notify_distribution()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  it public.item_types;
begin
  select * into it from public.item_types where id = new.item_type_id;
  insert into public.notifications (user_id, kind, title_en, title_ta, body_en, body_ta)
  values (new.donor_id, 'distribution',
    new.quantity || ' × ' || it.name_en || ' reached ' || new.school_name,
    new.quantity || ' × ' || it.name_ta || ' ' || new.school_name || ' பாடசாலையை அடைந்தது',
    'Delivered in ' || new.village_name || '. Thank you for changing a student''s day.',
    new.village_name || ' இல் வழங்கப்பட்டது. ஒரு மாணவரின் நாளை மாற்றியதற்கு நன்றி.');
  return new;
end;
$$;
create trigger distributions_notify after insert on public.distributions
  for each row execute function public.notify_distribution();

-- ---------------------------------------------------------------------
-- Views (security_invoker => caller's RLS applies)
-- ---------------------------------------------------------------------
create view public.donor_item_balances
with (security_invoker = true) as
select
  p.id as donor_id,
  it.id as item_type_id,
  it.slug,
  it.name_en,
  it.name_ta,
  it.is_membership_qualifier,
  coalesce(dep.approved, 0)::integer    as approved_quantity,
  coalesce(dep.pending, 0)::integer     as pending_quantity,
  coalesce(dist.distributed, 0)::integer as distributed_quantity,
  (coalesce(dep.approved, 0) - coalesce(dist.distributed, 0))::integer as available_quantity
from public.profiles p
cross join public.item_types it
left join (
  select donor_id, item_type_id,
         sum(quantity) filter (where status = 'approved') as approved,
         sum(quantity) filter (where status = 'pending')  as pending
  from public.deposits group by donor_id, item_type_id
) dep on dep.donor_id = p.id and dep.item_type_id = it.id
left join (
  select donor_id, item_type_id, sum(quantity) as distributed
  from public.distributions group by donor_id, item_type_id
) dist on dist.donor_id = p.id and dist.item_type_id = it.id;

create view public.donor_membership
with (security_invoker = true) as
select
  p.id as donor_id,
  public.qualifying_quantity(p.id) as qualifying_quantity,
  s.membership_threshold,
  public.qualifying_quantity(p.id) >= s.membership_threshold as is_member
from public.profiles p
cross join public.app_settings s;

-- ---------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------
create or replace function public.review_deposit(_deposit_id uuid, _approve boolean, _notes text default null)
returns public.deposits
language plpgsql security definer set search_path = public
as $$
declare
  result public.deposits;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  if not _approve and coalesce(btrim(_notes), '') = '' then
    raise exception 'A reason is required to reject a deposit' using errcode = 'P0001';
  end if;
  update public.deposits
     set status = case when _approve then 'approved'::public.deposit_status else 'rejected'::public.deposit_status end,
         admin_notes = nullif(btrim(left(_notes, 1000)), '')
   where id = _deposit_id and status = 'pending'
  returning * into result;
  if result.id is null then
    raise exception 'Deposit not found or already reviewed' using errcode = 'P0001';
  end if;
  return result;
end;
$$;
revoke execute on function public.review_deposit(uuid, boolean, text) from public, anon;
grant execute on function public.review_deposit(uuid, boolean, text) to authenticated;

create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'items_banked',       (select coalesce(sum(quantity), 0) from deposits where status = 'approved'),
    'items_distributed',  (select coalesce(sum(quantity), 0) from distributions),
    'items_pending',      (select coalesce(sum(quantity), 0) from deposits where status = 'pending'),
    'deposits_pending',   (select count(*) from deposits where status = 'pending'),
    'value_banked_lkr',   (select coalesce(sum(total_amount_lkr), 0) from deposits where status = 'approved'),
    'donors',             (select count(*) from profiles),
    'members',            (select count(*) from donor_membership where is_member),
    'students_reached',   (select coalesce(sum(students_reached), 0) from distributions)
  );
end;
$$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- ---------------------------------------------------------------------
-- Public transparency RPCs (anonymised: no donor identities, no photos)
-- ---------------------------------------------------------------------
create or replace function public.public_stats()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'items_donated',     (select coalesce(sum(quantity), 0) from deposits where status = 'approved'),
    'items_distributed', (select coalesce(sum(quantity), 0) from distributions),
    'students_supported',(select coalesce(sum(students_reached), 0) from distributions),
    'schools_reached',   (select count(distinct lower(school_name)) from distributions),
    'active_members',    (select count(*) from donor_membership where is_member),
    'donors',            (select count(*) from profiles)
  )
$$;
grant execute on function public.public_stats() to anon, authenticated;

create or replace function public.public_feed(_limit integer default 20)
returns table (
  event_type text, quantity integer, item_name_en text, item_name_ta text,
  school_name text, village_name text, district text, happened_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select * from (
    select 'deposit'::text, d.quantity, it.name_en, it.name_ta,
           null::text, null::text, p.district, d.reviewed_at
      from deposits d
      join item_types it on it.id = d.item_type_id
      join profiles p on p.id = d.donor_id
     where d.status = 'approved'
    union all
    select 'distribution'::text, x.quantity, it.name_en, it.name_ta,
           x.school_name, x.village_name, x.district, x.distributed_at::timestamptz
      from distributions x
      join item_types it on it.id = x.item_type_id
  ) feed
  order by 8 desc nulls last
  limit least(greatest(_limit, 1), 50)
$$;
grant execute on function public.public_feed(integer) to anon, authenticated;

-- Recent distributions. Photo paths only returned to signed-in users.
create or replace function public.recent_distributions(_limit integer default 6)
returns table (
  id uuid, quantity integer, item_name_en text, item_name_ta text, school_name text,
  village_name text, district text, student_grade text, distributed_at date, photo_proof_url text
)
language sql stable security definer set search_path = public
as $$
  select x.id, x.quantity, it.name_en, it.name_ta, x.school_name, x.village_name, x.district,
         x.student_grade, x.distributed_at,
         case when auth.uid() is not null then x.photo_proof_url end
    from distributions x
    join item_types it on it.id = x.item_type_id
   order by x.distributed_at desc, x.created_at desc
   limit least(greatest(_limit, 1), 24)
$$;
grant execute on function public.recent_distributions(integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.user_roles    enable row level security;
alter table public.item_types    enable row level security;
alter table public.app_settings  enable row level security;
alter table public.deposits      enable row level security;
alter table public.distributions enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- user_roles: read own; no client writes (admins promoted via SQL / service role)
create policy "roles: read own or admin" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- item_types: public catalogue; admin maintains
create policy "items: public read" on public.item_types
  for select to anon, authenticated using (true);
create policy "items: admin insert" on public.item_types
  for insert to authenticated with check (public.is_admin());
create policy "items: admin update" on public.item_types
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- app_settings: public read (bank instructions), admin update
create policy "settings: public read" on public.app_settings
  for select to anon, authenticated using (true);
create policy "settings: admin update" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- deposits
create policy "deposits: read own or admin" on public.deposits
  for select to authenticated using (donor_id = auth.uid() or public.is_admin());
create policy "deposits: donor creates own pending" on public.deposits
  for insert to authenticated with check (
    (donor_id = auth.uid() and status = 'pending') or public.is_admin());
create policy "deposits: donor edits own pending, admin all" on public.deposits
  for update to authenticated
  using ((donor_id = auth.uid() and status = 'pending') or public.is_admin())
  with check ((donor_id = auth.uid() and status = 'pending') or public.is_admin());
create policy "deposits: donor withdraws own pending" on public.deposits
  for delete to authenticated using (donor_id = auth.uid() and status = 'pending');

-- distributions: donors see their own impact; only admins record
create policy "distributions: read own or admin" on public.distributions
  for select to authenticated using (donor_id = auth.uid() or public.is_admin());
create policy "distributions: admin insert" on public.distributions
  for insert to authenticated with check (public.is_admin());
create policy "distributions: admin update" on public.distributions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "distributions: admin delete" on public.distributions
  for delete to authenticated using (public.is_admin());

-- notifications
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: mark own read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Grants (Supabase defaults are broad; tighten the sensitive ones)
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
revoke all on public.profiles, public.deposits, public.distributions, public.notifications from anon;
revoke insert, delete on public.profiles from authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.deposits, public.distributions to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.item_types, public.app_settings to anon, authenticated;
grant insert, update on public.item_types to authenticated;
grant update on public.app_settings to authenticated;
revoke all on public.donor_item_balances, public.donor_membership from anon;
grant select on public.donor_item_balances, public.donor_membership to authenticated;

-- Donors may only change these columns on a pending deposit
revoke update on public.deposits from authenticated;
grant update (item_type_id, quantity, payment_method, bank_reference, receipt_image_url, status)
  on public.deposits to authenticated;

-- ---------------------------------------------------------------------
-- Storage buckets
-- receipts/<donor_uid>/<file>   private: owner + admins
-- proofs/<distribution_id>/<file> signed-in donors + admins; admins write
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('receipts', 'receipts', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('proofs',   'proofs',   false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "receipts: owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts: owner or admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "receipts: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "proofs: authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'proofs');
create policy "proofs: admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'proofs' and public.is_admin());
create policy "proofs: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'proofs' and public.is_admin());
create policy "proofs: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'proofs' and public.is_admin());

-- ---------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------
insert into public.app_settings (id) values (true) on conflict do nothing;

insert into public.item_types (slug, name_en, name_ta, unit_price_lkr, is_membership_qualifier, sort_order) values
  ('exercise-books',  'Exercise Books',               'பயிற்சிப் புத்தகங்கள்',          250,   true,  1),
  ('textbooks',       'Textbooks',                    'பாடப் புத்தகங்கள்',              900,   false, 2),
  ('pen-pencil-sets', 'Pen/Pencil Sets',              'பேனா/பென்சில் தொகுதிகள்',        350,   false, 3),
  ('school-bags',     'School Bags',                  'பாடசாலைப் பைகள்',               3500,  false, 4),
  ('math-sets',       'Mathematical Instrument Sets', 'கணித உபகரணத் தொகுதிகள்',         650,   false, 5),
  ('edu-tools',       'Educational Tools',            'கல்வி உபகரணங்கள்',              1500,  false, 6),
  ('music',           'Musical Instruments',          'இசைக் கருவிகள்',                12000, false, 7)
on conflict (slug) do nothing;
