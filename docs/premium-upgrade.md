# Premium template and 3D upgrade — 2026-10-03

## Inspected baseline

The inspected baseline used Next.js 16.3.5 App Router / React 19.3; final verification uses the compatible security patch Next.js 16.3.8. TypeScript, Tailwind 4 plus global/feature CSS, Base UI dialogs and owned controls, and next-intl UZ/RU/EN remain in place. Feature-first domain modules use Drizzle/PostgreSQL. Better Auth owns verified sessions and MFA; memberships own restaurant and branch permissions. Server Actions own dashboard mutations; Route Handlers cover uploads, orders, QR/media and analytics. TanStack Query polls cashier data; guest cart/retry stores and local React state own interaction. No global replacement store is needed.

Products carry translated names/descriptions/ingredients, integer money, media metadata, allergens, availability, featured flags and modifier links. Public projection emits a validated MenuData DTO behind publication/tenant checks. Template config is per-menu JSONB with optimistic draft versions and immutable published revisions; it does not belong in a parallel restaurant.design column. Six family renderers and 30 legacy IDs already exist. Preview uses server-authorized actual restaurant data. The current gallery lacks categories/full-screen live editing, and customizer only exposes a small safe token subset. Existing marketing depth is CSS, with no WebGL dependency.

## Ordered plan and acceptance

1. Preserve baseline routes/data; extend typed registry metadata and backward-compatible validated theme settings.
2. Reuse server-rendered identity/cards/search/detail primitives; implement and inspect the first six requested directions.
3. Add categorized gallery, full-screen mobile/tablet preview and debounced actual-data customizer. Preview never writes a draft or publishes; all supplied configs/media require server validation and ownership.
4. Expand the requested 30-design collection using compositional presets, independent art direction and shared behavior; keep legacy IDs available.
5. Add bounded, lazy React Three Fiber enhancement and shared motion policy, with static fallback, reduced-motion/save-data/visibility controls. No GPU requirement for reading or ordering.
6. Verify schema compatibility, publication/isolation, preview security, responsive/keyboard/contrast, orders, no-WebGL/reduced-motion and complete lint/typecheck/test/build. Refresh real renderer previews.

Each increment records actual results in implementation.md. Final changed/created file inventory, dependency versions, API/schema decisions and extension guide will be added here. No remote deployment is part of this design request.

## Collection implementation

All 30 premium IDs are registered, with the original 30 available in Classic collection. The following describes the actual reusable composition and optional GPU support; each ID additionally has independent scoped styling.

| Design | Category | Composition | Optional 3D |
| --- | --- | --- | --- |
| Editorial Magazine (`editorial-magazine`) | premium | editorial | No |
| Dark Luxury (`dark-luxury`) | premium | gallery | No |
| Japanese Minimal (`japanese-minimal`) | minimal | folio | No |
| Neo-Brutalism (`neo-brutalism`) | creative | poster | No |
| Scrapbook (`scrapbook`) | creative | paper | No |
| Uzbek Heritage (`uzbek-heritage`) | cultural | heritage | No |
| Brutalist (`brutalist`) | experimental | poster | No |
| Glassmorphism (`glass`) | experimental | gallery | No |
| Food Cinema (`food-cinema`) | premium | cinema | Yes |
| Playing Cards (`playing-cards`) | creative | gallery | No |
| Newspaper (`newspaper`) | creative | editorial | No |
| Vintage Italian (`vintage-italian`) | cultural | paper | No |
| French Bistro (`french-bistro`) | premium | folio | No |
| Cyberpunk (`cyberpunk`) | experimental | poster | Yes |
| Terminal (`terminal`) | experimental | folio | No |
| Retro Game (`retro-game`) | entertainment | gallery | No |
| Comic Book (`comic-book`) | entertainment | poster | No |
| Polaroid (`polaroid`) | creative | paper | No |
| Museum Gallery (`museum`) | minimal | gallery | No |
| Luxury Watch (`luxury-watch`) | premium | cinema | Yes |
| Playlist / Spotify (`playlist`) | entertainment | rails | No |
| Screening / Netflix (`screening`) | entertainment | rails | No |
| Stories / Instagram (`stories`) | entertainment | stories | No |
| Swipe Menu (`swipe`) | entertainment | swipe | No |
| Food Journey (`food-journey`) | creative | journey | No |
| Khiva Manuscript (`khiva-manuscript`) | cultural | folio | No |
| Oriental Premium (`oriental-premium`) | cultural | heritage | No |
| Botanical Cafe (`botanical`) | creative | paper | No |
| 3D Food Cards (`food-cards-3d`) | experimental | gallery | Yes |
| Dynamic Brand (`dynamic-brand`) | minimal | editorial | Yes |

Full architecture, extension instructions, dependencies, database/API decisions and remaining product limits: [premium-templates.md](premium-templates.md).

Dependency changes are `@react-three/fiber` 9.8.1 and `three` 0.186.1 at runtime, plus `@types/three` 0.186.0 for development. The existing `next` and `eslint-config-next` packages were also moved from 16.3.5 to 16.3.8 after the final production audit identified the patched `next/og ImageResponse` advisory range. The lockfile is committed as a source deliverable; the post-upgrade production audit reports no known vulnerabilities.

## File inventory

Created source, test, migration and documentation files:

