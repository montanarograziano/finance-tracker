-- Capacity guard for a public, open-signup instance on Supabase's free tier -----
--
-- Context: this project is deployed publicly and points at the owner's real,
-- single Supabase project (no per-deployer project is created; everyone who
-- visits the hosted Pages site shares this one database). Open signups are
-- allowed. Nothing before this migration stops a flood of signups, a scraper,
-- or a single heavy user from filling the free-tier database, so this
-- migration adds an in-database kill switch that trips *before* Supabase's
-- own enforcement does.
--
-- What this migration protects against: the two free-tier quotas that are
-- driven by data this app writes into Postgres -- Database Size (500 MB) and,
-- indirectly, Monthly Active Users (50,000 MAU, billed by login activity).
-- Both are checked at signup time below, with headroom under Supabase's own
-- ceiling (see the seed values further down for the exact numbers and why).
--
-- What this migration does NOT protect against (documented in full at the end
-- of this file, verified against supabase.com/docs on 2026-08-25):
--   - Egress/bandwidth (5 GB/month free-tier quota) -- a public site can burn
--     this from *reads* alone, with zero new signups. This guard only runs at
--     signup time and has no visibility into egress.
--   - Auth abuse below the signup threshold (password-guessing, OTP spam,
--     repeated failed logins) -- that is Supabase Auth's own rate limiting,
--     configured in the dashboard, not something a Postgres trigger can see.
--   - Money. Read the note at the bottom: Supabase's Free Plan cannot be
--     billed for overage. The real failure mode this guards against is
--     downtime (the project gets restricted), not a surprise invoice.

-- app_limits: single-row settings table, no RLS policies on purpose ----------
--
-- This table is intentionally invisible to the anon and authenticated Postgres
-- roles: RLS is enabled and zero policies are defined for it, which means
-- Postgres denies every row to every non-superuser, non-bypassrls role by
-- default (the deny-by-default behavior of RLS, not an oversight). Only the
-- service_role (which has `bypassrls`) and the Supabase SQL editor (which
-- connects as postgres, also `bypassrls`) can read or write it. This keeps
-- the caps and the manual kill switch out of reach of PostgREST entirely --
-- there is no anon-callable way to read or flip `signups_enabled`.
create table public.app_limits (
  -- Singleton pattern: the primary key can only ever be the literal value
  -- `true`, so a second row is a constraint violation, not a possibility to
  -- guard against in application code.
  id boolean primary key default true,
  constraint app_limits_is_singleton check (id),

  -- Registered-user cap (see seed comment below for the number and why).
  max_users integer not null check (max_users > 0),

  -- Database size cap in bytes, compared against pg_database_size(). See seed
  -- comment below for the number and why.
  max_database_bytes bigint not null check (max_database_bytes > 0),

  -- Manual override: the owner's "slam it shut" switch, independent of the
  -- numeric caps. Flip this to `false` at any time (see the one-liner in the
  -- owner-inspection section below) to stop signups immediately regardless of
  -- current usage, e.g. during an incident or before going on vacation.
  signups_enabled boolean not null default true,

  updated_at timestamptz not null default now()
);

alter table public.app_limits enable row level security;
-- No `create policy` statements follow. This is deliberate, not an
-- unfinished migration -- see the comment on the table above.

-- Seed values, sized for Supabase's free tier with real headroom -------------
--
-- Database size: the free tier's hard ceiling is 500 MB per project (source:
-- supabase.com/docs/guides/platform/billing-on-supabase, "Variable Usage Fees
-- and Quotas" table, checked 2026-08-25). This guard trips at 400 MB (80% of
-- the ceiling, ~100 MB of headroom) so the owner has time to react -- flip
-- `signups_enabled` off, prune data, or upgrade -- before Postgres itself
-- (via Supabase's Fair Use Policy restrictions) puts the database into
-- read-only mode. The 100 MB buffer is a guess at how fast usage can grow
-- between the periodic manual checks described below, not a measured rate;
-- tighten it if the instance gets busier than expected.
--
-- Max users: 2,000. This is a registered-account cap, not the MAU (Monthly
-- Active Users) count Supabase actually bills on -- Postgres has no view into
-- "active in this billing cycle" without extra bookkeeping this project does
-- not have, so registered-account count is the closest proxy available to a
-- plain trigger. 2,000 is chosen to sit 25x below the free tier's 50,000 MAU
-- ceiling, leaving enormous headroom on that axis, because the real
-- constraint for a personal finance tracker is database bytes, not user
-- count: each user's fixed footprint (the row in auth.users plus nine seeded
-- default categories) is a few KB, so 2,000 users of *just onboarding data*
-- is nowhere near 400 MB on its own. The byte cap above is expected to be the
-- one that actually fires first in practice; the user cap exists as a second,
-- independent line of defense in case a very large number of accounts get
-- created with little data each (e.g. a scripted signup flood), which the
-- byte cap alone would not catch quickly.
insert into public.app_limits (id, max_users, max_database_bytes, signups_enabled)
values (true, 2000, 400 * 1024 * 1024, true);

