# Menu template engine

Status: normalized contract, shared interaction boundary, six server-rendered families, safe configuration and draft/publication implemented. Four-template proof passed mobile interaction tests; all thirty templates passed the shared mobile/keyboard flows. Edition 2 introduces eight typed identity compositions in six independent family renderers; shared MenuTopline/MenuIdentity retain language and contact semantics. See implementation.md.

## Separation of responsibilities

The public resolver establishes active restaurant/branch/menu and language. A server projection produces one validated `MenuData` contract. A versioned registry selects a renderer. Renderers control composition and appearance; shared components/controller own interaction. The server orders module alone validates availability, prices, modifiers, and order transitions.

Templates must not import database/auth clients, fetch their own menu, own a parallel cart, or implement localization/price calculations. Dashboard/public renderers share contract types but never share raw database rows. The renderer and its static presentation are server-rendered; client boundaries are limited to search, active-category tracking, dialogs, modifier selection, locale interactions, and the optional cart. Import only the selected family, not all 30 into a browser bundle.

## Normalized contract, version 1

Define this contract once using a runtime schema and inferred TypeScript types. The following field map is a design specification, not handwritten duplicate interface code.

| Field | Content and rule |
| --- | --- |
| `contractVersion` | Literal `1`; explicit converter for future versions |
| `identity` | Public restaurant/menu identity and canonical URL; no membership/billing fields |
| `restaurant` | Display name, public description/contact/address, opening hours when supported, safe logo/cover metadata |
| `context` | Branch display label, timezone, validated optional table display label, ordering capability; private tokens stay outside cached DTO |
| `locale` / `enabledLocales` / `defaultLocale` | Allowlisted uz/ru/en; requested locale must be enabled |
| `currency` | Restaurant currency; each product/option must agree; no arbitrary browser currency conversion |
| `categories[]` | Stable ID, localized name, sort order, product IDs; only visible categories |
| `products[]` | Stable ID, category ID, localized name/description/ingredients, integer-string price, images, availability, featured flag, allergen codes, attached modifier group IDs |
| `modifierGroups[]` | Stable ID, localized name, min/max choices, ordered options with localized names and nonnegative integer-string price deltas |
| `theme` | Registered template ID, configuration schema version, normalized safe tokens, published revision |
| `contentRevision` | Committed catalog revision, useful for stale UI detection; never a write authorization token |

Tenant context, QR token, visitor preferences, and cart contents are not mixed into the shared cached menu projection. Compose table display/context through a separate validated request-time step. Raw product IDs are still untrusted when submitted back to the server. Product images include approved derivative URLs, width/height, alt text and optional safe placeholder data. Required content has explicit length/count limits to bound server and client payloads.

Load the requested language using database translations, falling back per field to the default locale. Default-language names are required before publication. UI chrome uses next-intl message keys independently of product content. Preserve search/cart interaction during language changes where practical, but prices and selections still resolve by stable IDs. Allergens use a controlled code catalog translated by the application; free-form ingredient text remains restaurant-owned.

## Shared behavior and presentation

| Shared module/component | Responsibility |
| --- | --- |
| Public menu projection | Publication/visibility filters, localization fallback, normalized data |
| Menu interaction boundary | Search query, selected category/product, keyboard/focus behavior |
| Category navigation | Accessible anchors and active-state enhancement; browse works without JS |
| Product detail and modifier form | Shared semantics, validation feedback, option selection and notes |
| Cart boundary | One cart per restaurant/branch/menu and table context; clear or reconfirm on context changes |
| Order submit flow | Idempotency, connection feedback, server validation errors, price reconfirmation |
| Family renderer | Hero/header, category placement, product layout, density, decoration |
| Theme resolver | Defaults + allowed restaurant overrides, validation, safe generated CSS variables |

Family renderers receive shared slots/components and configuration. They can arrange cards as rows, grids, or editorial sections without reimplementing the detail/cart/search modules. If a family genuinely needs a different markup pattern, use its own presentation component over the same DTO and shared interactive controls. Avoid one giant component containing dozens of unrelated template conditionals.

Product names, prices, and category links appear in server HTML before hydration. Search and cart require JavaScript; the browsing fallback remains useful without it. Do not render all product photos at full resolution or open every product dialog at initial load.

## Registry and safe theme tokens

Registry entries contain: stable template ID, family, renderer reference, supported contract/config versions, defaults, capability schema, mobile/desktop preview asset paths, and status metadata. A database catalog may control selection status but never supply an import path, JavaScript, JSX, or template code. Unknown/malformed IDs use the documented default renderer only after a valid public menu has been resolved; log the configuration incident.

