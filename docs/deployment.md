# Deployment and operations

Target: `https://resmen.loyiham.uz` through the existing `tezbozor` SSH profile. The first production release was activated on 2026-10-03.

## Verified infrastructure and local evidence

Initial read-only inspection on 2026-09-16 found Node 22.22.1, active Nginx and loopback PostgreSQL on the shared Ubuntu server. No Resmen service/site/release existed; the HTTPS certificate did not cover this domain. Other sites must be preserved. Recheck these observations, port 3107, installed Nginx/systemd/Certbot versions and available disk before applying configuration.

Locally, all nine migrations applied to a separate empty PostgreSQL 18.6 database. A custom-format dump restored successfully into another empty database, yielding 44 public tables and nine migration journal entries. This verifies the mechanism against local schema; it is not a production backup, recovery drill with production data, or proof of offsite backup delivery.

The standalone build copies `public` and `.next/static`, then removes copied environment files and private development/test directories. Route tracing also excludes those paths, and the release command recursively rejects any remaining forbidden path. `pnpm start` loads local environment variables and resolves dev mail/upload paths before Next changes its working directory. Production runs the generated standalone server directly under systemd with an external environment file.

## Configuration still required

- A working SMTP host, TLS port, sender identity and credentials. Verified registration and password reset depend on this. Production rejects file mail. No SMTP delivery has been claimed/tested against an external provider.
- Private S3-compatible storage credentials/bucket are still optional future infrastructure. The current single-server deployment uses the persistent private path `/var/lib/ravoq/uploads`; all accesses still pass through publication/membership checks. Do not expose a future bucket publicly or grant anonymous listing.
- Actual payment provider selection if online charging is required. Current billing is an audited manual subscription/payment ledger; it does not charge cards or process provider webhooks.
- Business sender/contact/legal identity and final brand clearance. Current branding is a working original identity, not a trademark clearance.

Keep secrets in `/etc/ravoq/app.env`, owned by root and readable only by the application group (`0640`). Use `deploy/production.env.example` as the field reference, never as real credentials. Generate a unique auth secret with a cryptographic generator. Do not put any server credential in `NEXT_PUBLIC_*`, source, archives or terminal output.

## Build and release

1. Use Node 22 and pnpm 10.33.3. Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Tests need a disposable PostgreSQL database; integration tests intentionally skip non-loopback URLs.
2. Run `PLAYWRIGHT_BROWSERS_PATH=.local/browsers E2E_PRODUCTION=1 pnpm test:e2e` after installing Chromium to that path. No dev server may be running during a build.
3. Run `pnpm release`. It writes an explicit-allowlist archive and SHA-256 file into private `.local/releases`. Verify the digest after upload. The archive excludes `.env`, development mail, uploads, tests/results and Git metadata.
4. Extract to `/srv/ravoq/releases/<release-id>`, not over the current release. Keep release files root-owned/read-only; create its `.next/standalone/.next/cache` writable by the dedicated `ravoq` user. Install lockfile-pinned dependencies for migration/maintenance tools in the release (`pnpm install --frozen-lockfile`); the runtime itself uses its bundled dependencies.
5. Provision a dedicated unprivileged `ravoq` system user and a dedicated database. Use separate database migration and runtime roles. Migrate with the trusted migration role using `node --env-file=/etc/ravoq/migrator.env --import=tsx scripts/migrate.ts`. No `drizzle-kit push` or hand-edited production tables.
6. Grant the runtime role only connect/schema usage and required table operations. Health checks also require `USAGE` on the `drizzle` schema and `SELECT` on `drizzle.__drizzle_migrations`. Keep `audit_log`, `order_event` and `template_revision` append-only to the runtime role (SELECT/INSERT, no UPDATE/DELETE), and grant future migrations explicitly. The maintenance role additionally needs bounded DELETE on `analytics_event`, `request_limit` and pending `media_asset`. A separate maintenance environment file should carry that role.
7. For an existing installation, take and verify a backup before migrations. Apply backward-compatible migrations before flipping the `current` symlink. Existing business rows must never be replaced by demo seed data. Demo template pages do not need database seed data.

## Service, HTTPS and activation

`deploy/ravoq.service` is the concrete service template. Set `/srv/ravoq/current` atomically to the prepared release, install the unit, run `systemd-analyze verify` and `systemctl daemon-reload`, then start it. Bind only to `127.0.0.1:3107`. Check `curl --fail http://127.0.0.1:3107/api/health`, the localized homepage and a template demo before exposing traffic.

