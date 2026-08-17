import { eq } from "drizzle-orm";
import { db } from "@/db";
import { persons, relationships, treeMembers } from "@/db/schema";
import type { TreeAccess } from "./access";

export async function loadTreeDetail(access: TreeAccess) {
  const tree = access.tree;

  const members = await db
    .select({ member: treeMembers, person: persons })
    .from(treeMembers)
    .innerJoin(persons, eq(treeMembers.personId, persons.id))
    .where(eq(treeMembers.treeId, tree.id));

  const relationshipRows = await db
    .select()
    .from(relationships)
    .where(eq(relationships.treeId, tree.id));

  const total = members.length;
  const deceased = members.filter((m) => m.person.deathDate).length;
  const male = members.filter((m) => m.person.gender === "male").length;
  const female = members.filter((m) => m.person.gender === "female").length;
  const byGeneration: Record<number, number> = {};
  for (const m of members) {
    const generation = m.member.generation ?? -1;
    byGeneration[generation] = (byGeneration[generation] ?? 0) + 1;
  }

  return {
    tree,
    canEdit: access.canEdit,
    members: members.map((m) => ({ ...m.member, person: m.person })),
    relationships: relationshipRows,
    stats: { total, alive: total - deceased, deceased, male, female, byGeneration },
  };
}

export type TreeDetail = Awaited<ReturnType<typeof loadTreeDetail>>;