-- check_signup_capacity(): the gate itself ------------------------------------
--
-- SECURITY DEFINER with an explicit empty search_path: every identifier below
-- is schema-qualified (public.app_limits, auth.users, pg_catalog.*) so there
-- is no unqualified name for a malicious search_path to hijack. A SECURITY
-- DEFINER function owned by a superuser/table-owner with a mutable
-- search_path is a privilege-escalation hole -- Supabase's own Postgres
-- linter (the "function_search_path_mutable" check) flags exactly this
-- pattern, so this is not optional hardening.
--
-- What the client actually sees when this raises: GoTrue (Supabase Auth) runs
-- this trigger as part of its internal `CreateUser` transaction. When a
-- BEFORE INSERT trigger on auth.users raises, GoTrue does not forward the
-- Postgres exception message to the HTTP response -- it catches the failure
-- and returns its own generic 500 "Database error saving new user" (wording
-- per GoTrue's own error handling for signup-time database failures; exact
-- text can vary by GoTrue version). This was not verified against a live
-- Supabase project in this environment (no linked project/credentials here),
-- so treat the exact client-side message as "a generic signup failure",
-- confirmed against a real deployment before relying on its wording.
-- Concretely: the frontend (src/auth/AuthContext.tsx, src/auth/RegisterPage.tsx)
-- surfaces `error.message` from `supabase.auth.signUp()` verbatim, and that
-- message will be GoTrue's generic text, not "the app is at capacity" or
-- anything this migration's MESSAGE strings say. The distinguishable SQLSTATE
-- and message set below are for the owner reading Postgres logs, not for the
-- end user's screen -- there is no way for this app, as currently built, to
-- show a friendlier "we're full, try later" message, because the specific
-- reason never reaches supabase-js. Building that would require replacing the
-- BEFORE INSERT trigger with a pre-check server-side (e.g. an Edge Function
-- in front of signUp) that can inspect capacity and return a distinguishable
-- error before ever calling GoTrue -- out of scope for this migration.
--
-- Login is unaffected: this trigger is `BEFORE INSERT ON auth.users` only.
-- Signing in (`signInWithPassword`, OAuth callback, token refresh) never
-- inserts a row into auth.users -- it reads the existing row and updates
-- session/token bookkeeping -- so this trigger never fires on the login path.
-- Existing users can always sign in while the gate is closed; only account
-- *creation* is blocked.
create function public.check_signup_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limits public.app_limits%rowtype;
  v_user_count bigint;
  v_db_bytes bigint;
begin
  select * into v_limits from public.app_limits where id = true;

  if not found then
    -- Fail closed: if the settings row is ever deleted, refuse signups
    -- instead of silently allowing unbounded growth.
    raise exception using
      errcode = 'P0001',
      message = 'signup_capacity_guard: app_limits row missing, refusing signup';
  end if;

  if not v_limits.signups_enabled then
    raise exception using
      errcode = 'P0001',
      message = 'signup_capacity_guard: signups are disabled by the project owner';
  end if;

  select pg_catalog.count(*) into v_user_count from auth.users;
  if v_user_count >= v_limits.max_users then
    raise exception using
      errcode = 'P0001',
      message = 'signup_capacity_guard: user cap reached';
  end if;

  v_db_bytes := pg_catalog.pg_database_size(pg_catalog.current_database());
  if v_db_bytes >= v_limits.max_database_bytes then
    raise exception using
      errcode = 'P0001',
      message = 'signup_capacity_guard: database size cap reached';
  end if;

  return new;
end;
$$;

