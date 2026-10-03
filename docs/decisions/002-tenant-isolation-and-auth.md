# ADR 002: Tenant identity and authorization

Date: 2026-09-16. Status: implemented; current validation is tracked in implementation.md.

## Context

A user may belong to several restaurants with different roles. Public menus require anonymous read access, while platform support must be distinct from tenant administration. Authentication packages do not automatically enforce our resource ownership rules.

## Decision

Use Better Auth for identity/session lifecycle and application-owned memberships for fixed restaurant roles and branch grants. Do not enable a second organization membership source of truth. Keep platform grants separate. Use shared PostgreSQL tables with explicit restaurant scope, composite tenant/parent foreign keys, centralized policies, and scoped server queries.

No per-tenant database/schema in the initial release. No partly configured RLS presented as protection: application isolation is the initial read/write authorization boundary, with database composite constraints protecting relationship integrity. Use a restricted runtime DB role separate from migrations.

## Alternatives and consequences

Per-tenant databases offer a stronger physical boundary but complicate migrations, pooling, cross-tenant operations, and cost. Full RLS could protect against omitted predicates but adds connection-context, public-read, auth-table, and platform-operation complexity. PostgreSQL role ownership and bypass behavior require careful setup; see [official row security documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

Deferring RLS leaves omitted read filters as a material risk. Require two-tenant PostgreSQL integration tests, explicit branch predicates, query review, and restricted module entry points before public exposure. If a contractual isolation requirement or increasing team/query complexity warrants RLS, introduce it with a tested transaction-local tenant context and dedicated roles; retain application authorization as well.
