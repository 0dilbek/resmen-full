# Premium template engine and visual system

## Architecture

The registry contains 30 legacy IDs and 30 premium IDs. Existing public URLs, saved version-1 configurations, draft versions and immutable published revisions remain compatible. Legacy renderers retain their six family compositions. The premium collection uses eleven typed compositions (editorial, gallery, folio, poster, paper, heritage, cinema, rails, stories, swipe and journey) with individual, scoped art direction for each ID. These are not independent pages or copies of ordering logic.

`premium/catalog.ts` defines IDs, display names, six gallery categories, composition, curated palette, fonts, motion preset, light/dark default, recommended venue type and optional 3D support. `registry.ts` adapts this collection to the existing registry and resolves versioned preview assets. `premium/renderer.tsx` combines shared identity, category navigation/index, cover, menu sections, search, details and footer. `premium/styles.css` defines the layouts and visual treatments. The `MenuData` DTO remains the only content interface; renderers do not query the database, authorize requests or calculate totals.

Only Uzbek Heritage, Khiva Manuscript and Oriental Premium expose optional Uzbek ornaments. Cultural gallery categorization does not automatically enable an Uzbek motif on Vintage Italian. Playlist, Screening and Stories describe familiar interaction patterns; they do not use third-party service logos or imply affiliation.

## Settings, preview and publication

The existing `template_config.draft` and `template_revision.config` JSONB fields hold the selected ID and allowlisted tokens. Schema version 1 gains an optional `design` object with its own version. Absent settings inherit renderer defaults. Changing a color/font does not implicitly change every card border or shadow. No parallel restaurant.design storage was added.

The customizer exposes five colors, three local font stacks, font scale, radius, spacing, shadow, border, five image treatments, motion intensity, and hero options on premium templates. The five supported 3D designs expose an opt-in switch. `video-ready` provides a wide poster composition; video upload/playback is not implemented and the UI states this. Existing validated logo/cover upload controls and cultural intensity/scale/placement remain available. Template selection preserves owned logo and cover IDs.

The existing private preview GET route accepts a bounded `config` JSON query and `embedded=1`. It resolves the session, active membership, restaurant and branch/menu before using the supplied strict configuration, then validates every referenced media asset against that tenant and menu. Invalid/unowned configurations produce not-found behavior; infrastructure failures are not disguised as not-found. The route is dynamic and never writes a draft or revision. Its CSP and frame policy permit same-origin embedding only. Preview uses the restaurant's current real menu; the public showcase fixture is not substituted.

A 300ms debounce avoids a request for every keystroke. Invalid color contrast leaves the last valid preview visible with an error. Fullscreen preview uses Base UI focus management and mobile/tablet iframe sizes. Gallery previews have separate temporary state, so browsing does not overwrite staged edits. Saving still uses the original scoped, optimistic Server Action; publishing remains a separate authorized transaction. Restoring historical designs remains available.

Migration `0009_premium_template_catalog.sql` inserts 30 catalog rows with `ON CONFLICT DO NOTHING`; it does not change tables or update saved designs. Apply `pnpm db:migrate` before deploying this version. Readiness now requires the tenth migration. The public MenuData shape and ordering API are unchanged; its image allowlist additionally accepts the new owned demo illustrations.

## Adding a design

1. Add a stable kebab-case ID to `premiumTemplateIds` and one descriptor to `premiumCollection`. Choose an existing composition unless a genuinely different reading structure is needed. Keep text and primary/background contrast at least 4.5:1.
2. Add `.design-your-id` art direction in the premium stylesheet. Use the existing menu class hooks and CSS tokens; never duplicate search, detail, cart, locale or authorization code. If needed, add one reusable typed composition to `premium/renderer.tsx`.
3. Add `designDescription_your-id` to all three message catalogs. Keep fonts and assets local and approved. Decide whether optional 3D is appropriate; ordinary menus do not need it.
4. Generate an additive custom Drizzle migration for the new catalog row and inspect its SQL. Preserve existing statuses on conflict. Update readiness only when the migration count changes.
5. Run schema, PostgreSQL publication/isolation and browser checks. The template loops automatically include new IDs. Inspect 375/390/430/768px, long Cyrillic text, no photos, sold-out products, search, keyboard detail, contrast, reduced motion and no-JavaScript content.
6. With the production server running, capture new preview assets using `PLAYWRIGHT_BROWSERS_PATH=.local/browsers CAPTURE_COLLECTION=premium pnpm templates:capture`. Bump the appropriate preview version when changing existing art direction; never overwrite historical immutable URLs. Copy the generated public assets into standalone output and restart that server (Next indexes public files at startup). Review the resulting mobile and desktop images before publishing.