| Token group | Safe options |
| --- | --- |
| Colors | Strict hex values for permitted brand accents; foreground/background pairs validated for contrast; semantic danger/success remain controlled |
| Fonts | Curated font IDs mapped to self-hosted licensed families; no arbitrary URLs or CSS font strings |
| Geometry | Enum radius values, spacing density `compact/comfortable`, image ratios `square/landscape/portrait` |
| Composition | Family-supported header, hero, navigation and product-card enum IDs; not every family supports every combination |
| Decoration | Curated motif/border/divider/frame IDs; `none` always available |
| Cultural tokens | `ornamentalBorderStyle`, `decorativeDividerStyle`, `motifOverlayOpacity`, `patternScale`, `patternPlacement`, `headingStyle`, `heroFrameStyle`, `categoryHeaderStyle` |

Proposed bounds: motif opacity 0–0.08 on decorative areas, pattern scale 0.5–2, positions `hero/corners/dividers/none`, and no overlay over text or QR quiet zones. Values must be finite and reject unknown keys. Bound textual and nested configuration size. Keep spacing/radius as enums rather than unbounded numbers. A color alone does not guarantee accessible contrast; publication validates the resulting combinations and offers an accessible replacement when needed.

Restaurant overrides apply after family defaults, then the whole resolved config is validated. Persist a schema version. When token semantics change, migrate explicitly and keep previous published versions supported until migrated. A restaurant cannot alter raw CSS, inject markup, reference another tenant's private media, or enable ordering through a theme token.

## Draft, preview, and publish

1. Selecting a gallery card opens a private preview with real authorized restaurant data. This does not write the published configuration.
2. Changes remain local until Save draft. Save validates permission, menu/branch ownership, template availability and token schema, then conditionally updates the draft by `draftVersion`. Conflicts return a recoverable “changed elsewhere” state.
3. Preview reads the saved draft or bounded validated in-memory changes through an authenticated server path. Use private/no-store responses and `noindex`; no public cache keys or anonymous preview URLs. Previewing another tenant's menu is denied even with a valid template ID.
4. Publish locks the configuration, checks expected draft version, permissions, template state, media readiness, localization and accessibility constraints, and creates an immutable `TemplateRevision`.
5. Update `publishedRevisionId` in the same transaction, write an audit event, then invalidate only this menu's public projection. A failed transaction leaves the old published design intact.
6. Restore a previous design by publishing a new revision after validating it against supported renderer/schema versions. Never mutate a historical revision in place.

First menu publication also verifies public profile/default branch, required translations, active category/product visibility and tenant status; a template publish alone does not bypass restaurant suspension. A saved catalog edit affects published content directly after commit, while a saved template draft does not affect appearance. Label these actions distinctly in the dashboard.

Template ACTIVE: selectable and publishable. RETIRED: unavailable for new selection, while existing published revisions remain renderable. BLOCKED: selected public menus use a reviewed accessible default with compatible validated branding, and owners receive a notice. Block status is checked at the uncached public control gate; do not allow a stale cached renderer choice to bypass it. Preserve the previous revision for investigation; do not erase restaurant data or change QR codes. Public gate/template status reads must remain small and shareable within a request.

## Initial renderer proof and expansion

Build `minimal-01` first with the public menu, then `luxury-01`, `fastfood-01`, and `uzbek-modern-01` in the engine phase. These validate list, photography-led section, dense quick-order grid, and ornamental sectional composition respectively. All must handle no images, long Russian text, Uzbek apostrophes, missing optional translations, empty categories, unavailable products, modifiers, and ordering disabled.

Only expand after shared behavior passes the same interaction tests in each renderer. The complete [style roadmap](template-styles.md) defines the remaining variations. A family variation must alter meaningful composition/typography/navigation/card details; recoloring one markup tree does not qualify as a new design.

Generate gallery preview images from actual renderers with a licensed seed menu, fixed viewport, locale and content revision. Store mobile and desktop previews under `public/template-previews/{templateId}/{rendererVersion}/`; metadata records capture date and source revision. Thumbnails illustrate the shipped layout. Real-data preview uses the restaurant's content, not an unrelated static mockup. Capture screenshots at 390px and 1440px initially and check narrow 320px usability separately.

## Test and performance contract

- Contract tests feed the same normalized fixtures through every renderer. Validate no private fields or invalid media URLs are exposed.
- Schema tests reject unknown template IDs/keys, unsupported combinations, CSS/HTML payloads, out-of-range opacity, unapproved fonts, and cross-tenant assets.
- Integration tests prove private draft isolation, two-editor version conflicts, atomic publication, template blocking, and selective menu revision/cache invalidation.
- Interaction tests cover shared category/search/detail/modifier/cart behaviors; each renderer gets keyboard/focus and mobile accessibility smoke coverage.
- Browser tests verify language fallback, QR stability after publish, ordering-off behavior, and usable first server HTML. Test unauthorized direct preview and mutation requests.
- Bundle checks confirm the public route excludes dashboard/auth tooling and unselected renderers. Gallery lazy-loads thumbnail images and mounts only the current interactive preview.


## Premium extension — 2026-10-03

The legacy collection remains compatible. A second collection adds 30 distinct designs, categorized real-data preview and strict sparse customization. See [premium engine / extension guide / 3D resource policy](premium-templates.md) and [upgrade verification report](premium-upgrade.md). The latter records exact completed checks and outstanding limits.
