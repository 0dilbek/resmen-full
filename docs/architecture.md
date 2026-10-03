# Application architecture

Status: architecture implemented through platform administration, manual billing and analytics, 2026-09-16, and first deployed to production on 2026-10-03. The phase tables below preserve the original delivery sequence; [implementation progress](implementation.md) records actual checks and external launch dependencies. Source schemas and ADR updates resolve differences from conceptual examples.

## 1. Recommended final architecture

Build a **modular monolith**: one Next.js App Router application, one PostgreSQL database, S3-compatible image storage, and a CDN for immutable public assets. Use the Node server runtime initially so authentication, database drivers, and image processing have a consistent execution environment. The authorized deployment target is the existing server behind resmen.loyiham.uz; see the operations runbook for its isolated service and storage configuration.

The application has five distinct surfaces: marketing, restaurant dashboard, public menus, cashier, and platform administration. They share selected UI and domain modules, not authorization scopes. Server Components load data directly through server modules; do not make HTTP requests back into our own API. Server Actions handle same-origin dashboard forms; Route Handlers serve authentication, public ordering, cashier polling, signed upload requests, and external webhooks when introduced.

The dependency direction is route/component → domain operation → Drizzle/infrastructure. Domain modules expose narrow use cases and public DTOs. Cross-module orchestration is explicit: publishing calls template validation and menu invalidation; order creation consumes validated catalog data. A cache or storage interface is justified by an external boundary; wrapping every database table in a repository is not.

Trade-off: one deployment simplifies transactions, debugging, and operation, while deploys and runtime capacity remain shared. Split a service only when measured scaling, ownership, or isolation requirements justify it. See [ADR 001](decisions/001-modular-monolith.md).

## 2. Proposed folder structure

The tree below is the design baseline; actual modules are created as their features ship. Source remains feature-first and uses direct domain-specific Drizzle queries.

```text
src/
  app/
    layout.tsx
    [locale]/
      (marketing)/              # home, features, templates, pricing, FAQ, contact
      (auth)/                   # login, register, password reset
      (restaurant)/dashboard/[restaurantId]/
      (cashier)/cashier/[restaurantId]/[branchId]/
      (platform)/platform/
    r/[restaurantSlug]/         # server redirect to default branch/locale
      [branchSlug]/[locale]/    # public menu
    q/[publicToken]/            # stable QR resolver
    api/
      auth/[...all]/
      public/orders/
      cashier/orders/
      uploads/
      webhooks/                 # only when an integration requires it
  modules/
    auth/
    restaurants/
    branches/
    memberships/
    menus/
    categories/
    products/
    modifiers/
    templates/
    qr/
    orders/
    analytics/
    billing/
    platform-admin/
  components/
    ui/                         # reviewed shadcn primitives
    shell/                      # shared navigation and layout
  infrastructure/
    db/                         # connection, schema aggregation, migration tooling
    storage/                    # signed upload and image processing boundary
    observability/              # redacted logs and error reporting
    env/                        # validated server/client environment split
  i18n/                         # routing and locale configuration
  styles/                       # shared semantic tokens and global styles
messages/{uz,ru,en}.json
drizzle/                        # committed SQL migrations and snapshots
tests/{integration,e2e}/
branding/                       # source assets and provenance, when produced
public/{branding,template-previews,qr-assets}/
docs/
```

A typical module contains `schema.ts` (database tables), `validation.ts` (input schemas), `types.ts` (only necessary contracts), `server/queries.ts`, `server/commands.ts`, `components/`, and colocated tests. Small modules need fewer files. Import schema definitions through the database aggregation for migration generation; avoid a circular runtime dependency from schema to database client. Use server-only boundaries on data access and secrets.

## 3. Database and tenancy

Use a shared schema with an explicit `restaurant_id` on every restaurant-owned record. Branch/menu relationships use composite foreign keys so an ID belonging to restaurant B cannot be attached to restaurant A. Authentication records and platform catalog records are global by design. [The database document](database.md) contains the entity diagrams, constraints, indexes, deletion policy, and migration sequence.

Resolve tenant context on the server from the authenticated user, requested restaurant, active membership, and allowed branches. A remembered restaurant selection is navigation state, not authorization. Require tenant and branch conditions in reads, joins, writes, exports, preview queries, and background work. Mutations derive ownership fields from this context rather than accepting them as writable fields.

