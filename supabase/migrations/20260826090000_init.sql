-- MkulimaLink — initial schema
--
-- Design notes that are load-bearing, so they live next to the SQL rather than
-- only in the README:
--
-- 1. A *profile* is a market participant. It is not keyed on auth.users, because
--    more than half the farmers here registered over USSD from a feature phone
--    and have no email and no password. `profiles.user_id` is therefore nullable:
--    it is the link to a login, when one exists.
--
-- 2. Staff is a flag on a profile, not a third role. An operator is not a third
--    kind of market participant, and an operator may well also be a farmer.
--
-- 3. The staff allowlist lives in `staff_emails` — a table only a security
--    definer trigger reads. This replaces the client-side email list, which
--    shipped in the bundle and could be edited in any browser.
--
-- 4. Money is whole shillings in bigint. The farmer is paid `amount`; the buyer
--    pays a 6% fee on top. That rule is a generated column, not a convention.

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

create type public.account_role as enum ('farmer', 'buyer');

-- Every state has an operator action attached to it. `pending` is the expected
-- first state of every account, not a fault.
create type public.account_state as enum ('pending', 'active', 'limited', 'suspended');

-- How the account was created. Kept because it changes how support reaches the
-- person: a USSD signup cannot see a web page and has to be sent prices by SMS.
create type public.signup_channel as enum ('ussd', 'android', 'web');

create type public.listing_status as enum ('open', 'committed', 'settled', 'withdrawn', 'stopped');

-- Two severities, not a 1-5 scale: either a lot can keep trading while someone
-- checks it, or it cannot. That is the only distinction the queue acts on.
create type public.flag_severity as enum ('review', 'urgent');

create type public.settlement_state as enum ('held', 'releasing', 'paid', 'failed');

create type public.health_state as enum ('ok', 'warning', 'critical');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- The buyer's fee, as a function so the 6% exists in exactly one place and can
-- be referenced from generated columns and views alike. Immutable because a
-- stored generated column requires it.
create or replace function public.buyer_fee(p_amount bigint)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select round(p_amount * 0.06)::bigint;
$$;

comment on function public.buyer_fee(bigint) is
  'Platform fee charged to the buyer on top of the farmer''s payout. Never deducted from it.';

-- ---------------------------------------------------------------------------
-- Reference data
--
-- Small, changes almost never, but real tables so listings and board rows can
-- carry foreign keys instead of free text. The client keeps its own copy in
-- src/data/catalog.js; supabase/seed.sql is generated from that file, so the two
-- cannot drift silently.
-- ---------------------------------------------------------------------------

create table public.units (
  id text primary key,
  label text not null,
  short_label text not null,
  -- The kilograms in one unit. A mismatch here is how a deal goes wrong, so it
  -- is stored rather than assumed: a crate of tomatoes is 64 kg, a gunia is 90.
  kg numeric(6, 2) not null check (kg > 0)
);

create table public.grades (
  id text primary key,
  label text not null,
  note text not null,
  sort_order int not null
);

create table public.crops (
  id text primary key,
  name text not null,
  category text not null,
  unit_id text not null references public.units (id),
  sort_order int not null
);

create table public.counties (
  -- Natural key: the county name is what a farmer says and what the UI filters
  -- on, and it is stable. A surrogate id would buy nothing here.
  name text primary key
);

create table public.reference_markets (
  id text primary key,
  name text not null,
  city text not null
);

-- ---------------------------------------------------------------------------
-- Participants
-- ---------------------------------------------------------------------------

