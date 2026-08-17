import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { relationships, treeMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { assertCanEdit, resolveTreeAccess } from "@/lib/tree/access";
import { logAudit } from "@/lib/tree/audit";
import { wouldCreateCycle, type RelationshipEdge } from "@/lib/tree/generation";
import { recomputeTreeGenerations } from "@/lib/tree/recompute";

const DESCENT_TYPES = new Set(["biological_child", "adopted_child", "child_in_law"]);

const relationshipFields = z.object({
  fromMemberId: z.uuid(),
  toMemberId: z.uuid(),
  type: z.enum(["biological_child", "adopted_child", "child_in_law", "spouse"]),
  status: z.enum(["married", "divorced"]).optional(),
});

/** Member-existence and cycle validation shared by create/update, excluding the relationship being edited (if any) from the cycle check since it's about to be replaced. */
async function assertValidRelationship(
  treeId: string,
  input: z.infer<typeof relationshipFields>,
  excludeRelationshipId?: string,
) {
  const members = await db.query.treeMembers.findMany({ where: eq(treeMembers.treeId, treeId) });
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(input.fromMemberId) || !memberIds.has(input.toMemberId)) {
    throw new Error("Anggota tidak ditemukan di silsilah ini.");
  }

  if (DESCENT_TYPES.has(input.type)) {
    const existing = await db.query.relationships.findMany({ where: eq(relationships.treeId, treeId) });
    const edges: RelationshipEdge[] = existing
      .filter((r) => r.id !== excludeRelationshipId)
      .map((r) => ({ fromMemberId: r.fromMemberId, toMemberId: r.toMemberId, type: r.type }));
    if (wouldCreateCycle(input.fromMemberId, input.toMemberId, edges)) {
      throw new Error("Relasi ini akan membuat siklus (seseorang menjadi leluhur dirinya sendiri).");
    }
  }
}

export const createRelationship = createServerFn({ method: "POST" })
  .inputValidator(relationshipFields.extend({ treeId: z.uuid(), shareToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id, shareToken: data.shareToken });
    assertCanEdit(access);
    await assertValidRelationship(data.treeId, data);

    const [relationship] = await db
      .insert(relationships)
      .values({
        treeId: data.treeId,
        fromMemberId: data.fromMemberId,
        toMemberId: data.toMemberId,
        type: data.type,
        status: data.status,
      })
      .returning();

    await recomputeTreeGenerations(data.treeId);
    await logAudit({
      treeId: data.treeId,
      actorId: user?.id ?? null,
      action: "create_relationship",
      entityType: "relationship",
      entityId: relationship!.id,
      diff: { type: data.type, fromMemberId: data.fromMemberId, toMemberId: data.toMemberId },
    });
    return relationship;
  });

export const updateRelationship = createServerFn({ method: "POST" })
  .inputValidator(
    relationshipFields.extend({ treeId: z.uuid(), shareToken: z.string().optional(), relationshipId: z.uuid() }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id, shareToken: data.shareToken });
    assertCanEdit(access);
    await assertValidRelationship(data.treeId, data, data.relationshipId);

    const [relationship] = await db
      .update(relationships)
      .set({
        fromMemberId: data.fromMemberId,
        toMemberId: data.toMemberId,
        type: data.type,
        status: data.status ?? null,
      })
      .where(and(eq(relationships.id, data.relationshipId), eq(relationships.treeId, data.treeId)))
      .returning();
    if (!relationship) throw new Error("Relasi tidak ditemukan.");

    await recomputeTreeGenerations(data.treeId);
    await logAudit({
      treeId: data.treeId,
      actorId: user?.id ?? null,
      action: "update_relationship",
      entityType: "relationship",
      entityId: relationship.id,
      diff: { type: data.type, fromMemberId: data.fromMemberId, toMemberId: data.toMemberId },
    });
    return relationship;
  });

export const deleteRelationship = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid(), relationshipId: z.uuid(), shareToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id, shareToken: data.shareToken });
    assertCanEdit(access);

    await db
      .delete(relationships)
      .where(and(eq(relationships.id, data.relationshipId), eq(relationships.treeId, data.treeId)));

    await recomputeTreeGenerations(data.treeId);
    await logAudit({
      treeId: data.treeId,
      actorId: user?.id ?? null,
      action: "delete_relationship",
      entityType: "relationship",
      entityId: data.relationshipId,
    });
    return { ok: true };
  });
