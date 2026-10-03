# Product design system

Status: implemented in shared UI, dashboard and renderer styles. The tables below describe the design baseline; current contrast/keyboard/browser checks are recorded in implementation.md. Dashboard, cashier and public menus share Base UI primitives while retaining distinct information density.

## Dashboard foundations

| Area | Proposed rule |
| --- | --- |
| Typography | System sans initially; 12px supporting labels, 14px table/control copy, 16px body, 20/24/32px headings; body line-height 1.5 |
| Spacing | 4px base; 4/8/12/16/24/32/48px tokens; compact related fields, larger section separation |
| Containers | Fluid workspace; 1280px comfortable overview/form max, 720px primary form max; data tables can use wider content area |
| Sidebar | 240px desktop; tablet collapsible navigation; mobile focus-managed drawer |
| Breakpoints | Starting points 640/768/1024/1280px; test by content rather than assumed device names |
| Surfaces | Neutral page, raised white/light surface, 1px quiet borders; shadows only for overlays/elevation |
| Radius | 6px controls, 8px panels, 12px dialogs; pills for appropriate status/chips only |
| Controls | Visible labels, 40px desktop minimum control height, 44px touch targets on mobile/cashier; consistent focus ring |
| Tables | 44px minimum rows, clear headers, tabular prices, selected state, accessible overflow; mobile priority fields and row details |
| Dialogs | Small ~400px, standard ~560px, wide ~800px, all with viewport padding and scroll bounds; mobile sheet when appropriate |
| Icons | Lucide, consistent 16/20/24px sizes and stroke; no icon-only action without accessible name |
| Motion | Short purposeful state transitions, reduced-motion support; no animated decoration during ordering |

Define semantic tokens (`background`, `surface`, `foreground`, `muted`, `border`, `primary`, `focus`, `success`, `warning`, `danger`) instead of embedding palette values throughout components. Maintain distinct dashboard tokens and template tokens; a restaurant's theme cannot recolor platform danger/permission states.

Implementation uses small owned-source Button/ActionForm components with Base UI dialogs, the same primitive approach considered in the shadcn baseline. It does not claim a generated shadcn component library. Do not mix primitive implementations without a concrete need. The [official shadcn introduction](https://ui.shadcn.com/docs) explains its source ownership model; test customized behavior rather than assuming generated components stay accessible automatically.

## Navigation and hierarchy

Restaurant dashboard groups: Overview; Menu (categories, products, modifiers); Appearance (templates, brand, preview); Service (tables, QR, orders); Team; Analytics; Settings/Billing. Only show authorized destinations, while retaining server checks on all routes/actions. Display the selected restaurant and branch clearly; switching clears scoped client query caches and pending draft context safely.

Cashier has only a branch indicator, connection state, clear order queues, and focused order details/actions. It does not reuse the full owner navigation. Large status names, table label, elapsed time, notes and total are primary. Color reinforces status text; it is never the only distinction.

Platform administration has a separate visual context and navigation, prominently identifies support target, and asks for a reason within applicable support actions. Do not make it appear as an invisible owner login.

## Forms and states

Use simple server-backed forms when sufficient; React Hook Form plus runtime schemas for complex product/modifier editors. Required fields are explicit. Validate on the server even after client validation. Associate inline errors with fields, summarize errors when useful, preserve values after a recoverable error, and focus the first invalid field. Disable duplicate submission and show actual pending/success/error outcomes.

Each important flow has a defined state:

| State | Pattern |
| --- | --- |
| Loading | Stable-sized skeleton for known structure; inline pending state for a mutation; no full-screen spinner over existing content |
| Empty | Contextual explanation and one appropriate next action; distinguish no products from search with no results |
| Error | Plain-language consequence, retry/recovery when possible, correlation ID for support; never stack traces |
| Not found | Same response for missing and inaccessible foreign-tenant resources |
| Permission denied | Explain missing ability only inside an already-authorized tenant context; offer an authorized destination |
| Offline/stale | Keep readable cached screen state, label stale data, disable unsafe actions or expose retry; do not claim submission succeeded |
| Success | Inline confirmation for important changes; transient toast for secondary feedback; publish clearly names the live design |

Use a single toast implementation built on the selected accessible stack. Critical validation, disconnection and publication errors stay visible inline; they cannot exist only in a disappearing toast. Dialogs restore focus, trap it appropriately, support Escape where safe, and provide visible close controls.

## Public-menu requirements

Design at 320–430px first. Prices and names remain readable without horizontal scrolling; larger layouts enhance the same content. Sticky category navigation must not hide keyboard focus or product headings. Prefer category anchors as the non-JavaScript baseline. Product cards have correct heading structure, informative image alternatives, and large touch targets. Sold-out state is explicit text, not opacity alone.

Show enabled languages clearly and remember preference only as convenience. Do not assume every guest reads Uzbek. Support long Russian strings, Uzbek apostrophe variants, missing images, many categories, and restaurant-provided text bounds. Use locale-aware currency/number formatting.

Ordering-off menus show no dead cart controls. Ordering-on menus make required modifiers, price changes, notes, table context and final total clear before submission. Never use decorative animation to delay service. Decorative SVGs are hidden from assistive technology; meaningful logo/food images have appropriate alternatives.

## Accessibility and verification

Target WCAG 2.2 AA: normal text contrast at least 4.5:1, large text and applicable UI boundaries at least 3:1, visible keyboard focus, semantic landmarks, labels, zoom/reflow, and no color-only meaning. The contrast requirements follow W3C's [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) guidance. An automated scan alone is insufficient; test keyboard navigation, a screen reader smoke flow, reduced motion, 200% text enlargement and 320px reflow. Verify shared primitives and each structural template family.

Published template validation constrains configurable colors/fonts/geometry; screenshot and interaction tests cover remaining layout issues. Functional QR printouts preserve high contrast and the encoder-required quiet zone, with no motif over code modules. Scan exported PNG/SVG print proofs on more than one phone and at intended physical size before launch.


Accessibility refinements: platform muted ink is `#5f6a62`; public footer branding inherits the template foreground for dark palettes. Nonce-based CSP permits only application scripts while curated CSS variables control template appearance. Gallery/marketing views support 320px width. Automated axe results cover selected routes/families and do not replace full assistive-technology testing.


## Premium extension — 2026-10-03

The legacy collection remains compatible. A second collection adds 30 distinct designs, categorized real-data preview and strict sparse customization. See [premium engine / extension guide / 3D resource policy](premium-templates.md) and [upgrade verification report](premium-upgrade.md). The latter records exact completed checks and outstanding limits.
