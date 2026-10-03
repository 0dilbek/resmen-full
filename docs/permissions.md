# Authorization and permissions

Status: implemented policy baseline with PostgreSQL and browser verification tracked in implementation.md. The implementation groups fine-grained catalog/template permissions into `catalog:manage` and `template:manage`; restaurant archival is not currently exposed in the product.

## Two independent scopes

`PlatformGrant(userId, PLATFORM_SUPER_ADMIN)` controls platform operations. `Membership(userId, restaurantId, role, status, branchScope)` controls restaurant operations. A platform administrator has **no implicit restaurant membership**. An owner of restaurant A has no rights in B. One user can have different roles at different restaurants.

Restaurant roles are RESTAURANT_OWNER, RESTAURANT_ADMIN, RESTAURANT_MANAGER, and CASHIER. Fixed role-to-permission maps live in the memberships module initially; do not build configurable Role/Permission tables until custom roles are actually required. There is no numeric role ranking that grants every lesser role's permissions automatically.

Branch scope is ALL or ASSIGNED. Owners/admins require ALL; managers may be restricted; cashiers require explicit assignments. The server intersects every branch request with that scope. Menu/category/product ownership resolves through the branch, even if the input only contains a product ID. Restaurant-wide fields are not writable by a branch-scoped manager.

## Restaurant permission matrix

All grants require active membership, applicable restaurant state, and resource ownership. “Branch” means only permitted branches. A dash means deny.

| Permission | Owner | Admin | Manager | Cashier |
| --- | --- | --- | --- | --- |
| `restaurant:read` | Yes | Yes | Operational subset | Name/branch subset |
| `restaurant:update` (profile, locales, currency) | Yes | Yes | — | — |
| `branch:manage` (create/archive/configure) | Yes | Yes | — | — |
| `catalog:read` | Yes | Yes | Branch | Order-required subset |
| `category:manage` / `product:manage` / `modifier:manage` | Yes | Yes | Branch | — |
| `product:availability` | Yes | Yes | Branch | — |
| `media:upload` / `media:attach` | Yes | Yes | For editable branch resource | — |
| `menu:publish` / `menu:unpublish` | Yes | Yes | Branch | — |
| `template:preview` / `template:draft` / `template:publish` | Yes | Yes | Branch | — |
| `table:manage` / `qr:manage` | Yes | Yes | Branch/table QR only | — |
| `order:read` / `order:transition` | Yes | Yes | Branch | Branch |
| `analytics:read` | Yes | Yes | Branch aggregates | — |
| `member:read` | Yes | Yes | — | — |
| `member:manage` manager/cashier | Yes | Yes | — | — |
| `member:manage` admin | Yes | — | — | — |
| `owner:transfer` / owner grant or removal | Yes, special flow | — | — | — |
| `billing:manage` | Yes | — | — | — |
| `audit:read` tenant-safe projection | Yes | Yes | — | — |
| `restaurant:archive` | Yes, recent auth | — | — | — |

Media is tenant-owned but managers cannot enumerate all restaurant assets through an upload capability. Upload intent must identify a permitted editable resource or scoped draft menu; completion and attachment repeat ownership checks. Restaurant logo/profile uploads require `restaurant:update`. Managers can reuse only assets exposed by their authorized menus, while owners/admins can browse the tenant library. Public media is not confidential once published, but unpublished media must remain private.

The permission names are stable domain identifiers. Commands still validate feature flags and state: `order:transition` does not allow arbitrary status values; `template:publish` does not allow blocked template IDs; a revoked plan entitlement is not restored by a role.

## Protected request sequence

1. Establish a trusted session through the auth server adapter. Return unauthenticated for a missing/expired session. Never trust an actor ID from the request.
2. Validate the requested restaurant identifier, load the restaurant, and resolve the active membership. For an unknown/inaccessible tenant return the same not-found response.
3. Apply the named permission and branch scope from the central policy, with explicit restaurant-state handling.
4. Parse the complete external input with its strict runtime schema; reject unknown privileged fields rather than spreading request objects into updates.
5. Fetch resource and parent records with restaurant and allowed-branch constraints. Never authorize a global-ID result after already leaking it to a component or log.
6. In the transaction, lock/recheck security-sensitive membership/state where revocation races matter, validate the current resource version, and apply changes to tenant-scoped predicates. Record audit information atomically when required.
7. After commit, invalidate only the affected public menu projection and return a narrow result. Log internal context using a correlation ID; return safe messages to the client.

Reject oversized/malformed requests and apply coarse rate limits before expensive work. Runtime parsing of simple route IDs necessarily precedes tenant lookup; it is not a substitute for authorization. The sequence above is a security checklist, not a requirement to defer all parsing until step 4.