-- Account numbers carry on from the seeded range (u-1145 … u-1189), so a real
-- signup gets u-1190 and the series stays continuous.
create sequence public.account_no_seq as bigint start with 1190;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),

  -- Null for accounts that never had a login. See note 1 at the top of the file.
  user_id uuid unique references auth.users (id) on delete set null,

  account_no text unique not null default 'u-' || nextval('public.account_no_seq'),
  name text not null check (length(btrim(name)) > 0),
  email text,
  role public.account_role not null default 'farmer',

  -- Separate from `role` deliberately. See note 2.
  is_staff boolean not null default false,

  county text references public.counties (name),
  channel public.signup_channel not null default 'web',
  state public.account_state not null default 'pending',
  phone text,

  -- Maintained counters, not the source of truth — `settlements` is. In
  -- production a trigger on settlement would keep these current; the seed sets
  -- them directly.
  deals int not null default 0 check (deals >= 0),
  gmv bigint not null default 0 check (gmv >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.user_id is
  'Link to a login, when the account has one. Null for USSD registrations.';

create index profiles_created_at_idx on public.profiles (created_at desc);
create index profiles_county_idx on public.profiles (county);
-- The queue that actually blocks people from trading.
create index profiles_pending_idx on public.profiles (created_at)
  where state = 'pending';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- The allowlist. Only the signup trigger and a service-role connection read it;
-- see note 3. Rows must be lowercase so the comparison is unambiguous.
create table public.staff_emails (
  email text primary key check (email = lower(email)),
  note text,
  added_at timestamptz not null default now()
);

comment on table public.staff_emails is
  'Emails that receive profiles.is_staff on signup. Server-side only — never read by the client.';

-- ---------------------------------------------------------------------------
-- Whether the person asking is an operator.
--
-- security definer so the lookup bypasses RLS on profiles. Without that, a
-- policy on profiles that calls this function would query profiles and recurse
-- forever. search_path is emptied and every name qualified, so the function
-- cannot be redirected by a caller-controlled search_path.
-- ---------------------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_staff
  );
$$;

-- The caller's own profile id, for policies that compare against it.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- New signups become profiles
--
-- The role cast is written as a case rather than `::public.account_role`, because
-- an unexpected value in client-supplied metadata would raise and take the whole
-- signup down with it.
--
-- An operator lands `active` rather than `pending`. `is_staff()` ignores `state`,
-- so it would work either way — but a pending operator sits in the ID queue on
-- their own dashboard, waiting for themselves.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff boolean;
begin
  v_staff := exists (
    select 1 from public.staff_emails s where s.email = lower(new.email)
  );

  insert into public.profiles (user_id, name, email, role, channel, state, is_staff)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, 'account'), '@', 1)
    ),
    new.email,
    case new.raw_user_meta_data ->> 'role'
      when 'buyer' then 'buyer'::public.account_role
      else 'farmer'::public.account_role
    end,
    'web',
    case when v_staff then 'active'::public.account_state else 'pending'::public.account_state end,
    v_staff
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Lots
-- ---------------------------------------------------------------------------

create sequence public.lot_no_seq as bigint start with 2842;

