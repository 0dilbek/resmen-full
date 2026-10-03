# Implementation progress

Full implementation was authorized on 2026-09-16. Git publication remains with the user. Ravoq is the working brand.

## Phases 1–2 — implemented

Next.js 16.3.8, React 19.3, strict TypeScript, pnpm lockfile, Tailwind, shared UI, next-intl catalogs, Better Auth 1.7.5 with separately installed Drizzle adapter, verified email/password, reset, TOTP setup, PostgreSQL/Drizzle migrations and test tooling. Dashboard tenant switching, creation, profile, branches, memberships/invitations, central permissions, branch scope and audit records. Owner removal is rejected; ownership transfer and role/branch editing were completed in Phase 9.

Checks: typecheck, lint and production build passed. Initial 12 tests passed, including real PostgreSQL isolation/foreign-key checks. Initial browser tests exposed accessible-password-label and mobile overflow issues; both were fixed and the final browser suite passed.

## Phase 3 — implemented

Categories, translations, products, availability, sorting, optimistic product versions, allergens, modifier groups/options, validated image normalization and private local/S3 storage adapters are implemented. Three generated migrations successfully applied from scratch. Catalog checks: typecheck and lint passed; 17 unit/integration tests passed; production build passed. Expanded browser catalog flow and same-tenant cross-menu FK regression passed.

Image publication uses four WebP derivatives, decoded-format/pixel/byte limits and tenant-owned metadata. A bounded maintenance job now removes abandoned pending uploads; ready referenced assets are retained. Modifier names use a bounded three-locale JSON object rather than separate translation rows; product/category translations remain relational. Scope is fixed to uz/ru/en, so this keeps small atomic modifier edits straightforward.

## Phase 4 — implemented

Published DTO projection, snapshot-consistent reads, revision-keyed cache behind an uncached access gate, public SSR menu, language fallback/switcher, anchors, search, accessible product dialog and publish/unpublish. Private drafts are excluded. Demo seed creates no credentials and refuses production.

Checks: typecheck/lint passed; 21 tests passed; two browser flows passed, including signup through catalog publication/search/detail and mobile overflow. Production build passed after stopping the dev server (concurrent dev/build generated-type churn is avoided).

## Phases 5–6 — implemented

First four renderers and safe theme registry, draft/version/publish transactions and authenticated real-data preview. Migration adds template catalog, configs and immutable revisions. Four proof templates passed five browser tests. Expansion to 30 layouts in six families passed all 33 browser flows and 28 unit/integration tests; typecheck/lint/build passed. All 60 mobile/desktop screenshots captured from real renderers. Original dish illustrations provide licensed local demo assets.

## Phase 7 — implemented

Restaurant/branch/table QR scopes, revocation, table activation, private PNG/SVG exports, pagination and print sheets implemented. Request-time table resolution is composed outside shared cached data; switching language preserves the opaque QR context. Database migration adds shape checks and same-branch table FKs. Typecheck/lint/build and 31 tests passed. Browser flow verified creation, QR redirect, and table context across languages.

## Phase 8 — implemented

Guest cart and modifier choices, table-only checkout, private capability receipts, persisted retry attempts, authoritative integer pricing and per-branch order numbers. Shared tenant locks serialize catalog/security changes with orders; checkout reuses its transaction for projection to avoid pool starvation. Cashier status-filtered paginated polling uses TanStack Query; transitions use versions and idempotent event IDs. Migration 0006 unique parent keys were reordered before dependent FKs after SQL review.

Typecheck/lint passed; 40 tests passed, including eight concurrent checkouts, duplicate submissions, forged prices/options, immutable receipt snapshots and racing cashier transitions. Production build and both browser flows passed, including anonymous checkout, persisted receipt and all cashier transitions. Prettier now formats source for maintainability.

## Launch dependencies

Development database resides in ignored `.local/postgres`; no remote database has been mutated. Production SMTP credentials, the storage choice and online payment provider integration remain external dependencies. Source and deployment packaging are complete for the implemented scope; production activation has not been performed.

## Phase 9 — implemented

Separate MFA/recent-session platform authorization, audited suspension/template/settings controls, immutable plans, manually recorded subscriptions/payments and enforced creation/storage quotas. CLI platform grant bootstrap. Branch-scoped analytics and anonymous published-context event collection. All marketing routes, working contact inbox, and three-language copy. Membership role/branch editing, inviter revalidation and transactional ownership transfer implemented.

Typecheck/lint and production build passed; 50 unit/integration tests passed, including platform/tenant separation, stale/pre-grant MFA rejection, payment composite FK isolation, quota changes, revoked invitations and competing ownership transfers. The final browser suite now verifies actual MFA and backup-code login, template policy changes/restoration, and platform access separation. Online payment-provider charging is not implemented because no provider has been specified.