Conceptual signatures (not framework APIs): `requireRestaurantActor({ restaurantId, permission })`, `requireBranchScope(actor, branchId)`, and `updateProduct(actor, validatedInput)`. The actor is created on the server and passed internally, never accepted as a serialized client argument. Scoped reads follow the same policy even when no mutation occurs.

## Owner, membership, and suspension protections

- Every non-archived restaurant must retain at least one active owner. Serialize owner changes by locking the restaurant row, then re-check the owner count before commit. A UI warning alone cannot enforce this.
- Only an owner can promote an admin or transfer ownership. Admins cannot update an owner/admin record, grant a role they do not control, or promote themselves. An invitation cannot convey more authority than the inviter has.
- Ownership transfer requires a verified recipient, recent authentication, and an audited transaction. Never transfer to an unaccepted email address and strand the business.
- Membership revocation takes effect on the next authorized request. Revalidate allowed branches rather than trusting stale cookies or client state.
- DRAFT tenants allow authorized setup but no public browsing. SUSPENDED tenants block public menus, uploads, catalog changes, and new orders. Owners retain restricted account/billing/support access; staff retain access to already-created orders to complete/cancel them under the normal state machine, with this exception audited. ARCHIVED tenants have no operational writes.
- User-account deletion must resolve active ownership and retained audit references. Restaurant suspension is exclusively a platform action; owners cannot reactivate themselves.

## Platform policy

Require active PLATFORM_SUPER_ADMIN grant, MFA, and recent authentication for destructive/high-impact actions. Revalidate the grant on each request. Platform commands are explicit permissions such as `platform:restaurant:list`, `platform:restaurant:suspend`, `platform:template:manage`, `platform:plan:manage`, and `platform:audit:read`. No wildcard bypass of tenant commands.

Support operations accept a target restaurant and required reason, minimize returned information, and audit actual actor, target, operation, result, and correlation ID. Do not implement silent impersonation or session swapping. If catalog support edits become necessary, create narrowly defined support commands with separate authorization and an audit trail; do not manufacture owner membership.

Admin pages, exports, and counts are uncached/private. Feature flags and billing webhooks use trusted server configuration/verified provider events, not claims made by browser clients. Bootstrap the first platform grant through a controlled deployment operation with no public self-promotion endpoint.

## Public capabilities

Public menu access needs no account, but it only resolves active published data. Public DTOs exclude emails, memberships, audit history, cost/private notes, internal billing state, and drafts. Preview requires membership even if someone guesses a menu/template ID.

Public order creation is a separate rate-limited capability that resolves an active TABLE QR and validates a bounded request against live catalog data. QR IDs and product IDs convey context, not administrative permission. Guests receive only their order through a separate high-entropy credential, stored hashed and excluded from logs. There is no guest endpoint that lists a table's historical orders. A guest cannot advance cashier statuses. Guest cancellation, payments, and refunds are deferred.

Cookie-authenticated writes enforce origin/CSRF controls appropriate to the installed auth/framework integration. Apply trusted-origin checks also to public browser mutations, payload limits, and a production rate-limit store shared across instances; an in-memory limiter is suitable only for development. No wildcard credentialed CORS. Rate limits cover login/reset, uploads, orders, QR/event abuse, and costly exports, with per-actor/tenant/context limits plus carefully bounded IP controls for shared restaurant Wi-Fi.

## Required acceptance tests by implementation phase

| Area | Required adversarial cases |
| --- | --- |
| Tenant reads/writes | User A substitutes tenant B's product/category/media/menu IDs in URL, form, JSON, query, and export; reads disclose nothing and writes change nothing |
| Composite references | Valid A scope with B parent IDs fails at DB level; same-tenant product cannot reference another menu's category/modifier |
| Branch scopes | Assigned cashier/manager cannot access another branch or broaden scope through a request field; removed assignment takes effect |
| Role matrix | Enumerate each permission for each role; anonymous/unknown roles deny; cashier cannot reach profile, team, templates, or billing |
| Owners | Concurrent demotions cannot remove the last owner; admin cannot alter owner/admin privileges |
| Platform boundary | Platform grant alone fails tenant command authorization; tenant owner fails platform command authorization; support action records true actor |
| Suspension/publication | Suspended/unpublished menu and stale cached revision cannot bypass the access gate; draft preview remains private |
| Orders | Foreign/detached modifiers, forged prices, repeated submission, conflicting transitions, unauthenticated order lookup all fail safely |
| Uploads | Foreign tenant completion/attachment, forged MIME, excessive size/dimensions, and replay after finalization cannot publish unsafe assets |

Use PostgreSQL integration tests for constraints, transaction races, and real authorization queries. Unit tests cover the policy matrix and state machine. Playwright tests verify that calling a denied action directly fails, in addition to checking visible navigation.
