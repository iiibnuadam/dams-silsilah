import { eq } from "drizzle-orm";
import { db } from "@/db";
import { relationships, treeMembers, trees } from "@/db/schema";
import { computeGenerations, findUltimateAncestor, type RelationshipEdge } from "./generation";

/**
 * Recomputes generation + role label for every member of a tree. Call after any
 * membership/relationship mutation.
 *
 * Also keeps `tree.founderPersonId` in sync: if a relationship now makes the current founder
 * someone's *child* (e.g. the user added a parent above them, extending the tree upward), the
 * founder shifts to that new topmost ancestor. Generation is always computed by walking down
 * from the founder, so without this, anyone added above the old founder would be stuck
 * "unreached" forever — which also breaks their chart position (see git history on this file).
 */
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

  let rootMember = founderMember;
  const ultimateAncestorId = findUltimateAncestor(founderMember.id, edges);
  if (ultimateAncestorId !== founderMember.id) {
    const ancestorMember = members.find((m) => m.id === ultimateAncestorId);
    if (ancestorMember) {
      rootMember = ancestorMember;
      await db.update(trees).set({ founderPersonId: ancestorMember.personId }).where(eq(trees.id, treeId));
    }
  }

  const positions = computeGenerations(
    members.map((m) => m.id),
    rootMember.id,
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