- `docs/premium-templates.md`, `docs/premium-upgrade.md`
- `drizzle/0009_premium_template_catalog.sql`, `drizzle/meta/0009_snapshot.json`
- `src/components/visuals/empty-illustration.tsx`, `food-object.tsx`, `motion-surface.tsx`, `product-visuals.tsx`, `scene-3d.tsx`, `scene-canvas.tsx`, `use-visual-policy.ts`, `visuals.css`
- `src/modules/menus/demo-additions.ts`
- `src/modules/templates/design.ts`, `preview-input.ts`, `theme-style.ts`
- `src/modules/templates/premium/catalog.ts`, `renderer.tsx`, `styles.css`
- `src/modules/templates/components/design-controls.tsx`, `live-preview.tsx`, `studio.css`, `template-gallery.tsx`
- `tests/e2e/visual-policy.spec.ts`
- `public/branding/illustrations/dish-9.svg` through `dish-18.svg`

Created renderer previews: `desktop.png` and `mobile.png` under version `3` for each of `editorial-magazine`, `dark-luxury`, `japanese-minimal`, `neo-brutalism`, `scrapbook`, `uzbek-heritage`, `brutalist`, `glass`, `food-cinema`, `playing-cards`, `newspaper`, `vintage-italian`, `french-bistro`, `cyberpunk`, `terminal`, `retro-game`, `comic-book`, `polaroid`, `museum`, `luxury-watch`, `playlist`, `screening`, `stories`, `swipe`, `food-journey`, `khiva-manuscript`, `oriental-premium`, `botanical`, `food-cards-3d` and `dynamic-brand` in `public/template-previews/<id>/3/` (60 files total).

Changed files:

- Root/dependencies: `README.md`, `package.json`, `pnpm-lock.yaml`
- Documentation/provenance: `branding/manifest.json`, `docs/branding.md`, `docs/decisions/003-template-publication-and-cache.md`, `docs/design-system.md`, `docs/implementation.md`, `docs/menu-template-engine.md`, `docs/template-styles.md`
- Database/catalog: `drizzle/meta/_journal.json`, `src/app/api/health/route.ts`
- Localization: `messages/en.json`, `messages/ru.json`, `messages/uz.json`
- Marketing/gallery/preview: `src/app/[locale]/page.tsx`, `src/app/[locale]/templates/page.tsx`, `src/app/[locale]/preview/[restaurantId]/[menuId]/page.tsx`
- Dashboard empty states: `src/app/[locale]/dashboard/page.tsx`, `src/app/[locale]/dashboard/[restaurantId]/categories/page.tsx`, `products/page.tsx`, `products/new/page.tsx`, `src/modules/orders/components/order-board.tsx`
- Menu/template engine: `src/modules/menus/contract.ts`, `demo.ts`, `components/default-menu.tsx`, `components/interaction.tsx`, `src/modules/templates/config.ts`, `config.test.ts`, `registry.ts`, `renderer.tsx`, `components/design-editor.tsx`
- Capture/tests: `scripts/capture-templates.ts`, `public/template-previews/manifest.json`, `tests/e2e/accessibility.spec.ts`, `tests/e2e/template-content.spec.ts`, `tests/integration/template-publication.test.ts`

Generated `.next`, `.local` proof/capture files and `test-results` are private build/test output and are not deliverables or source inventory. No `.git`, `.agents` or `.codex` content was created or changed.

## Database and API delta

Migration 0009 adds the 30 premium IDs to `template_catalog` with `ON CONFLICT DO NOTHING`. It creates no table/column/index and rewrites no restaurant, menu, order, QR, draft or published revision. It was inspected and applied to the local PostgreSQL database; readiness now expects ten migrations.

No public menu or order API shape changed. The private authenticated preview route adds bounded `config` and `embedded` query inputs. Supplied config is strict-Zod validated after tenant/menu authorization; logo and cover IDs must belong to the same tenant/menu and be READY. The `MenuData` contract only widens its repository-owned demo illustration URL allowlist from eight to eighteen files. Existing external restaurant media URLs and price/order policies are unchanged.

## Remaining product work

- Optional old-price, calories, spicy level and separate popular/new/chef-recommendation fields need an explicit product/schema/API project; the current domain does not model them. The demo uses supported descriptions, ingredients, allergens, availability and `featured` chef-choice semantics.
- `video-ready` supplies the production layout and static poster fallback. Video upload, transcoding, storage and playback are not implemented.
- Brand/name clearance, cultural review of named motifs, physical QR print proof and optional professional food photography remain owner launch-review work.
- Production deployment, provider SMTP/S3/offsite backups and online payment provider work retain their existing operational status and are outside this local design upgrade.

## Verification result

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm format:check`: passed.
- `pnpm test`: **59/59 passed** in 12 files with local PostgreSQL integration coverage.
- `NODE_OPTIONS=--max-old-space-size=2048 pnpm build`: passed; standalone assets prepared and private development files excluded.
- `E2E_PRODUCTION=1 PLAYWRIGHT_BROWSERS_PATH=.local/browsers pnpm test:e2e`: **138/138 passed** in Chromium against the production server.
- Browser coverage includes all 60 designs for automated contrast/accessibility and shared mobile behavior; the 30 premium designs at 375/390/430/768px; real-data customizer save/reload and mobile/tablet fullscreen preview; long Cyrillic/no-photo layouts; no-JavaScript content; reduced-motion and failed-WebGL fallbacks; and existing registration, password reset, MFA, platform, tenant, QR, checkout, receipt and cashier workflows.
- All 60 premium version-3 preview files were generated from the application. A 30-design contact sheet and representative landing/first-six captures were visually inspected. Legacy version-1/version-2 preview URLs were preserved.
- Local `/api/health` returned 200 after migration 0009. `pnpm audit --prod` reported zero known vulnerabilities at verification time.

The complete architecture and add-template/3D guides are in `docs/premium-templates.md`. Verification detail and operational limitations are also recorded in `docs/implementation.md`.
