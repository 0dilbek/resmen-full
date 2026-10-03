# ADR 006 — Platform controls, manual billing, and anonymous event analytics

Status: implemented; operational hardening and browser verification tracked in implementation.md.

Platform grants and restaurant memberships remain independent. Platform access requires a verified MFA account and a database-backed session created after the grant and the user's last security/profile update, no older than 15 minutes. A deployment CLI issues/revokes grants; it never generates passwords. Platform mutations recheck authorization in a transaction, require a reason, and append an audit record. The base template cannot be blocked because it is the safety fallback.

Plans are immutable versions identified by unique codes. Administrators can retire a plan from new assignment without altering existing subscriptions. A tenant has at most one current subscription. Subscription expiry/cancellation falls back to documented Starter limits: one active branch, 100 active products, three active members and 100 MB image storage. Ordering is included. Limits are enforced under the tenant lock; reducing a plan does not delete existing content. It blocks further additions beyond the allowance.

No payment provider has been selected or supplied. Billing therefore records manually confirmed, referenced transfers against tenant-scoped subscriptions, with immutable amounts and auditable voiding. This is not online payment collection, settlement, or automated recurring billing. The UI states this limitation. Provider-specific charging/webhook work requires the chosen provider and credentials.

Anonymous analytics record bounded public menu/product/cart events and resolved QR opens, with event UUID deduplication and rate limits. No guest identity or raw IP is stored in event records. Dates use UTC and views are approximate; order counts/value come from authoritative order records and are explicitly not payment revenue. Reports enforce branch membership and use a consistent transaction snapshot. Events retain server-resolved tenant/branch/menu/product references protected by composite FKs. Template ID is server-derived; clients cannot label another tenant's traffic.

Marketing privacy text describes actual storage behavior; it is not a substitute for the operator's business-specific legal notice. Operator identity, retention policy approval, provider agreements and business pricing remain deployment/business configuration.

Public template demos now use an immutable, validated showcase DTO with original static illustration URLs, so production does not need a fake tenant/account or database seed. The image contract allows only the eight named original showcase SVG assets in addition to scoped media routes; uploaded SVGs remain rejected. Renderer and interaction code are unchanged between real menus and demos.