## Phase 10 — local verification complete; production activation pending

Standalone build/start and release allowlist, nonce CSP, SMTP TLS/timeouts, production origin/storage validation, persistent local storage paths, bounded maintenance, catalog projection caps and original branding exports. Independent public demo DTOs no longer require a production demo tenant. Nginx/systemd/env templates and a deployment/backup/rollback runbook are prepared.

All nine migrations applied to an empty local database and a custom-format backup restored to 44 tables/nine migration records. Maintenance ran successfully with zero abandoned uploads. Production dependency audit is clean after overriding the old transitive esbuild used by Drizzle tooling to the already-installed patched 0.25.12; production never runs its development server. See [upstream advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).

Browser tests initially passed 37/38, exposing a rapid MFA form-reset race. The corrected MFA flow then reached platform administration, exposing an ambiguous owner-summary SQL column; a real database regression test now covers that query. Automated contrast checks also identified and corrected platform muted text and dark-template footer branding. These fixes passed the final rerun described below.


## Final verification — 2026-09-16

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and standalone `pnpm build` passed.
- `pnpm test`: **52 passed** in 12 files, including real PostgreSQL tenant/branch/composite-foreign-key checks, concurrent checkout/transitions and ownership transfers. No production database was used.
- `E2E_PRODUCTION=1 PLAYWRIGHT_BROWSERS_PATH=.local/browsers pnpm test:e2e`: **49 passed** against the final standalone build. Includes all 30 menu templates, JavaScript-disabled public rendering, 320px layouts in three locales, 10 automated accessibility scans, registration/verification, password reset with session revocation, MFA and backup-code login, platform mutations, catalog publication, QR context, cashier transitions, and receipt access after QR revocation. Automated scans do not constitute a full manual WCAG audit.
- Refreshed all **60** mobile/desktop template captures after the final cover change; verified **17** original asset checksums. Marketing mobile, dashboard and a premium template were visually inspected.
- Health returned HTTP 200 with `Cache-Control: no-store`. A public template returned HTTP 200 with nonce/strict-dynamic CSP and no unsafe-eval. Local response timing is not an internet performance benchmark.
- Empty-database migration and backup restoration verified **nine migrations / 44 public tables**. Maintenance completed locally. Production dependency audit found **zero vulnerabilities** at verification time.
- Nginx/systemd templates and rollback instructions are delivered; local systemd syntax verification passed with container-only socket-option warnings. Remote Nginx, certificate, SMTP delivery, S3-provider behavior and production restore have not been tested.

The release archive excludes environment files, development database/mail/uploads, browser results and Git metadata. It is a runtime/operations package; the complete source workspace is separately ready for the user's Git workflow. The archive and checksum are under ignored `.local/releases`.

## Remaining limitations

Online provider charging/webhooks, restaurant archival UI, external email delivery and offsite backup delivery are not implemented/configured. Private local uploads and the S3 adapter are implemented; production must choose and provision storage. The working brand still needs owner/name clearance and a physical QR print proof. **resto.loyiham.uz is not deployed by this work.**

Release inspection initially rejected traced development mail/test metadata in standalone output. The unsent archive was removed; tracing exclusions, generated-output cleanup and a recursive release rejection guard now prevent packaging those paths. The corrected build passed lint and its built-in TypeScript check; all three targeted registration/reset/catalog/QR/order/browser flows passed again. Health, localized home, demo and preview asset returned HTTP 200. Three isolated release-guard fixtures verified rejection before archive creation. The corrected archive passed its checksum, forbidden-path and 60-preview checks.


## Template composition revision — 2026-09-17 (verified)

User feedback identified that the repeated large identity header and shared rows made templates look too similar. Renderer edition 2 gives the 30 designs distinct first-screen compositions, navigation placement and product-card rhythms: compact service list, numbered index, photographic contact sheet, ticket, editorial spread, tasting booklet, framed dining room, cafe board, poster, bento grid and Uzbek arch/tile/gathering layouts. Eight typed intro compositions reuse shared identity and locale links; six family renderers retain independent composition decisions. Shared search/detail/cart and the validated DTO remain unchanged.

Affected modules: menu identity presentation, family renderers, isolated composition stylesheet, public/dashboard gallery previews and browser verification. No schema or tenant-data migration. Existing selected template IDs retain their data/configuration; the requested renderer update changes their presentation. Preview assets advance to version 2 so old immutable URLs are preserved.

