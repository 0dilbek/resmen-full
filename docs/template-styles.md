# Menu style families

Status: **30 templates in six families**, revised on 2026-09-17 following feedback about repetitive layouts. Edition 2 varies the first-screen composition as well as product cards and navigation. Versioned preview pairs are under `/template-previews/{id}/2/`; implementation.md records current verification.

## Four-template proof

Build `minimal-01` as the default public menu. Then build `luxury-01`, `fastfood-01`, and `uzbek-modern-01` to test distinct structural needs. Expand only after all four use the same data contract and shared behavior, pass mobile/accessibility checks, and support real-data previews without duplicated business logic.

## Thirty implemented designs

Each row specifies a meaningful structural difference beyond palette. Desktop variants improve composition without changing the customer workflow.

| ID | Working name | Composition, navigation, and card distinction |
| --- | --- | --- |
| `minimal-01` | Everyday | Compact masthead, sticky category rail, image-optional horizontal rows and aligned prices |
| `minimal-02` | Index | Category index opening, numbered section headings, text-led price columns; two-column desktop index |
| `minimal-03` | Gallery | Small centered identity, large image grid, filters above grid, compact metadata below photos |
| `minimal-04` | Market | Introductory featured strip followed by dense grouped rows; lightweight separators and utilitarian type |
| `minimal-05` | Journal | Editorial welcome, prominent category chapters, mixed featured spreads and small text entries |
| `luxury-01` | Evening | Full-width cover, elegant serif headings, long photographic sections, discreet sticky chapter navigation |
| `luxury-02` | Tasting | Intro and course index, narrow centered text-led sections, ingredient-forward entries and minimal photography |
| `luxury-03` | Portrait | Portrait image cards, gallery rhythm, small floating category selector, restrained metadata |
| `luxury-04` | Salon | Bordered section panels, classical centered headings, paired desktop columns, thin ornamental rules |
| `luxury-05` | Panorama | Wide category cover strips, split photo/text desktop rows, simple stacked mobile sections |
| `coffee-01` | Counter | Friendly compact brand header, pill navigation, small square photos and quick-scanning price rows |
| `coffee-02` | Bakehouse | Artisan editorial cover, landscape pastry cards, soft section backgrounds, ingredient-focused details |
| `coffee-03` | Roast | Text-first beverage board, size/modifier emphasis in shared detail UI, compact section tabs and tabular prices |
| `coffee-04` | Garden | Offset botanical corner accents, airy vertical cards, category dividers and optional cover illustration |
| `coffee-05` | Daily | Date-free specials-board composition, highlighted featured items, dense grouped list underneath |
| `fastfood-01` | Express | Bold masthead, high-contrast sticky categories, large food cards and prominent shared add controls |
| `fastfood-02` | Stack | Featured hero product, large stacked horizontal cards, short descriptions and strong price blocks |
| `fastfood-03` | Street | Typographic category banners, poster-like product tiles, angular framing and concise metadata |
| `fastfood-04` | Quick Pick | Dense compact grid, category chips, thumbnail-first cards, one-tap access to shared product details |
| `fastfood-05` | Grill | Wide image bands, hearty sectional headings, separated price rows and strong available/sold-out labels |
| `asian-01` | Paper | Quiet masthead, sharp grid lines, generous text-led rows and small square image accents |
| `asian-02` | Chapter | Tall sectional type, numbered course navigation, alternating wide photography and menu lists |
| `asian-03` | Bento | Modular card grid, strict rectangular frames, image and text blocks with consistent reading order |
| `asian-04` | Ink | High-contrast typographic cover, compact category index, sparse imagery and strong dividing rules |
| `asian-05` | Studio | Split desktop index/content, mobile sticky rail, asymmetrical featured composition with linear DOM order |
| `uzbek-modern-01` | Courtyard | Restrained arch cover frame, clean horizontal product rows, blue/sand accents, short geometric section separators |
| `uzbek-modern-02` | Tile | Modular rectangular photo grid, curated ceramic-inspired corners, compact category rail and price alignment |
| `uzbek-premium-01` | Evening Table | Deep-toned cover, refined serif headings, generous photographic sections and thin restrained frame details |
| `uzbek-suzani-01` | Gathering | Original floral-rhythm cover border, warm grouped family-menu sections, image-led featured dishes and calm body rows |
| `uzbek-ornament-minimal-01` | Fine Line | Typography-led masthead, ornament confined to tiny dividers, mostly text-first menu and highly legible pricing |