`deploy/resmen.loyiham.uz.nginx.conf` supplies the isolated virtual host, safe access-log format, overwritten proxy identity headers, body/rate limits and disabled proxy caching. First install only the HTTP ACME location if the certificate does not exist. Obtain a domain-specific certificate through the installed Certbot's webroot workflow using `/var/www/ravoq-acme`; then enable the HTTPS block. Do not overwrite an unrelated virtual host or certificate. Run `nginx -t` before a graceful reload. Verify HTTPS without `-k` and verify certificate renewal with the installed Certbot dry-run workflow.

The proxy must overwrite forwarded headers and the backend must remain unreachable externally. Access logs omit query strings, bodies, cookies and capability paths. Restrict/rotate journal and Nginx logs. Unexpected application errors expose a correlation ID rather than SQL/credential details. Nginx critical diagnostics remain private operational records.

Verify an actual registration/email verification/login, TOTP login, a restaurant publish, image fetch, QR scan, duplicate checkout recovery and cashier transition before declaring production usable. Run these with designated test accounts, not real customer orders. Record release digest, migration journal, certificate result and health checks in this document.

## Platform administrator

Create and verify a normal account, enable TOTP in Account, then run `pnpm admin:grant <email>` from the trusted deployment shell with the maintenance/migration environment. Sign out and sign in again with MFA. Open `/uz/platform`, `/ru/platform` or `/en/platform` within 15 minutes. Existing pre-grant sessions cannot acquire privilege. Revoke with `pnpm admin:grant <email> --revoke`. No default password or public grant endpoint exists.

## Maintenance, retention and backup

Install the supplied maintenance service/timer after pointing it to the maintenance role's environment. It removes at most 100 pending uploads older than 24 hours and 10,000 expired analytics/rate rows per run. Analytics retention target is 90 days; delayed jobs can retain older rows until the next successful batch. Ready assets and immutable design/order/audit history are preserved. Monitor job success and backlog; it does not silently delete referenced images.

Create daily custom-format PostgreSQL backups as the database backup role, with a restrictive umask and files outside the release tree. Back up local uploads at the same time, or configure bucket versioning and independent backup for S3. Encrypt an offsite copy and monitor delivery; no offsite service is configured yet. Suggested initial retention is seven daily and four weekly copies, subject to the operator's approved policy. Test restore into a new isolated database and storage prefix before launch and after material schema changes. A successful dump command alone is not a recovery test.

## Rollback

Stop the app if the release is corrupt, atomically point `current` to the previous verified release, and restart; then repeat health/HTTPS checks. Keep at least one prior release. Code rollback does not reverse migrations. For incompatible data changes, restore the verified database/upload backup in an isolated recovery environment and reconcile any orders created since backup before changing production routing. Never blindly restore over live orders.

## Status

Release `2026-10-03T11-37-25-303Z` is active through `/srv/ravoq/current`; its verified SHA-256 is `bf1b586635d8e8518c765c6348fe00754f9c686d67dfbc5cbbc3c6b743aa4cc3`. The prior release remains available for code rollback. The dedicated `ravoq` service binds to `127.0.0.1:3107`, and the public backend port is not reachable externally. PostgreSQL contains 44 application tables and ten applied migration journal entries. The runtime role has no `UPDATE` or `DELETE` privilege on `audit_log`, `order_event`, or `template_revision`.

Nginx serves the domain over HTTPS and redirects HTTP. The Let's Encrypt certificate is valid through 2027-01-01; Certbot's renewal dry run succeeded. HTTPS health, Uzbek home, and the template catalog returned 200 from both the server and an external client. The maintenance service completed successfully and its daily timer is enabled. A custom-format database backup at `/var/backups/ravoq/ravoq-2026-10-03.dump` restored into an isolated verification database with 44 tables, ten migrations, and the designated test account before that verification database was removed.

The designated test account was created through the production auth endpoint, marked verified for deployment testing, and passed sign-in/session checks. Its password is intentionally not stored in this repository. External SMTP is not configured: the placeholder loopback SMTP target lets the service validate its production environment, but registration verification and password-reset delivery will fail until real SMTP credentials are installed. Offsite database/upload backup delivery and online payment-provider integration also remain external operational work.

The 2026-10-03 Resmen identity/menu-motion update passed format, TypeScript, lint, 59 unit/integration tests, the standalone build and 139 production-browser tests before upload. A separate port-3108 server preflight verified health, Resmen home markup and menu intro markup before activation. External production-browser smoke then verified the 3D intro, localized Skip behavior and reduced-motion bypass over HTTPS. No database migration was required for this release.
