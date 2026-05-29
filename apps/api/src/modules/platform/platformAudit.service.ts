import { platformQuery } from "../../config/db.js";

export async function logPlatformAction(input: {
  actorId: string;
  action: string;
  tenantId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await platformQuery(
    `INSERT INTO platform_audit_log (actor_id, action, tenant_id, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      input.actorId,
      input.action,
      input.tenantId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}
