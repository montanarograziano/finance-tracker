# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** action on this repository's Security tab and include:

- the affected flow or file;
- reproduction steps;
- the expected impact;
- any suggested mitigation.

Do not include real financial data, credentials, or access tokens in a report.

## Supported version

Security fixes target the latest commit on `main`. This personal project does not currently maintain older release branches.

## Deployment responsibility

Deployers must keep dependencies updated, protect Supabase administrative credentials, apply all database migrations, configure production authentication controls, and use HTTPS. Only the Supabase anon key belongs in `VITE_*` environment variables; service-role keys must never be exposed to the frontend.

## The hosted instance is a shared, real Supabase project

<https://montanarograziano.github.io/finance-tracker/> is not a demo or sandbox: it points at the owner's own Supabase project, on the free tier, with open signups. Anyone who registers there stores real financial records in that same project, alongside the owner's own data and every other stranger who has signed up. Postgres row-level security (see README) is the only boundary between accounts — there is no per-user database or per-user project. This is a deliberate trade-off of a deploy-it-yourself hobby project being made publicly reachable, not a bug; if you want your data isolated in infrastructure only you control, clone the repo and deploy your own instance instead of using the hosted one.

### Capacity guard

`supabase/migrations/20260825000000_capacity_guard.sql` adds an in-database kill switch so a flood of strangers cannot fill the free-tier project (500 MB database, 50,000 MAU) or push it into Supabase's own restricted/read-only state. A `BEFORE INSERT` trigger on `auth.users` refuses new signups once the project nears its configured user or database-size cap, or when the owner flips a manual `signups_enabled` override to `false`. It only blocks account _creation_; existing users can always sign in.

To inspect current usage (Supabase SQL editor, service-role/owner access only):

```sql
select * from public.capacity_status();
```

To close signups immediately, for any reason:

```sql
update public.app_limits set signups_enabled = false, updated_at = now();
```

Read the migration file for the exact caps chosen, why, and an explicit list of what this guard does **not** cover: egress/bandwidth (a public site can burn the 5 GB/month free-tier quota through reads alone, with no new signups), Supabase Auth's own rate limits, and cost. On the point of cost: Supabase's Free Plan cannot be billed for overage usage (verified against current Supabase billing docs) — exceeding a quota gets the project restricted (read-only mode, pausing, or blocked API requests), not invoiced. The risk this guard manages is therefore **downtime for the owner's own use of the app**, not a surprise bill.

### GDPR note (not legal advice)

The deployer of the hosted instance is based in Italy (EU). Running a public instance that stores other people's financial records, under the deployer's own Supabase project and control, plausibly makes the deployer a data controller under the GDPR for that data — with obligations around a legal basis for processing, transparency, data subject rights (access, deletion), and breach notification. This has not been assessed and this document is not legal advice.

The Settings page provides self-service account deletion. `public.delete_own_account()` derives the row id from the caller's authenticated JWT, deletes only that `auth.users` row, and relies on `on delete cascade` foreign keys to erase every account, category, transaction, investment, recurring rule, and recurring exception in the same database transaction. It accepts no user id parameter and exposes no service-role key to the browser. The local session and its private query cache are cleared after the RPC succeeds.

Self-service deletion closes the immediate data-erasure gap, but not the broader transparency obligations above. A plain-language privacy notice should still state what is stored, the Supabase project region, retention while an account exists, and that deletion is permanent. Deciding whether that is sufficient, or whether a fuller privacy policy or DPA-level review is needed, is a decision for the deployer, ideally with actual legal advice — not something this document or this codebase can resolve.
