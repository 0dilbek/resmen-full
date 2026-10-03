# Project instructions

## Scope and workflow

- Read `README.md` and the relevant documents in `docs/` before changing code. Implementation is now authorized through the full product workflow; track actual progress in `docs/implementation.md`. Do not imply that proposed features are implemented.
- Follow the user's current phase boundary. Implement in controlled increments, not a single whole-product generation pass.
- Before each phase: inspect existing files, read relevant dependency documentation, explain existing behavior and intended changes, identify affected modules/migrations, and state acceptance criteria.
- After each phase: run applicable checks, report their actual results, and document remaining risks. Update affected architecture decisions rather than silently diverging.
- Preserve user changes and any framework-managed instructions. Do not alter environment-owned `.git`, `.agents`, or `.codex` directories.

## Next.js and dependencies

- Before **any Next.js implementation**, inspect its installed version and read relevant documentation in `node_modules/next/dist/docs/`. It is absent in Phase 0. During Phase 1, install the agreed foundation first, then inspect docs before writing application code. If the installed release does not ship that directory, record this and consult the official documentation corresponding to the installed version.
- Inspect the installed version and current documentation before using any third-party API. Verify compatibility; do not assume remembered imports or caching defaults are current.
- Use pnpm and commit the lockfile once the project is initialized. Pin the package manager and supported Node runtime. Do not invent version numbers in architecture documents.
- Preserve any Next.js managed instruction block when scaffolding updates this file.

## Boundaries

- Use a feature-first modular monolith. Routes are thin adapters. React renders UI and handles interaction; server/domain modules own policies, transactions, validation, and business rules.
- Default to Server Components. Add client boundaries only for interaction. Never import database clients, credentials, or server modules into client components.
- Use domain-specific Drizzle queries directly. No generic repository layer or speculative microservices.
- Centralize authentication in `modules/auth`, tenant policies in `modules/memberships`, and platform administration in `modules/platform-admin`. Platform privilege does not imply restaurant membership.
- Shared folders contain genuine infrastructure or reusable UI only. Avoid miscellaneous service collections and circular domain imports.

## Tenant security

- Tenant reads and mutations require server-resolved scope. Never trust restaurant IDs, roles, branch IDs, prices, totals, or ownership claims from a client.
- Every tenant query includes `restaurantId`; branch-owned resources also enforce the actor's branch scope. Cross-tenant child references require composite foreign keys.
- Protected mutations validate session, active membership, permission, runtime input, and resource ownership. Re-check security-sensitive changes inside the transaction.
- Apply policies to Server Actions, Route Handlers, uploads, exports, previews, jobs, and cache loaders. Layout guards and hidden buttons are not security boundaries.
- Public queries return explicit published DTOs. Never serialize raw database records or private drafts into public routes.
- Reject by default. Use indistinguishable not-found responses for inaccessible foreign tenant resources. Do not expose constraint details.
- Keep private responses and draft previews out of shared caches. Cache identity always includes the restaurant and relevant branch/menu/locale/revision.

## Data, input, and operations

- Use strict TypeScript, no `any` escapes, and Zod runtime validation at all external boundaries. Infer types where practical.
- Use versioned Drizzle migrations; inspect generated SQL. Do not use schema push against production or manually change its schema.
- Store money as integer minor units plus ISO currency. Never calculate trusted totals from client prices or floating point arithmetic.
- Follow the documented order state machine, transaction locks, optimistic versions, and idempotency rules.
- Object storage holds images; PostgreSQL holds metadata. Validate ownership, bytes, dimensions, and decoded image format before publication.
- Never log credentials, session tokens, signed URLs, order capability tokens, or unnecessary personal information. Server secrets must never use a `NEXT_PUBLIC_` prefix.
- Preserve useful structured errors and request IDs without leaking internal details. Do not silently swallow failures.

## UI, templates, and branding

- Use one dashboard design system, accessible primitives, and Lucide icons. Meet WCAG 2.2 AA targets and test keyboard/mobile flows.
- Localize UI copy through message catalogs for Uzbek, Russian, and English. Product content uses database translations with explicit fallback rules.
- Templates consume the same validated menu contract and shared behavior. They do not fetch data, authorize, price orders, or duplicate cart logic.
- Only approved token values, fonts, assets, and layout variants may be customized. No arbitrary HTML, CSS, JavaScript, SVG uploads, or remote font URLs.
- Draft design changes never overwrite the published design until an authorized publish transaction succeeds.
- Follow `docs/branding.md` for asset provenance and refinement. Cultural ornament is optional and must never impair reading or QR scanning.

## Verification

- Once tooling exists, run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` for completed implementation phases. Run relevant integration and Playwright flows; do not claim unavailable checks passed.
- Test tenant isolation with at least two restaurants and real PostgreSQL constraints, including branch restrictions and forged references. Mock-only tests cannot prove database isolation.
- Cover role permissions, owner protection, input validation, template config/publishing, stable QR resolution, order transitions, price tampering, retries, and concurrency as those features ship.
- Documentation-only changes require reference, diagram, and consistency review; they do not require installing an application just to run irrelevant checks.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