-- Trigger functions are invoked internally by the trigger machinery, not
-- called by role like a normal RPC, so they don't need PUBLIC execute rights
-- to fire. Revoke them anyway so this SECURITY DEFINER function can never be
-- called directly (e.g. as a PostgREST RPC) by anon/authenticated -- defense
-- in depth, matching Supabase's linter guidance for SECURITY DEFINER functions.
revoke execute on function public.check_signup_capacity() from public;

create trigger enforce_signup_capacity
  before insert on auth.users
  for each row execute function public.check_signup_capacity();

-- capacity_status(): cheap, owner-only visibility before the gate trips ------
--
-- SECURITY DEFINER for the same reason as above (it needs to read auth.users
-- and call pg_database_size, which anon/authenticated cannot do directly),
-- with the same empty search_path + full qualification, and execute revoked
-- from PUBLIC/anon/authenticated so this never becomes an anon-callable RPC.
-- Only service_role (and the SQL editor, connected as postgres) can call it.
create function public.capacity_status()
returns table (
  user_count          bigint,
  max_users           integer,
  user_pct            numeric,
  database_bytes      bigint,
  max_database_bytes  bigint,
  database_pct        numeric,
  signups_enabled     boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limits public.app_limits%rowtype;
  v_user_count bigint;
  v_db_bytes bigint;
begin
  select * into v_limits from public.app_limits where id = true;
  select pg_catalog.count(*) into v_user_count from auth.users;
  v_db_bytes := pg_catalog.pg_database_size(pg_catalog.current_database());

  return query select
    v_user_count,
    v_limits.max_users,
    pg_catalog.round(v_user_count::numeric / v_limits.max_users * 100, 1),
    v_db_bytes,
    v_limits.max_database_bytes,
    pg_catalog.round(v_db_bytes::numeric / v_limits.max_database_bytes * 100, 1),
    v_limits.signups_enabled;
end;
$$;

revoke execute on function public.capacity_status() from public;
grant execute on function public.capacity_status() to service_role;

-- Owner runbook ----------------------------------------------------------------
--
-- Check current usage against both caps (run in the Supabase SQL editor,
-- which connects as `postgres` and bypasses RLS -- this is not reachable from
-- the app):
--
--   select * from public.capacity_status();
--
-- Slam the gate shut immediately, regardless of the numeric caps (e.g. during
-- an incident, or preemptively before a traffic spike):
--
--   update public.app_limits set signups_enabled = false, updated_at = now();
--
-- Reopen it:
--
--   update public.app_limits set signups_enabled = true, updated_at = now();

-- What this guard does NOT do -- read this before assuming "capacity handled" -
--
-- 1. Egress (bandwidth). Free tier: 5 GB/month (supabase.com/docs, checked
--    2026-08-25). This is consumed by every SELECT response served to every
--    visitor, signed up or not -- a public read-heavy page (or a scraper
--    hammering the anon key, which is public by design in a client-side app)
--    can exhaust this with zero new rows written and zero new signups. This
--    migration has no mechanism to observe or limit egress; there isn't one
--    available from inside Postgres. Watch the organization's usage page
--    (supabase.com/dashboard/org/_/usage) manually.
--
-- 2. Auth rate limits (password-guessing, signup spam below the user cap,
--    OTP/email-send abuse). These are Supabase Auth (GoTrue) settings
--    configured in the dashboard (Authentication -> Rate Limits), independent
--    of this migration. This project's Turnstile CAPTCHA on signup (see
--    README) helps against scripted signups but is a frontend/Auth-level
--    control, not a database one.
--
-- 3. Money. Verified against supabase.com/docs/guides/platform/cost-control
--    (checked 2026-08-25): "you will not be charged while using the Free
--    Plan." Free Plan projects that exceed a quota get a grace period and
--    then Fair Use Policy restrictions (read-only mode, pausing, or a 402 on
--    every API request) -- not an invoice. This changes the framing of what
--    this whole migration is for: it is not cost protection (there is no
--    cost to protect against on the Free Plan), it is *availability*
--    protection -- keeping the owner's own use of the app working by making
--    sure a public flood of strangers cannot push the shared project into
--    Supabase's own restricted/read-only state first. Do not upgrade this
--    reasoning to "prevents a surprise bill" in any user-facing copy; it
--    prevents downtime, nothing more.
