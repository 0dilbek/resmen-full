# ADR 003: Template publication and public cache

Date: 2026-09-16. Status: implemented through template publication.

## Context

Restaurants must experiment with design without disturbing a live menu. Thirty templates cannot duplicate fetching, localization, or order logic. Public menus need fast initial content without exposing drafts or serving a suspended restaurant from a stale whole-page cache.

## Decision

Use one versioned menu contract, shared behavior, family-specific server-rendered composition, and strict safe tokens. Keep a mutable private design draft and immutable published revisions. Publish atomically with optimistic concurrency, audit, and scoped invalidation. Catalog publication is separate: existing published item edits go live after commit; new items begin unpublished.

Run a small uncached public access/revision gate. Cache the larger normalized projection by tenant, branch/menu, locale and catalog/design/contract revisions. Build it from a consistent snapshot. Advance catalog revision in the data mutation transaction; the next gate read selects a new cache key without depending on asynchronous tag invalidation. Retain finite cache expiry. QR identifiers resolve through permanent records independent of template and slug.

## Alternatives and consequences

Full-page CDN caching can remove the control read but needs a durable invalidation strategy and explicit suspension/staleness guarantees. It is deferred. Revision keys cost old cache entries temporarily but make missed cleanup less dangerous. Thirty independent apps are rejected because correctness and maintenance would diverge. One universal markup tree is also insufficient; structural families can vary presentation while sharing behavior. Renderer versions and config migrations become a compatibility responsibility.

Implementation uses Next.js 16.3.8 `unstable_cache` with Cache Components disabled; the installed docs mark this as superseded by `use cache`, but the supported classic cache remains suitable for the explicit revision gate. A future Cache Components migration must preserve uncached suspension/status decisions. Projection reads run in a PostgreSQL repeatable-read transaction. Publication pins an immutable revision through a same-tenant/menu composite FK.


## 2026-10-03 extension: premium collection and transient preview

Preserve all 30 legacy IDs and introduce 30 explicit premium IDs, eleven reusable reading compositions and independent art direction. Version-1 config gains an optional strict `design` object; old revisions need no rewrite. Store overrides sparsely so a font/color edit does not reset unrelated presentation. The existing JSONB draft/revision tables remain authoritative. Catalog migration 0009 is additive and preserves platform status overrides.

Private preview accepts bounded JSON configuration in its existing GET route only after server-resolved membership/menu scope, Zod validation and owned-media validation. It is dynamic, same-origin framed, non-indexable and read-only. Browser preview state is separate from staged edits; no caching or database writes are introduced. Optional 3D is a client-only lazy enhancement behind a shared resource/motion policy; the server menu remains fully readable without it. See [implementation and extension guide](../premium-templates.md).
