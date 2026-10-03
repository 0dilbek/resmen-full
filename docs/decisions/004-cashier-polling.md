# ADR 004: Cashier polling first

Date: 2026-09-16. Status: implemented in Phase 8.

## Context

Cashiers need clear new-order indicators and reliable status changes on imperfect networks. There is no measured concurrency or latency requirement that justifies persistent connection infrastructure yet.

## Decision

Begin with authenticated, branch-scoped polling at a target five-second foreground interval, with bounded cursor-based pages and reconnect backoff. Pause when hidden, refresh on focus, and show last successful sync/connection state. Use TanStack Query only for this client server-state need. Initial order board reads can remain server-rendered.

Cursor reads use `(updated_at, id)` with a small overlapping time window and deduplication by order ID/version so equal timestamps or concurrent commits do not silently disappear. Include terminal status updates so orders leave open queues correctly. Periodically reconcile a bounded authoritative open-order snapshot. If a cursor expires, resync; pagination must not silently drop a busy branch's orders.

Commands are transactional and version-checked regardless of delivery mechanism. A pending/failed mutation is visibly distinct from a committed state. Do not automatically replay ambiguous transitions as new transitions or claim offline order acceptance.

## Alternatives and consequences

Polling causes repeated requests and bounded notification delay, but works with ordinary request infrastructure and recovers naturally. Measure cashier count, query cost and observed delay. Consider SSE for lower-latency one-way updates if those measurements justify long-lived connections or a provider; WebSockets require a demonstrated bidirectional need. The order query/event contract remains independent of the transport.

## Implementation adjustment — 2026-09-16

The shipped first board uses TanStack Query 5.103.0 and a bounded, authoritative status-filtered snapshot every five seconds, with explicit page count and navigation (40 orders/page), rather than incremental cursor merging. This removes cursor/deduplication failure modes at the initial operating scale, includes terminal states in selectable tabs, and avoids silently truncating a busy queue. Snapshot reads use a repeatable-read transaction. Background polling pauses, focus refetches, connection failures back off, and authorization failures stop polling and hide cached data. Mutation errors refresh state and are never shown as successful optimistic transitions. Revisit incremental cursors when measured polling cost warrants it.