create table public.listings (
  -- A lot number is a real business identifier: it is printed on the collection
  -- note and quoted on the phone. It is the primary key rather than a uuid the
  -- farmer would have to read out.
  id text primary key default 'lot-' || nextval('public.lot_no_seq'),

  farmer_id uuid references public.profiles (id) on delete set null,

  -- Denormalised so a lot survives its account being deleted, and so the seeded
  -- demo lots — whose farmers have no auth user — can exist without inventing
  -- fake links.
  farmer_name text not null,
  farmer_lots int not null default 0 check (farmer_lots >= 0),
  farmer_rating numeric(2, 1) check (farmer_rating between 0 and 5),

  crop_id text not null references public.crops (id),
  grade_id text not null references public.grades (id),

  quantity int not null check (quantity > 0),
  -- Whole shillings per unit, paid to the farmer.
  price int not null check (price > 0),

  county text not null references public.counties (name),
  ward text not null,
  ready_in_days int not null default 0 check (ready_in_days >= 0),

  status public.listing_status not null default 'open',
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_open_idx on public.listings (created_at desc)
  where status = 'open';
create index listings_crop_idx on public.listings (crop_id);
create index listings_farmer_idx on public.listings (farmer_id);

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The board
--
-- One row per crop per trading day. Storing the history as rows rather than
-- generating it means the 14-day trend and the 24-hour change are both read off
-- real data, and `change` never has to be stored — it is yesterday's row.
-- ---------------------------------------------------------------------------

create table public.board_prices (
  -- Kenya is UTC+3 with no daylight saving, so the trading day is exact.
  board_date date not null default (now() at time zone 'Africa/Nairobi')::date,
  crop_id text not null references public.crops (id),

  -- What the farmer receives.
  price int not null check (price > 0),
  -- The going farm-gate offer from a broker for the same lot. The number the
  -- farmer already knows, which is what makes the first one mean anything.
  broker_price int not null check (broker_price > 0),

  primary key (board_date, crop_id)
);

create index board_prices_crop_idx on public.board_prices (crop_id, board_date desc);

-- ---------------------------------------------------------------------------
-- Money in flight
-- ---------------------------------------------------------------------------

create sequence public.settlement_no_seq as bigint start with 4472;

create table public.settlements (
  id text primary key default 'st-' || nextval('public.settlement_no_seq'),
  listing_id text references public.listings (id) on delete set null,

  farmer_name text not null,
  buyer_name text not null,

  -- Paid to the farmer, in full.
  amount bigint not null check (amount > 0),
  -- Charged to the buyer on top. A generated column so the rule cannot be
  -- forgotten by whatever writes the row.
  fee bigint generated always as (public.buyer_fee(amount)) stored,

  state public.settlement_state not null default 'held',
  mpesa_ref text,
  failure_reason text,

  opened_at timestamptz not null default now(),
  settled_at timestamptz,

  -- A settlement that claims to be paid needs a timestamp for when.
  constraint settlements_paid_has_timestamp
    check (state <> 'paid' or settled_at is not null)
);

create index settlements_state_idx on public.settlements (state, opened_at desc);
create index settlements_opened_idx on public.settlements (opened_at desc);

-- ---------------------------------------------------------------------------
-- Flagged lots
-- ---------------------------------------------------------------------------

create sequence public.flag_no_seq as bigint start with 119;

create table public.flags (
  id text primary key default 'flag-' || nextval('public.flag_no_seq'),
  listing_id text not null references public.listings (id) on delete cascade,

  -- The rule that caught it. "Flagged" on its own tells an operator nothing
  -- about what to do next.
  rule text not null,
  detail text not null,
  severity public.flag_severity not null default 'review',

  raised_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- Nulls out if the operator's own account is later removed. There is
  -- deliberately no `resolved_at is null or resolved_by is not null` check to go
  -- with it: the two together would make deleting a former operator fail on
  -- every flag they ever cleared.
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution text
);

-- The open queue, in the order it is worked: stopped lots first, then
-- longest-waiting.
create index flags_open_idx on public.flags (severity, raised_at)
  where resolved_at is null;

-- ---------------------------------------------------------------------------
-- Service health
--
-- The external probes live here so an operator sees a real reading. The check on
-- the database itself is deliberately *not* in this table — the client derives it
-- from its own connection state, because a monitor that lies about the one thing
-- it can actually see is worse than no monitor.
-- ---------------------------------------------------------------------------

create table public.system_checks (
  id text primary key,
  label text not null,
  state public.health_state not null default 'ok',
  detail text not null,
  meta text,
  sort_order int not null default 0,
  checked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operator audit
--
-- Anything an operator does to somebody else's account or lot is written here.
-- Insert-only: no policy grants update or delete, to anyone.
-- ---------------------------------------------------------------------------

create table public.admin_actions (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  subject text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_actions_created_idx on public.admin_actions (created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Every table is enabled. Where a table has no policy for a role, that role
-- cannot see it — which is the intent for staff_emails and admin_actions.
-- ---------------------------------------------------------------------------

alter table public.units enable row level security;
alter table public.grades enable row level security;
alter table public.crops enable row level security;
alter table public.counties enable row level security;
alter table public.reference_markets enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_emails enable row level security;
alter table public.listings enable row level security;
alter table public.board_prices enable row level security;
alter table public.settlements enable row level security;
alter table public.flags enable row level security;
alter table public.system_checks enable row level security;
alter table public.admin_actions enable row level security;

-- Reference data and the board are public: the landing page shows today's prices
-- to someone who has not signed in, and that is the point of the product.
create policy "reference is public" on public.units for select using (true);
create policy "reference is public" on public.grades for select using (true);
create policy "reference is public" on public.crops for select using (true);
create policy "reference is public" on public.counties for select using (true);
create policy "reference is public" on public.reference_markets for select using (true);
create policy "board is public" on public.board_prices for select using (true);

-- Open lots are public. Anything withdrawn, stopped or settled is visible only
-- to the farmer who posted it and to staff.
create policy "open lots are public" on public.listings
  for select using (status = 'open');

create policy "farmers see their own lots" on public.listings
  for select to authenticated using (farmer_id = public.current_profile_id());

create policy "staff see every lot" on public.listings
  for select to authenticated using (public.is_staff());

-- Only a verified account can post a lot. The registrations screen tells the
-- operator that a pending account "cannot post a lot or place a bid" — this is
-- what makes that true.
create policy "verified farmers post lots" on public.listings
  for insert to authenticated
  with check (
    farmer_id = public.current_profile_id()
    and exists (
      select 1 from public.profiles p
      where p.id = farmer_id
        and p.state = 'active'
        and p.role = 'farmer'
    )
  );

create policy "farmers edit their own lots" on public.listings
  for update to authenticated
  using (farmer_id = public.current_profile_id())
  with check (farmer_id = public.current_profile_id());

-- Profiles: your own row, or every row if you are staff.
create policy "read own profile" on public.profiles
  for select to authenticated using (user_id = auth.uid());

create policy "staff read every profile" on public.profiles
  for select to authenticated using (public.is_staff());

create policy "update own profile" on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Staff-only tables.
create policy "staff read flags" on public.flags
  for select to authenticated using (public.is_staff());

create policy "staff read settlements" on public.settlements
  for select to authenticated using (public.is_staff());

create policy "staff read health" on public.system_checks
  for select to authenticated using (public.is_staff());

create policy "staff read the audit log" on public.admin_actions
  for select to authenticated using (public.is_staff());

-- staff_emails gets no policy at all. Only the signup trigger (security
-- definer) and a service-role connection can read it.

-- ---------------------------------------------------------------------------
-- Column privileges
--
-- RLS decides which rows. It cannot decide which columns, and that gap is a
-- privilege escalation: with a plain "update your own row" policy and table-wide
-- update, any signed-in user could set is_staff = true on themselves.
--
-- So table-wide update is revoked and granted back column by column. State,
-- role, is_staff and the trade counters are changed by an operator through an
-- RPC that checks is_staff() — never by the account holder.
-- ---------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, phone, county) on public.profiles to authenticated;

revoke all on public.listings from anon, authenticated;
grant select on public.listings to anon, authenticated;
grant insert (farmer_id, farmer_name, crop_id, grade_id, quantity, price, county, ward, ready_in_days, note)
  on public.listings to authenticated;
grant update (quantity, price, ward, ready_in_days, note, status) on public.listings to authenticated;

revoke all on public.staff_emails from anon, authenticated;
revoke all on public.admin_actions from anon, authenticated;
grant select on public.admin_actions to authenticated;

revoke all on public.settlements from anon, authenticated;
grant select on public.settlements to authenticated;

revoke all on public.flags from anon, authenticated;
grant select on public.flags to authenticated;

revoke all on public.system_checks from anon, authenticated;
grant select on public.system_checks to authenticated;

grant select on public.units, public.grades, public.crops, public.counties,
  public.reference_markets, public.board_prices to anon, authenticated;

-- Sequences are driven by column defaults, which run as the table owner. No
-- client needs usage on them.
revoke all on sequence public.account_no_seq from anon, authenticated;
revoke all on sequence public.lot_no_seq from anon, authenticated;
revoke all on sequence public.settlement_no_seq from anon, authenticated;
revoke all on sequence public.flag_no_seq from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The board, as the interface reads it
-- ---------------------------------------------------------------------------

-- Today's board: every crop's latest price, the broker comparison, the lift over
-- the broker, and the move since the previous trading day.
create or replace function public.board_today()
returns table (
  crop_id text,
  crop_name text,
  category text,
  unit_short text,
  unit_kg numeric,
  board_date date,
  price int,
  broker_price int,
  uplift numeric,
  change numeric
)
language sql
stable
set search_path = ''
as $$
  with ranked as (
    select
      b.crop_id,
      b.board_date,
      b.price,
      b.broker_price,
      lag(b.price) over (partition by b.crop_id order by b.board_date) as previous_price,
      row_number() over (partition by b.crop_id order by b.board_date desc) as recency
    from public.board_prices b
  )
  select
    c.id,
    c.name,
    c.category,
    u.short_label,
    u.kg,
    r.board_date,
    r.price,
    r.broker_price,
    round((r.price - r.broker_price)::numeric / r.broker_price * 1000) / 10,
    case
      when r.previous_price is null or r.previous_price = 0 then 0
      else round((r.price - r.previous_price)::numeric / r.previous_price * 1000) / 10
    end
  from ranked r
  join public.crops c on c.id = r.crop_id
  join public.units u on u.id = c.unit_id
  where r.recency = 1
  order by c.sort_order;
$$;

-- The trend behind one row of the board.
create or replace function public.board_history(p_crop_id text, p_days int default 14)
returns table (board_date date, price int)
language sql
stable
set search_path = ''
as $$
  select b.board_date, b.price
  from public.board_prices b
  where b.crop_id = p_crop_id
    and b.board_date > (now() at time zone 'Africa/Nairobi')::date - p_days
  order by b.board_date;
$$;

-- ---------------------------------------------------------------------------
-- Operator reads
--
-- These are security definer functions rather than views, and each one raises if
-- the caller is not staff.
--
-- A view with security_invoker would have been the tidier option, but an
-- aggregate over a row-filtered table returns a *wrong number* to a non-staff
-- caller rather than an error — `count(*)` over zero visible rows is 0, not a
-- refusal — and a dashboard that silently under-reports is worse than one that
-- refuses to load. The same trap applies to `where public.is_staff()` inside an
-- aggregate, which is why every function below checks first and returns second.
-- ---------------------------------------------------------------------------

create or replace function public.require_staff()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'operator access required'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_people_summary()
returns table (
  total bigint,
  farmers bigint,
  buyers bigint,
  awaiting_id bigint,
  restricted bigint,
  ussd_share int,
  gmv bigint,
  counties_covered bigint,
  counties_total bigint,
  newest_joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return query
  select
    count(*),
    count(*) filter (where p.role = 'farmer'),
    count(*) filter (where p.role = 'buyer'),
    count(*) filter (where p.state = 'pending'),
    count(*) filter (where p.state in ('limited', 'suspended')),
    -- Share on feature phones: decides whether the SMS fallback can be retired.
    coalesce(round(count(*) filter (where p.channel = 'ussd') * 100.0 / nullif(count(*), 0)), 0)::int,
    coalesce(sum(p.gmv), 0)::bigint,
    count(distinct p.county),
    (select count(*) from public.counties),
    max(p.created_at)
  from public.profiles p;
end;
$$;

-- New accounts per calendar day over a window ending today. generate_series
-- supplies the days, so a day with no signups is a zero rather than a gap — a
-- chart that silently drops empty days misreports a quiet week as a busy one.
create or replace function public.admin_signups_by_day(p_days int default 14)
returns table (day date, farmers bigint, buyers bigint, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return query
  with bounds as (
    select
      (now() at time zone 'Africa/Nairobi')::date - (p_days - 1) as first_day,
      (now() at time zone 'Africa/Nairobi')::date as last_day
  ),
  days as (
    select generate_series(b.first_day, b.last_day, interval '1 day')::date as day
    from bounds b
  ),
  joined as (
    select
      (p.created_at at time zone 'Africa/Nairobi')::date as day,
      p.role
    from public.profiles p, bounds b
    where (p.created_at at time zone 'Africa/Nairobi')::date between b.first_day and b.last_day
  )
  select
    d.day,
    count(j.role) filter (where j.role = 'farmer'),
    count(j.role) filter (where j.role = 'buyer'),
    count(j.role)
  from days d
  left join joined j on j.day = d.day
  group by d.day
  order by d.day;
end;
$$;

-- Every county, including the ones with nobody in them yet: a county at zero is
-- the interesting number for a growth team, and dropping it hides the gap.
create or replace function public.admin_county_breakdown()
returns table (county text, total bigint, farmers bigint, buyers bigint, gmv bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return query
  select
    c.name,
    count(p.id),
    count(p.id) filter (where p.role = 'farmer'),
    count(p.id) filter (where p.role = 'buyer'),
    coalesce(sum(p.gmv), 0)::bigint
  from public.counties c
  left join public.profiles p on p.county = c.name
  group by c.name
  order by count(p.id) desc, c.name;
end;
$$;

create or replace function public.admin_ops_summary()
returns table (
  held bigint,
  releasing bigint,
  failed bigint,
  fees_today bigint,
  flags bigint,
  urgent_flags bigint,
  degraded bigint,
  open_lots bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return query
  select
    coalesce((select sum(s.amount) from public.settlements s where s.state = 'held'), 0)::bigint,
    coalesce((select sum(s.amount) from public.settlements s where s.state = 'releasing'), 0)::bigint,
    coalesce((select sum(s.amount) from public.settlements s where s.state = 'failed'), 0)::bigint,
    coalesce((
      select sum(s.fee) from public.settlements s
      where s.opened_at >= now() - interval '24 hours'
    ), 0)::bigint,
    (select count(*) from public.flags f where f.resolved_at is null),
    (select count(*) from public.flags f where f.resolved_at is null and f.severity = 'urgent'),
    (select count(*) from public.system_checks sc where sc.state <> 'ok'),
    (select count(*) from public.listings l where l.status = 'open');
end;
$$;

-- The registrations list. Phone numbers come back masked, because the screen
-- promises they are masked — doing it in the browser would still have shipped
-- forty-five full numbers to draw a table that hides them.
create or replace function public.admin_registrations()
returns table (
  id uuid,
  account_no text,
  name text,
  phone_masked text,
  role public.account_role,
  county text,
  channel public.signup_channel,
  state public.account_state,
  deals int,
  gmv bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return query
  select
    p.id,
    p.account_no,
    p.name,
    case
      when p.phone is null then null
      else left(p.phone, 4) || ' ··· ' || right(p.phone, 3)
    end,
    p.role,
    p.county,
    p.channel,
    p.state,
    p.deals,
    p.gmv,
    p.created_at
  from public.profiles p
  order by p.created_at desc;
end;
$$;

-- One account, with the full number. Opening a single record is a deliberate act
-- and is the only path to an unmasked phone.
create or replace function public.admin_account(p_id uuid)
returns table (
  id uuid,
  account_no text,
  name text,
  email text,
  phone text,
  role public.account_role,
  is_staff boolean,
  county text,
  channel public.signup_channel,
  state public.account_state,
  deals int,
  gmv bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return query
  select
    p.id, p.account_no, p.name, p.email, p.phone, p.role, p.is_staff,
    p.county, p.channel, p.state, p.deals, p.gmv, p.created_at
  from public.profiles p
  where p.id = p_id;
end;
$$;

-- The moderation queue, joined to the lot and to today's board so the operator
-- can check the rule's arithmetic rather than take it on trust.
create or replace function public.admin_moderation_queue()
returns table (
  id text,
  rule text,
  detail text,
  severity public.flag_severity,
  raised_at timestamptz,
  listing_id text,
  crop_name text,
  unit_short text,
  quantity int,
  price int,
  total_kg numeric,
  county text,
  ward text,
  farmer_name text,
  farmer_lots int,
  listing_status public.listing_status,
  board_price int,
  vs_board numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();

  return query
  select
    f.id, f.rule, f.detail, f.severity, f.raised_at,
    l.id, c.name, u.short_label, l.quantity, l.price,
    round(l.quantity * u.kg),
    l.county, l.ward, l.farmer_name, l.farmer_lots, l.status,
    b.price,
    case
      when b.price is null or b.price = 0 then null
      else round((l.price - b.price)::numeric / b.price * 1000) / 10
    end
  from public.flags f
  join public.listings l on l.id = f.listing_id
  join public.crops c on c.id = l.crop_id
  join public.units u on u.id = c.unit_id
  left join public.board_today() b on b.crop_id = l.crop_id
  where f.resolved_at is null
  -- Stopped lots first, then longest-waiting: the queue is worked top to bottom.
  order by (f.severity = 'urgent') desc, f.raised_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Operator writes
--
-- Staff changes go through functions, not table grants: a column grant applies
-- to the whole `authenticated` role, so there is no way to let an operator set
-- `state` without letting every account holder set their own. A function also
-- gives the audit log somewhere to be written from.
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_account_state(
  p_profile uuid,
  p_state public.account_state,
  p_reason text default null
)
returns public.account_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_before public.account_state;
begin
  perform public.require_staff();
  v_actor := public.current_profile_id();

  select p.state into v_before from public.profiles p where p.id = p_profile;
  if not found then
    raise exception 'no account %', p_profile using errcode = 'no_data_found';
  end if;

  update public.profiles set state = p_state where id = p_profile;

  insert into public.admin_actions (actor_id, action, subject, detail)
  values (
    v_actor, 'account.state', p_profile::text,
    jsonb_build_object('from', v_before, 'to', p_state, 'reason', p_reason)
  );

  return p_state;
end;
$$;

create or replace function public.admin_resolve_flag(
  p_flag text,
  p_resolution text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  perform public.require_staff();
  v_actor := public.current_profile_id();

  update public.flags
  set resolved_at = now(), resolved_by = v_actor, resolution = p_resolution
  where id = p_flag and resolved_at is null;

  if not found then
    raise exception 'no open flag %', p_flag using errcode = 'no_data_found';
  end if;

  insert into public.admin_actions (actor_id, action, subject, detail)
  values (v_actor, 'flag.resolve', p_flag, jsonb_build_object('resolution', p_resolution));
end;
$$;

-- Stops the lot trading and escalates the flag. One call, because doing half of
-- it is the failure an operator would not notice: a flag marked urgent while the
-- lot is still on the market.
create or replace function public.admin_stop_listing(
  p_flag text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_listing text;
begin
  perform public.require_staff();
  v_actor := public.current_profile_id();

  select f.listing_id into v_listing from public.flags f
  where f.id = p_flag and f.resolved_at is null;

  if v_listing is null then
    raise exception 'no open flag %', p_flag using errcode = 'no_data_found';
  end if;

  update public.flags set severity = 'urgent' where id = p_flag;
  update public.listings set status = 'stopped' where id = v_listing;

  insert into public.admin_actions (actor_id, action, subject, detail)
  values (
    v_actor, 'listing.stop', v_listing,
    jsonb_build_object('flag', p_flag, 'reason', p_reason)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute privileges
--
-- Default is EXECUTE to PUBLIC, which would hand anon the operator functions.
-- They all check is_staff(), but a locked door and a guard beats a guard.
-- ---------------------------------------------------------------------------

revoke execute on function
  public.is_staff(),
  public.current_profile_id(),
  public.require_staff(),
  public.admin_people_summary(),
  public.admin_signups_by_day(int),
  public.admin_county_breakdown(),
  public.admin_ops_summary(),
  public.admin_registrations(),
  public.admin_account(uuid),
  public.admin_moderation_queue(),
  public.admin_set_account_state(uuid, public.account_state, text),
  public.admin_resolve_flag(text, text),
  public.admin_stop_listing(text, text)
from public;

grant execute on function
  public.is_staff(),
  public.current_profile_id(),
  public.admin_people_summary(),
  public.admin_signups_by_day(int),
  public.admin_county_breakdown(),
  public.admin_ops_summary(),
  public.admin_registrations(),
  public.admin_account(uuid),
  public.admin_moderation_queue(),
  public.admin_set_account_state(uuid, public.account_state, text),
  public.admin_resolve_flag(text, text),
  public.admin_stop_listing(text, text)
to authenticated;

grant execute on function public.board_today(), public.board_history(text, int)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The first operator
--
-- No password here. The account is created by signing up through the normal
-- form; this only decides that the signup arrives with is_staff already set.
-- ---------------------------------------------------------------------------

insert into public.staff_emails (email, note)
values ('hojlundrashford@gmail.com', 'Initial operator')
on conflict (email) do nothing;

-- If that address already signed up before this migration ran, promote it now.
update public.profiles p
set is_staff = true, state = 'active'
from public.staff_emails s
where lower(p.email) = s.email
  and not p.is_staff;
