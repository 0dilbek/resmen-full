export {};
// Run only from a trusted deployment shell. No web self-promotion endpoint exists.
try {
  process.loadEnvFile();
} catch {
  /* CI supplies environment */
}
const { Pool } = await import("pg");
const email = process.argv[2]?.trim().toLowerCase();
const revoke = process.argv.includes("--revoke");
if (!email || !email.includes("@"))
  throw new Error("Usage: pnpm admin:grant verified-email [--revoke]");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("begin");
  const { rows } = await client.query<{
    id: string;
    email_verified: boolean;
    two_factor_enabled: boolean;
  }>(
    "select id,email_verified,two_factor_enabled from auth_user where email=$1 for update",
    [email],
  );
  const account = rows[0];
  if (
    !account ||
    (!revoke && (!account.email_verified || !account.two_factor_enabled))
  )
    throw new Error("A verified account with enabled MFA is required");
  await client.query(
    "insert into platform_grant (user_id,active) values ($1,$2) on conflict (user_id) do update set active=$2,created_at=now()",
    [account.id, !revoke],
  );
  await client.query(
    "insert into audit_log (actor_id,scope,action,resource_id,reason) values ($1,'platform',$2,$1,'Trusted deployment CLI')",
    [account.id, revoke ? "platform.grant.revoked" : "platform.grant.issued"],
  );
  await client.query("commit");
  console.info(
    revoke
      ? "Grant revoked."
      : "Grant issued. Sign out, then sign in with MFA before opening /en/platform.",
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