Application authorization plus composite database constraints is the first release boundary. RLS is deferred rather than treated as a half-configured guarantee; this leaves a real risk of omitted read predicates, mitigated by restricted module access, query review, and PostgreSQL-backed adversarial tests. Adding RLS requires a separate migration, transaction-local connection context, and tests of public/auth/admin access and connection pooling. PostgreSQL owners and privileged roles can bypass row security; enabling it alone would not establish isolation. See [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) and [ADR 002](decisions/002-tenant-isolation-and-auth.md).

Start with one branch and one menu per branch in the UI, while retaining the branch relationship in the schema. Products belong to one menu and category; cross-branch product reuse and price overrides are later capabilities, not an implicit feature of this model.

## 4. Authentication and authorization

Use Better Auth for identity, credentials, sessions, verification, and password reset. Use its supported Drizzle integration; inspect the installed version before selecting imports and generating auth tables. Keep one application-owned `Membership` model for restaurant roles, not a second parallel organization-membership system. The current [Better Auth Drizzle documentation](https://better-auth.com/docs/adapters/drizzle) and [Next.js integration](https://better-auth.com/docs/integrations/next) are the starting references.

Central policies distinguish platform grants from restaurant roles and constrain branch access. The [permission matrix](permissions.md) is the source of truth. Treat every Server Action and Route Handler as an entry point requiring its own checks. Next.js also recommends authorization close to data access rather than relying solely on UI checks; see its [authentication guide](https://nextjs.org/docs/app/guides/authentication).

Use verified-email onboarding, secure session cookies, validated same-origin return paths, trusted origins, login/reset rate limits, expiring single-use invitations, and no shared cashier credentials. Require MFA and recent authentication before privileged platform actions at their launch. Do not persist membership authorization in a long-lived session claim: revocation must affect the next request. Registration creates restaurant + settings + owner membership + initial branch/menu atomically after identity establishment, with an idempotent onboarding marker.

## 5. Menu template engine

One normalized menu contract, shared interaction components, and server-rendered presentation families. Four structurally different templates validate this boundary before expansion to 30. Template configuration is a strict, versioned schema; restaurants choose safe tokens and curated assets. Draft edits and previews are private. Publishing atomically replaces the published configuration after validation and optimistic concurrency checks. Product content changes remain independent from design drafts. See [the engine design](menu-template-engine.md).

Six families × five variations = 30: minimal, luxury, cafe/bakery, fast food, Asian/editorial, and Uzbek contemporary/traditional. This incorporates the additional cultural brief without quietly increasing the initial target to 35. [Template styles](template-styles.md) describes structural variation and the [brand document](branding.md) sets creative boundaries.

## 6. Public URLs and QR identity

| URL | Purpose and validation |
| --- | --- |
| `/uz`, `/ru`, `/en` | Localized marketing; `/` redirects to a supported locale |
| `/{locale}/login`, `/{locale}/register` | Authentication UI with allowlisted internal return paths |
| `/{locale}/dashboard/{restaurantId}/…` | Membership-scoped management; URL ID is never trusted |
| `/{locale}/cashier/{restaurantId}/{branchId}` | Branch-authorized cashier surface |
| `/{locale}/platform/…` | Separate platform policy |
| `/r/{restaurantSlug}` | Resolve active restaurant and redirect to its default branch/default language |
| `/r/{restaurantSlug}/{branchSlug}/{locale}` | Canonical human-readable public menu |
| `/q/{publicToken}` | Permanent printed QR URL; opaque random identifier resolves restaurant/branch/optional table |

QR targets never contain template IDs, product IDs, or internal tenant IDs. Generate at least 128 bits of random token entropy using the platform cryptographic generator. A restaurant QR follows the current default branch; a branch QR remains bound to that branch; a table QR remains bound to its branch/table. Validate active state and parent relationships at resolution time. Branch/table removal deactivates the target; it must not silently retarget a printed table code to a different table.

Resolve `/q/` dynamically and issue a temporary redirect so caches do not freeze a target. A table context token may be carried in the menu URL; validate it again for every order. Set an appropriate referrer policy and keep tokens out of analytics and logs. These identifiers are public location hints, **not proof the guest is physically present**, and never grant access to other orders. QR artwork may change; the encoded platform HTTPS URL stays constant through restaurant renames, branding, and template edits. The platform domain must therefore be retained long-term.

Restaurant/branch slug changes reserve old slugs in alias tables and redirect to the current canonical URL. Slug registries prevent recycling an old slug to an unrelated business. QR resolution bypasses slug history by using internal relations. The public resolver is the future extension point for verified custom domains; arbitrary `Host` headers never establish a tenant. No custom domains in MVP.

## 7. Caching and performance

Choose explicit caching after inspecting the installed Next.js docs. The current [Next.js revalidation guide](https://nextjs.org/docs/app/getting-started/revalidating) distinguishes immediate Server Action invalidation via `updateTag` from stale-while-revalidate via `revalidateTag`. Their availability and signatures must be checked during implementation; this proposal does not assume a default cache mode.

| Data | Proposed strategy |
| --- | --- |
| Sessions, memberships, platform state, orders, private previews | Request-time reads; private/no-store responses; no shared user cache |
| Public access gate | Small uncached lookup for active restaurant, branch/menu publication, and current catalog/design revisions |
| Normalized published menu | Cache by contract version + restaurant + branch + menu + catalog revision + published design revision + locale |
| QR target | Uncached resolution with active-state checks; no permanent redirect |
| Logos, optimized images, template previews | Immutable versioned object keys and CDN caching |
| Marketing content | Static rendering/revalidation suitable for its edit frequency |

The uncached access gate is intentional: suspension, unpublishing, and availability revisions must not wait behind an old shared page. It loads only control fields; larger published projections are cached. Do not CDN-cache the complete dynamic menu response in MVP. Server-render the first menu content, with optional interactions hydrating afterward. Never load auth/dashboard dependencies in the public-menu bundle.

Catalog mutations increment the affected menu's `catalog_revision` in the same transaction as the data change. Design publication advances a separate immutable design revision. A restaurant-level public profile change advances each affected menu's catalog revision. Cache tags such as `menu:{restaurantId}:{menuId}` allow narrow cleanup after commit; never globally purge unrelated restaurants. Reading the new committed revision selects a fresh key even if cleanup fails. Build each cached projection in a consistent database snapshot and verify its expected revisions; retry rather than cache mixed/new data under an old key. Set a finite expiry (initially five minutes) so old revision entries do not accumulate indefinitely. Already-open clients can remain stale; ordering always revalidates live price and availability.

Use responsive images, dimensions to prevent layout shift, lazy loading below the fold, minimal self-hosted fonts, and bounded menu payloads. Initial search uses the already-rendered active-language menu for a modest catalog; add indexed server search only when catalog measurements justify it. Budget targets to measure, not claims: mobile p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, and ≤100KB compressed first-route JavaScript excluding images/fonts. Measure on a representative mid-range phone and constrained connection. See [ADR 003](decisions/003-template-publication-and-cache.md).

## 8. Image and storage strategy

Use a private quarantine prefix/bucket for original uploads and a public CDN origin for validated derivatives. PostgreSQL stores restaurant ownership, storage key, MIME, dimensions, bytes, checksum, processing state, and localized alt text; never image blobs. A narrow storage adapter isolates the provider SDK.

Flow: authorized upload request → tenant quota and metadata validation → short-lived signed upload to a server-chosen random key → completion call verifies object and ownership → bounded image decoding/re-encoding → publish safe derivatives → attach ready media in a transaction. Enforce limits both before signing and after receiving bytes. Where signed PUT cannot enforce the full limit, use provider-supported size-constrained POST or a bounded upload proxy; do not assume S3-compatible providers have identical controls. Presigned URLs are bearer credentials and can remain reusable until expiry; see [S3's presigned URL guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).

Implemented upload policy: JPEG, PNG, WebP only; ≤8MiB and ≤24 megapixels per upload; reject animation and unsupported formats. Validate magic bytes and successful decoding, not the extension/header alone. Strip EXIF/GPS metadata, apply orientation, and produce immutable derivatives around 320/640/960/1440px as useful without upscaling. Enforce bounded processor time/memory and per-tenant storage quotas. Original SVG/HTML and remote URL imports are not accepted. A trusted build pipeline can ship reviewed SVG brand assets separately.

A pending asset cannot appear publicly. Clean abandoned uploads after 24 hours and unreferenced derivatives after a retention window; check references from published/draft designs before deletion. Use a scheduled operation from the same codebase initially, not a standalone worker platform. If processing exceeds request runtime limits, introduce durable jobs before enabling uploads. Match optimizer remote-host allowlists to our asset origin; do not allow arbitrary URL fetching.

## 9. Dependencies and adoption timing

No dependencies are installed. Select mutually compatible maintained stable releases at the start of each implementation phase, inspect their docs, and record exact versions in the lockfile. Do not install every potential package in Phase 1.

| Dependency | Why and when |
| --- | --- |
| Next.js, React, React DOM, TypeScript | App Router, server rendering, typed client islands; Phase 1 |
| pnpm | Reproducible lockfile and controlled installs; Phase 1 |
| Tailwind CSS + supported Next.js integration | Semantic token styling; [official setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs); Phase 1 |
| shadcn/ui tooling, one supported primitive family, Lucide React | Owned/reviewable component source and consistent icons; add only used components. [shadcn documentation](https://ui.shadcn.com/docs) is the baseline reference; use Base UI where the installed component recipe supports it |
| Drizzle ORM, Drizzle Kit, `pg` and types | Explicit SQL-oriented queries and reviewed migrations on PostgreSQL; Phase 1; [constraints](https://orm.drizzle.team/docs/indexes-constraints) and [transactions](https://orm.drizzle.team/docs/transactions) |
| Better Auth + compatible Drizzle adapter | Authentication without handwritten credential/session protocols; Phase 1; adapter package/import depends on installed version |
| Zod | External-input and environment schemas, inferred types; Phase 1; [documentation](https://zod.dev/) |
| next-intl | Server/client message catalogs and localized routes; Phase 1; [App Router integration](https://next-intl.dev/docs/getting-started/app-router) |
| React Hook Form + Zod resolver | Complex product/modifier forms; Phase 3; verify installed resolver compatibility before use |
| AWS SDK S3 client/presigner, image processor such as Sharp | Provider-tested upload flow and image normalization; Phase 3 |
| QR encoder with maintained SVG/PNG support | Actual locally generated codes, not third-party URL QR services; select and verify during Phase 7 |
| TanStack Query | Cashier polling, retry, reconnection, and client server-state synchronization in Phase 8; [documentation](https://tanstack.com/query/latest/docs/framework/react/overview) |
| TanStack Table | Only for genuinely complex administrative tables; defer until required |
| Zustand | Deferred; local React state/context is sufficient until a demonstrated cross-route client-state need |
| ESLint and matching Next.js config | Explicit lint command and server/client boundaries; Phase 1 |
| Vitest, React Testing Library, DOM matchers/environment | Unit/component tests; Phase 1; [Vitest guide](https://vitest.dev/guide/) |
| Playwright | Browser, mobile viewport, and critical journey tests; Phase 1 smoke, expanded per phase; [guide](https://playwright.dev/docs/intro) |

The table originated during architecture planning. Installed package documentation and relevant source types were inspected during implementation; package.json and pnpm-lock.yaml contain actual versions. TanStack Table, Zustand and presigned public uploads were not required.

## 10. MVP and later scope

| Milestone | Included | Explicitly later |
| --- | --- | --- |
| Phase 1 foundation | Strict TS, environment validation, DB/auth foundation, localized accessible UI shells, CI/test setup | Restaurant features and polished marketing pages |
| Phase 2 tenant core | Restaurants, first branch, memberships, fixed roles, secure queries, atomic onboarding | Custom roles, delegated franchise hierarchies |
| Phase 3 catalog | Categories/products, translations, images, availability, featured items, allergens, ingredients, modifiers, transactional reordering | Inventory, cross-branch catalog sharing, bulk imports |
| Phase 4 public menu | One excellent default menu, search/detail, language selection, brand profile, server first content | Checkout and order-taking |
| Phase 5 engine | Four structurally distinct templates using one contract/behavior layer | Remaining 26 designs |
| Phase 6 gallery | Real-data preview, safe customization, draft/save/publish | Public shareable draft links and advanced scheduling |
| Phase 7 QR MVP | Restaurant/branch/table QR, SVG/PNG export, print layout, stable resolution | Custom domains and advanced print editor |
| Phase 8 ordering release | Optional table orders, validated modifiers, order state machine, cashier polling | Online payments, delivery, POS integration, offline order submission |
| Phase 9 administration | Platform MFA, tenant suspension, plans/subscriptions, provider-backed payment records, audited support, basic usage | Automated complex billing, impersonation, arbitrary feature-rule builder |
| Phase 10 hardening | Adversarial tests, accessibility/performance, monitoring, backup restore drill, deployment/runbooks | Independently scaled services unless measurements demand them |

The first pilot is a **browse-only QR menu** after Phases 1–7 with launch hardening applied before exposure, not postponed to Phase 10. Optional ordering is a separate release. Introduce billing/payment integrations only after provider and commercial model selection; do not pretend a plan record alone implements subscription collection. A limited, audited operator suspension/recovery procedure is required before a public pilot even though the full platform UI comes later.

## 11. Orders, analytics, and operational decisions

Orders follow `NEW → ACCEPTED → PREPARING → READY → COMPLETED`; cancellation is allowed from NEW, ACCEPTED, or PREPARING with a reason. No backward transitions, direct arbitrary status assignment, or editing completed orders. Cashiers may handle only assigned branches. Details and concurrency rules live in [database](database.md#order-integrity-and-concurrency) and [permissions](permissions.md).

Use a five-second foreground polling target with a cursor/version, bounded pages, reconnect backoff, and a visible connection status. Pause in hidden tabs and refetch immediately on focus. On failure keep prior orders labeled stale; never report an unsent transition as successful. Status mutations include an expected version; conflicts refresh the order. Adopt SSE only if measured order volume/latency or polling cost warrants it; do not promise exactly-once delivery from the UI. See [ADR 004](decisions/004-cashier-polling.md).

Define a typed analytics event boundary for `qr_scanned`, `menu_viewed`, `product_viewed`, `language_changed`, `cart_item_added`, `order_created`, and `template_published`. Public event ingestion validates public tenant resolution, event allowlists and size limits, and rate-limits abuse; it is untrusted telemetry. Derive order/template metrics from trusted server events. Start with aggregate counts and a replaceable sink, not an event warehouse. Avoid guest identities and raw QR/order tokens. Set retention before collecting production data. Order delivery and billing must never depend on analytics success.

Use structured logs with correlation IDs, redaction, and operational metrics for DB saturation, menu latency, upload failures, and order processing. Select an error reporter at deployment. Keep connection pools bounded per runtime instance. Define recovery targets for pilot operation (initial proposal: RPO ≤24h, RTO ≤4h), managed encrypted backups and object versioning, and verify a restore before launch. Revisit recovery targets before taking paid orders. Webhook mutations will require signature verification, unique provider event IDs, and transactional deduplication.

## 12. Risks and mistakes to avoid

| Risk | Required response |
| --- | --- |
| Missing tenant predicates or forged parent IDs | Server policies, composite FKs, two-tenant integration tests including reads and writes |
| Platform access silently inheriting tenant owner powers | Separate grants, explicit support operations, audit actor/target/reason |
| Draft or suspended content in public caches | Private previews, uncached access gate, versioned published projection |
| Price tampering or duplicate orders | Live server pricing, transaction, idempotency, bounded input, guest rate limits |
| Thirty divergent implementations | Four-template proof, shared contract, centralized behavior, contract tests |
| Nonfunctional template thumbnails | Generate screenshots from the actual renderer, and test real-data preview |
| Arbitrary CSS/SVG/remote uploads | Strict tokens, allowlisted assets, quarantine and image normalization |
| Broad dependencies/client bundles | Add by phase; server default; inspect bundle costs |
| Premature custom domains or branch-price abstraction | Stable resolver and clear later migration points |
| Treating QR possession as physical presence | Cashier acceptance, abuse limits, explicit ordering opt-in; stronger table sessions only when needed |
| Brand name conflicts or culturally inaccurate art | Naming clearance and informed local design review before final asset production |
| Unverified production claims | Record actual checks and deployment limits; phase documents are proposals |

## Phase 1 entry and exit criteria

Entry: this architecture is internally consistent; unresolved commercial/brand choices have reversible defaults. Proposed defaults: UZS, Asia/Tashkent, Uzbek default with Russian/English support, one branch/menu, browse-only ordering setting. Restaurant settings can change these where supported. Hosting, storage/email/payment providers, final brand/name, and public platform domain remain unselected. None requires inventing credentials or making purchases to write the foundation.

Affected paths: package/config files, `src/app`, shared UI, infrastructure, auth, i18n, messages, tests, migration directory, and updated docs. The first migration contains only the installed Better Auth schema; tenant/catalog/QR/order/billing migrations land with their phases. No database migrations are created in Phase 0.

Exit criteria:

- Compatible versions pinned; installed Next.js docs inspected; strict typing and validated environment split established.
- Development PostgreSQL setup documented; auth migration applies cleanly to a fresh disposable database.
- Registration/session/logout/reset foundations tested with a development mail adapter; production delivery/verification configuration remains a launch gate.
- Accessible public/dashboard/auth shells and uz/ru/en message routing exist; no unguarded placeholder administrative endpoints.
- Server-only boundaries prevent secret/database imports into clients; private session responses do not enter shared caches.
- CI runs typecheck, lint, unit tests, and production build; browser smoke tests and database integration harness are documented and runnable.
- README has exact setup commands and `.env.example` has placeholders without secrets; no claim that feature phases are complete.

Phase 0 review: required documents, local links, Mermaid syntax, role/branch consistency, cache identity, and publication rules. Application lint/typecheck/tests/build are now available; current results are recorded in implementation.md.
