import { computeChildrenMap, type RelationshipEdge } from "./generation";

export type FamilyRow = {
  unitId: string;
  memberIds: string[];
  generation: number;
  childMemberIds: string[];
};

export type FamilySection = {
  title: string;
  rows: FamilyRow[];
};

/**
 * Groups tree members into couple-or-single "family units" (a spouse pair renders as one row,
 * a member with no spouse is their own row), then buckets those rows into sections by whose
 * descendants they are — "Akar Silsilah Keluarga" for the root, "Keturunan X & Y" for each
 * subsequent couple's children — matching a family-record-book layout rather than a flat table.
 */
export function buildFamilySections(
  members: Array<{ id: string; generation: number | null }>,
  edges: RelationshipEdge[],
  nameOf: (memberId: string) => string,
): FamilySection[] {
  const spouseEdges = edges.filter((e) => e.type === "spouse");

  const unitIdOf = new Map<string, string>();
  const unitMemberIds = new Map<string, string[]>();
  for (const rel of spouseEdges) {
    const unitId = `couple-${rel.fromMemberId}-${rel.toMemberId}`;
    unitIdOf.set(rel.fromMemberId, unitId);
    unitIdOf.set(rel.toMemberId, unitId);
    unitMemberIds.set(unitId, [rel.fromMemberId, rel.toMemberId]);
  }
  for (const member of members) {
    if (unitIdOf.has(member.id)) continue;
    unitIdOf.set(member.id, member.id);
    unitMemberIds.set(member.id, [member.id]);
  }

  const childrenOf = computeChildrenMap(edges);
  const parentOf = new Map<string, string>();
  for (const [parent, children] of childrenOf) {
    for (const child of children) parentOf.set(child, parent);
  }

  const generationOf = new Map(members.map((m) => [m.id, m.generation ?? -1]));

  const unitChildren = new Map<string, string[]>();
  const unitParentUnit = new Map<string, string | null>();
  for (const [unitId, memberIds] of unitMemberIds) {
    const kids = new Set<string>();
    let parentUnit: string | null = null;
    for (const memberId of memberIds) {
      for (const child of childrenOf.get(memberId) ?? []) kids.add(child);
      const parent = parentOf.get(memberId);
      if (parent && !parentUnit) parentUnit = unitIdOf.get(parent) ?? null;
    }
    unitChildren.set(unitId, [...kids]);
    unitParentUnit.set(unitId, parentUnit);
  }

  function toRow(unitId: string): FamilyRow {
    const memberIds = unitMemberIds.get(unitId)!;
    return {
      unitId,
      memberIds,
      generation: Math.max(...memberIds.map((id) => generationOf.get(id) ?? -1)),
      childMemberIds: unitChildren.get(unitId) ?? [],
    };
  }

  function sectionTitle(parentUnitId: string): string {
    const names = unitMemberIds.get(parentUnitId)!.map(nameOf);
    return `Keturunan ${names.join(" & ")}`;
  }

  const byParent = new Map<string | null, string[]>();
  for (const unitId of unitMemberIds.keys()) {
    const parent = unitParentUnit.get(unitId) ?? null;
    const list = byParent.get(parent) ?? [];
    list.push(unitId);
    byParent.set(parent, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (generationOf.get(unitMemberIds.get(a)![0]!) ?? 0) - (generationOf.get(unitMemberIds.get(b)![0]!) ?? 0));
  }

  const sections: FamilySection[] = [];
  const rootUnits = byParent.get(null) ?? [];
  if (rootUnits.length > 0) {
    sections.push({ title: "Akar Silsilah Keluarga", rows: rootUnits.map(toRow) });
  }

  const queue = [...rootUnits];
  const visited = new Set(rootUnits);
  while (queue.length > 0) {
    const parentUnitId = queue.shift()!;
    const childUnits = byParent.get(parentUnitId) ?? [];
    if (childUnits.length > 0) {
      sections.push({ title: sectionTitle(parentUnitId), rows: childUnits.map(toRow) });
    }
    for (const childUnit of childUnits) {
      if (visited.has(childUnit)) continue;
      visited.add(childUnit);
      queue.push(childUnit);
    }
  }

  return sections;
}