Working names are internal art-direction labels, not selected product brands or claims of cultural provenance. Asian/editorial layouts draw on compositional restraint and grid structure without fabricated script, stereotyped motifs, or pretending diverse food cultures have one visual identity.

## Shared design limits

Templates retain the same semantic product/detail/navigation behavior. Required text, allergens, prices, and sold-out state are never sacrificed for a layout. One menu can switch family without changing product data, stable links, or QR codes. Cart, modifier rules, language fallback, and ordering permissions do not change with design.

Template families specify allowed structural tokens. Restaurant overrides can alter safe color, curated fonts, approved logo/cover media, radius, image ratio, and supported decoration intensity; they cannot turn a luxury course layout into arbitrary CSS. Cultural motifs are optional, capped in intensity, and excluded from text, focus outlines, and functional QR areas.

## Preview and release criteria

Each shipped template needs renderer/contract tests, mobile and desktop preview screenshots, a long-content fixture, a no-images fixture, an ordering-disabled fixture, and uz/ru/en checks. Generate thumbnails from real code; do not present speculative mockups as shipped templates. Preview metadata includes template version and capture fixture revision. A retired template keeps rendering existing published configurations until an explicit compatible migration.

For culturally inspired assets, retain source notes, license/provenance, original composition rationale, and local design review. For every template, record which composition/navigation/card choices distinguish it from its closest sibling. If the only difference is a color change, treat it as a theme preset rather than counting another design.


## Edition 2 composition decisions

The previous shared centered identity made otherwise different card layouts look alike in the gallery. Identity text and language links are now shared semantic parts inside eight explicit intro compositions. The families arrange those parts independently:

| Family | First screens, in variant order | Distinguishing content layouts |
| --- | --- | --- |
| Minimal | Compact header; oversized directory title; image contact sheet; market ticket; split editorial cover | Left thumbnails; price ledger; square photo tiles; two-column compact rows; alternating editorial images |
| Luxury | Solid-color/photo banner; framed tasting booklet; portrait window; compact double-rule salon; split panorama | Alternating wide photography; narrow text-only courses; staggered portrait grid; circular photos in centered panels; category-wide images with two-column text |
| Coffee | Round counter seal; bakery arch; solid-color board; garden window; tear-off daily sheet | Circular thumbnails; landscape pastry panels; dotted price rows; arched cards; featured specials plus grouped rows |
| Fast food | Food collage; hero stack; oversized poster; compact shop masthead; grill banner | Strong card bottoms; horizontal stacks; framed poster tiles; dense quick-pick grid; wide section bands |
| Asian | Ruled folio; split chapter cover; rectangular collage; large type poster; offset studio window | Category sidebar; numbered photo chapters; contiguous bento cells; text-only ruled list; alternating images beside a category index |
| Uzbek | Arch; ceramic collage; framed evening spread; gathering window; compact centered script-like serif | Arched thumbnails; ceramic tiles; spacious photo pairs; rounded family sections; restrained text ledger |

No price, cart, authorization or publication rule is owned by these compositions. Existing theme IDs/configs are retained; this source-level renderer revision changes their appearance without modifying saved drafts or revision records. Colors remain compatible with validated published configurations. Small screens recompose window/collage/index layouts rather than scaling the desktop canvas down.


## Premium extension — 2026-10-03

The legacy collection remains compatible. A second collection adds 30 distinct designs, categorized real-data preview and strict sparse customization. See [premium engine / extension guide / 3D resource policy](premium-templates.md) and [upgrade verification report](premium-upgrade.md). The latter records exact completed checks and outstanding limits.
