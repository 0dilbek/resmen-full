# Architecture decision records

The initial decisions guide the implemented modular monolith. Individual records describe deviations and verification; see implementation.md for release status.

| Record | Decision |
| --- | --- |
| [001](001-modular-monolith.md) | One feature-first Next.js application and direct Drizzle queries |
| [002](002-tenant-isolation-and-auth.md) | Shared-schema tenancy, composite FKs, Better Auth identity, application memberships |
| [003](003-template-publication-and-cache.md) | Shared renderer contract, immutable design publications, revision-keyed public cache |
| [004](004-cashier-polling.md) | Polling first for cashier updates |
| [006](006-platform-billing-analytics.md) | Independent platform privilege, manual billing and anonymous event analytics |

Create a new record or explicitly supersede an existing record when a significant boundary changes. Record concrete evidence and consequences; do not accumulate ceremonial records for routine implementation choices.
