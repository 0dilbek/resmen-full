# Ravoq — Restaurant QR Menu

A multilingual restaurant platform built as a feature-first Next.js modular monolith. Ravoq is the working identity; the original logo/illustration package is in [branding](branding/README.md).

## Implemented

- Verified email/password accounts, reset and TOTP; tenant memberships, branch scope, invitation and ownership-transfer workflows.
- Categories, translated products, integer pricing, allergens, modifiers and validated private image storage with local/S3 adapters.
- Public server-rendered menus, search/detail, Uzbek/Russian/English, 60 templates: 30 preserved family designs and 30 premium designs across six gallery categories, with distinct composition, live design customization and optional lazy 3D, safe design drafts and immutable publication history.
- Stable restaurant/branch/table QR codes, PNG/SVG export and print sheets.
- Shared guest cart, table checkout, authoritative pricing, idempotent retries, private receipts and a polling cashier board with versioned transitions.
- Separate MFA platform administration, audited suspension/template/system controls, manual subscriptions/payment records, creation/storage quotas and branch analytics.
- Marketing, template demos, pricing/FAQ, contact inbox and data-use notice. Template demos work without database seed data.

Online payment processing and production email/storage credentials are external configuration, not simulated integrations. [Implementation progress](docs/implementation.md) records exact verification and outstanding work. The production domain has **not** been deployed.

## Local setup

Requires Node 22, pnpm 10.33.3 and PostgreSQL. Copy `.env.example` to `.env`, set the connection and a random auth secret, then:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000/uz`. Use `/ru` or `/en` for another language. Development verification/reset links are written to private `.local/mail` files. Production requires real SMTP and HTTPS. Never publish `.env` or `.local`.

The working development database is an ignored local PostgreSQL cluster at `.local/postgres`, port 55432. It is not portable repository content. To use your own PostgreSQL instance, change only your private `DATABASE_URL`.

Optional `pnpm db:seed` and `pnpm demo:assets` create a public Navro‘z development fixture without login credentials. Both refuse production. Public template demos under `/en/templates` are independent of this fixture.

## Verification and release

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
```

Tests use real PostgreSQL when the configured database is loopback; otherwise integration suites skip. Use a disposable database, never a production connection. Stop the dev server before building because Next regenerates type artifacts.

```sh
PLAYWRIGHT_BROWSERS_PATH=.local/browsers pnpm exec playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=.local/browsers E2E_PRODUCTION=1 pnpm test:e2e
pnpm audit --prod
pnpm release
```

`pnpm build` prepares a standalone runtime with assets and excludes copied environment files and private development data. The release guard rejects forbidden paths before archiving. `pnpm release` creates a private archive with a checksum in `.local/releases`. Deployment, migration, SMTP/storage configuration, backup/restore, administrator bootstrap and rollback steps are in [the operations runbook](docs/deployment.md). Deployment templates are in [deploy](deploy).

To grant a platform administrator, first verify their normal account and enable TOTP, then use `pnpm admin:grant <email>` in a trusted shell. Sign in again with MFA and open `/en/platform`. Revoke with `--revoke`. No default credentials are included.

## Architecture and product references

- [Architecture](docs/architecture.md), [database](docs/database.md), [authorization](docs/permissions.md)
- [Menu/template contract](docs/menu-template-engine.md), [legacy styles](docs/template-styles.md), [premium templates and 3D](docs/premium-templates.md)
- [Design system](docs/design-system.md), [branding](docs/branding.md), [asset manifest](branding/manifest.json)
- [Decisions](docs/decisions/README.md), [project rules](AGENTS.md), [actual progress](docs/implementation.md)

Source and lockfile are ready for the user's Git workflow. This workspace has not been initialized or pushed to a repository by the agent.
# resmen-full
