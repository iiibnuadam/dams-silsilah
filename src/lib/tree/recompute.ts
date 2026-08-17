import { eq } from "drizzle-orm";
import { db } from "@/db";
import { relationships, treeMembers, trees } from "@/db/schema";
import { computeGenerations, type RelationshipEdge } from "./generation";

/** Recomputes generation + role label for every member of a tree. Call after any membership/relationship mutation. */
export async function recomputeTreeGenerations(treeId: string) {
  const tree = await db.query.trees.findFirst({ where: eq(trees.id, treeId) });
  if (!tree) return;

  const members = await db.query.treeMembers.findMany({ where: eq(treeMembers.treeId, treeId) });
  const founderMember = tree.founderPersonId
    ? members.find((m) => m.personId === tree.founderPersonId)
    : undefined;

  if (!founderMember) {
    // No founder designated yet — nothing to anchor generations to.
    return;
  }

  const relationshipRows = await db.query.relationships.findMany({ where: eq(relationships.treeId, treeId) });
  const edges: RelationshipEdge[] = relationshipRows.map((r) => ({
    fromMemberId: r.fromMemberId,
    toMemberId: r.toMemberId,
    type: r.type,
  }));

  const positions = computeGenerations(
    members.map((m) => m.id),
    founderMember.id,
    edges,
  );

  await db.transaction(async (tx) => {
    for (const member of members) {
      const position = positions.get(member.id);
      if (!position) continue;
      await tx
        .update(treeMembers)
        .set({ generation: position.generation, roleLabel: position.roleLabel })
        .where(eq(treeMembers.id, member.id));
    }
  });
}
