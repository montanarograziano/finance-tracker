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