Acceptance: inspect mobile/desktop compositions, regenerate all 60 previews, all 30 shared behavior checks at 320px, contrast/accessibility, no-images/long-content handling, normal typecheck/lint/test/build and relevant checkout regression. Final results follow below.

Pre-build revision checks: typecheck/lint passed; 52 unit/integration tests passed. The expanded initial browser run passed 64/65 checks, finding insufficient muted-text contrast in the Daily featured panel (4.28:1); the panel now uses foreground text. All 30 shared mobile flows passed at 320px. A separate authenticated flow created an isolated restaurant and verified all 30 private previews with long Cyrillic names and no images. A comparison sheet of all 30 first screens and representative desktop/mobile captures was visually reviewed; Salon was further differentiated from Tasting. Final production verification and clean version-2 captures are pending.


Final revision results: **74/74 Playwright tests passed** against the production build, including accessibility scans for all 30 templates, 320px search/detail/sold-out flows, no-JavaScript browsing, long Cyrillic/no-photograph private previews at both 320px and 1440px, three-language marketing, MFA, password reset, QR/checkout/cashier and private receipt recovery. The corrected Daily contrast and revised Salon header passed. **52/52 unit/integration tests passed** with PostgreSQL, and format/typecheck/lint/production build passed. No test was waived for visual styling.

All **60 version-2 preview files** were recaptured from the final production server (without development UI), copied to standalone output and checked byte-for-byte. Version-1 assets remain available. All 30 first-screen compositions were reviewed together, with representative desktop/mobile views inspected individually. Public and dashboard galleries now use the shared preview-version constant. Working original illustrations remain the demo food imagery; restaurant photos still come from the existing validated upload flow.

No remote deployment or database migration was performed in this revision. Existing published template IDs now render with the requested new compositions; business data, QR identifiers, draft records and order policies were not changed. The refreshed runtime archive is stored under ignored `.local/releases`.


## Premium collection upgrade — 2026-10-03 (verified)

Inspected the original Next 16.3.5 / React 19.3 foundation, existing tenant actions, immutable publication, shared public contract and all old renderers. Final verification uses Next 16.3.8 after upgrading to the current compatible security patch. Plan and boundaries: [premium-upgrade](premium-upgrade.md). Added a separately identified premium collection while preserving the 30 renderer-2 IDs; extended schemaVersion 1 with optional strict versioned design tokens. First six directions passed targeted 390px search/detail/overflow checks. Expanded to all 30 new directions after those checks. Categorized gallery, debounced real-data preview, fullscreen device preview and visual controls now use the same authorized private route and owned-media validation. Browsing a gallery preview does not change the staged editor config.

Migration 0009 only inserts new catalog IDs with ON CONFLICT DO NOTHING; applied to local PostgreSQL. Existing revisions and business data are untouched. R3F 9.8.1 / Three 0.186.1 are dynamically imported behind one visibility/reduced-motion/save-data policy; no external models, sensors or remote textures. Lightweight original vector illustrations cover empty states and expanded demo data.

Final verification: `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and the standalone production build passed. `pnpm test` passed **59/59** tests in 12 files against local PostgreSQL, including premium draft/publication, sparse config compatibility, forged foreign-media rejection and existing tenant/order constraints. `E2E_PRODUCTION=1 PLAYWRIGHT_BROWSERS_PATH=.local/browsers pnpm test:e2e` passed **138/138** Chromium tests. The matrix includes WCAG 2.2 AA automated checks for the landing/auth pages and all 60 menu designs, contrasting detail sheets, shared 320px search/detail/sold-out behavior for every design, real-data customizer save/reload/fullscreen behavior, long Cyrillic/no-photo private previews at 320px and 1440px, no-JavaScript content, 375/390/430/768px premium layouts, reduced motion, no-WebGL fallback and the existing auth/MFA/platform/order/QR/tenant flows. Automated accessibility checks do not replace a manual assistive-technology audit.

Generated and visually reviewed all **60 version-3 mobile/desktop premium previews** as a contact sheet; the final Scrapbook, Terminal and Polaroid captures were refreshed after overflow/accessibility refinements. All 60 legacy version-2 files remain unchanged and available. A real WebGL landing capture reported one canvas and no page errors; fallback checks proved the same page/menu remains usable without WebGL. Production health returned HTTP 200 after migration 0009. Production dependency audit reported zero known vulnerabilities at verification time.

The first full browser pass found and fixed a transient Polaroid contrast issue, decorative Terminal text leaking into the accessible name, a four-pixel Scrapbook overflow at 430px, and an iframe test selector that matched the loading shell as well as the rendered menu. The final full run passed without waivers. No remote deployment or Git initialization was performed.
