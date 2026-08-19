import { eq } from "drizzle-orm";
import { db } from "@/db";
import { persons, relationships, treeMembers } from "@/db/schema";
import type { TreeAccess } from "./access";

const DESCENT_TYPES = new Set(["biological_child", "adopted_child", "child_in_law"]);

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

  // Order each parent's children right-to-left by birth date (oldest rightmost, youngest
  // leftmost) — everything downstream (the chart layout, the "Daftar Anak" list) renders
  // siblings in whatever order they appear here, so sorting once at the source keeps that
  // direction consistent everywhere without every consumer needing its own sort. Sorted
  // in-place per sibling group (by index, not by moving rows around freely) so unrelated rows —
  // spouse edges, other parents' children — are left completely undisturbed; a single sort()
  // over the whole array with a partial comparator (returning 0 for incomparable pairs) isn't
  // guaranteed correct, since V8's sort assumes a consistent total order and a same-parent group
  // can end up wrongly interleaved with itself.
  const birthDateByMemberId = new Map(members.map((m) => [m.member.id, m.person.birthDate]));
  const siblingGroupIndices = new Map<string, number[]>();
  relationshipRows.forEach((row, index) => {
    if (!DESCENT_TYPES.has(row.type)) return;
    const list = siblingGroupIndices.get(row.fromMemberId) ?? [];
    list.push(index);
    siblingGroupIndices.set(row.fromMemberId, list);
  });
  for (const indices of siblingGroupIndices.values()) {
    const sortedRows = [...indices]
      .sort((i, j) => {
        const dateA = birthDateByMemberId.get(relationshipRows[i]!.toMemberId);
        const dateB = birthDateByMemberId.get(relationshipRows[j]!.toMemberId);
        if (dateA && dateB) return dateB.localeCompare(dateA);
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return i - j;
      })
      .map((i) => relationshipRows[i]!);
    indices.forEach((slot, k) => {
      relationshipRows[slot] = sortedRows[k]!;
    });
  }

  const total = members.length;
  const deceased = members.filter((m) => m.person.deceased).length;
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
