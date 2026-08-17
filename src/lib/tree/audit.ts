import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(entry: {
  treeId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  diff?: unknown;
}) {
  await db.insert(auditLogs).values(entry);
}