## 3D and motion architecture

Every menu now has a short opening composition derived from its template family or premium composition. The client boundary renders lightweight CSS 3D layers using the existing approved palette: editorial sheets for minimal/folio layouts, stacked poster planes for fast food, softer organic forms for coffee/paper, orbiting geometry for Asian/journey, arched forms for Uzbek/heritage, and deeper luminous rings for gallery/cinema/luxury. It introduces no remote model, image or additional dependency. The intro runs once per template in a browser session, can be dismissed with its localized Skip button or Escape, and never changes menu content or ordering behavior. `?intro=always` supports deliberate preview; `?intro=off` supports deterministic capture.

Motion-off themes do not render the intro. Reduced-motion and data-saving users receive the menu immediately; CSS also hides the server-rendered shell before animation in reduced-motion mode. The intro is decorative except for its accessible skip control and does not trap focus or block the underlying server-rendered menu. Existing R3F scenes remain optional enhancements for the five selected premium templates.

`components/visuals/scene-3d.tsx` is a small client boundary. Static server-rendered content is always present. Only an eligible, visible scene dynamically imports `scene-canvas.tsx`; Three.js and React Three Fiber stay out of normal menu execution. An error boundary and WebGL context-loss handler retain the static alternative. No remote models, HDR maps, sensors, permissions or third-party embeds are used.

`use-visual-policy.ts` is shared by scenes and CSS depth. It observes viewport intersection, document visibility, reduced-motion preference, data-saving preference and CPU hints. Hidden/offscreen scenes unmount and dispose GPU resources. Devices reporting two or fewer logical CPUs, reduced motion or save-data stay static. The canvas caps DPR at 1.25, uses low-power preference, low-segment procedural meshes and no postprocessing/shadow maps. This is a bounded enhancement, not a requirement for browsing or ordering.

The canvas exports reusable phone, plate, cup, ingredient and soft-light pieces. The landing composition adds fork/spoon forms and a generated local demo phone texture; it does not display private restaurant data. Selected templates can opt into the plate scene with a real photo/monogram fallback. `MotionSurface` adds at most three degrees of mouse-only card tilt; there is no gyroscope access. The four preset curves and four intensity levels share CSS variables; `off` and reduced motion disable transitions. CSS depth is used for gallery phones, and original static vector objects illustrate restaurant types and empty states without GPU contexts.

New runtime dependencies: `@react-three/fiber` **9.8.1**, `three` **0.186.1**. New development dependency: `@types/three` **0.186.0**. Fiber's installed React 19 peer range matches React 19.3. Drei, Spline and Framer Motion were unnecessary: procedural geometry and the existing CSS motion system cover the required behavior. Next.js 16.3.8 installed lazy-loading documentation and the official Fiber Canvas/scaling documentation were consulted before implementation.

## Demo data and limits

The immutable showcase now has nine categories and eighteen products, translated in Uzbek/Russian/English, with integer prices, descriptions/ingredients, owned original SVG artwork, allergens, availability and featured flags. It is only used by template showcase URLs. Existing restaurant data always wins on public/private restaurant routes. The current product contract does not support old prices, calories, spicy levels, new/popular tags or separate chef-recommendation flags; those were not invented or silently added. Featured continues to mean the existing chef's choice behavior.

Remaining refinement: owner review of the working illustrations/brand, photographic demo content if desired, and physical-device profiling beyond the automated Chromium checks. Video hosting/playback and new nutritional/product-tag fields are separate product extensions. Production deployment, external SMTP/storage and online payments retain their previously documented operational status. Exact verification results and file inventory are recorded in the upgrade report.
