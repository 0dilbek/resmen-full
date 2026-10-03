# ADR 001: Feature-first modular monolith

Date: 2026-09-16. Status: implemented; current validation is tracked in implementation.md.

## Context

The product has five interfaces but one closely related restaurant/menu/order domain and a small initial engineering operation. Splitting services would introduce network authorization boundaries, distributed transactions, deployment coordination, and extra monitoring before a scaling need is established.

## Decision

Use one Next.js App Router application, PostgreSQL, and external object storage. Organize by domain modules. Routes/UI call server use cases, which use Drizzle directly. Keep provider abstractions for storage and analytics, but no generic repository for all database tables. Use SQL migrations reviewed in source control.

Drizzle keeps relational joins, constraints and transaction behavior visible, which is important for composite tenant references and order concurrency. It still requires SQL review and PostgreSQL integration tests; type safety alone cannot establish authorization.

## Alternatives and consequences

Microservices and a separate API server are deferred. A monolith shares deployment and capacity, so a heavy workload can affect other surfaces. Bound uploads, queries, and connection pools and measure contention. Extract durable image processing or another service only after runtime limits, load, or team ownership justify it. Public DTOs and narrow domain boundaries preserve that option without paying for it now.
