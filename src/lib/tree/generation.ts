export type RelationshipType = "biological_child" | "adopted_child" | "child_in_law" | "spouse";

export type RelationshipEdge = {
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
};

export type MemberPosition = {
  generation: number;
  roleLabel: string;
};

// Both flow generation top-down like a parent->child edge; child_in_law additionally forces
// the "Menantu" role label instead of the usual by-generation label.
const DESCENT_TYPES = new Set<RelationshipType>(["biological_child", "adopted_child", "child_in_law"]);

const GENERATION_LABELS = ["Pendiri", "Anak", "Cucu", "Cicit"];

function generationLabel(generation: number): string {
  if (generation < GENERATION_LABELS.length) return GENERATION_LABELS[generation]!;
  return `Cicit Gen ${generation - GENERATION_LABELS.length + 2}`;
}

/**
 * Computes each member's generation depth from the founder and a human-readable role label,
 * by BFS over descent edges. A member is labeled "Menantu" if they married into the family
 * (a spouse edge to someone already positioned) or were added directly via a child_in_law edge.
 * ponytail: recomputes the whole tree on every mutation (O(members + relationships)) instead of
 * an incremental update — fine for the "hundreds of members" scale in the NFR; revisit if a tree
 * grows into the thousands and this becomes a hot path.
 */
export function computeGenerations(
  memberIds: string[],
  founderMemberId: string,
  edges: RelationshipEdge[],
): Map<string, MemberPosition> {
  const childrenOf = new Map<string, string[]>();
  const spouseOf = new Map<string, string[]>();
  const inLawTargets = new Set<string>();

  for (const edge of edges) {
    if (DESCENT_TYPES.has(edge.type)) {
      const list = childrenOf.get(edge.fromMemberId) ?? [];
      list.push(edge.toMemberId);
      childrenOf.set(edge.fromMemberId, list);
      if (edge.type === "child_in_law") inLawTargets.add(edge.toMemberId);
    } else if (edge.type === "spouse") {
      for (const [a, b] of [
        [edge.fromMemberId, edge.toMemberId],
        [edge.toMemberId, edge.fromMemberId],
      ] as const) {
        const list = spouseOf.get(a) ?? [];
        list.push(b);
        spouseOf.set(a, list);
      }
    }
  }

  const generations = new Map<string, number>();
  const marriedIn = new Set<string>();
  const queue: string[] = [founderMemberId];
  generations.set(founderMemberId, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const generation = generations.get(current)!;

    for (const spouse of spouseOf.get(current) ?? []) {
      if (!generations.has(spouse)) {
        generations.set(spouse, generation);
        marriedIn.add(spouse);
        queue.push(spouse);
      }
    }

    for (const child of childrenOf.get(current) ?? []) {
      if (!generations.has(child)) {
        generations.set(child, generation + 1);
        queue.push(child);
      }
    }
  }

  const result = new Map<string, MemberPosition>();
  for (const memberId of memberIds) {
    const generation = generations.get(memberId);
    if (generation === undefined) {
      // Unreached: not (yet) connected to the founder by any known path.
      result.set(memberId, { generation: -1, roleLabel: "Belum terhubung" });
      continue;
    }
    const isInLaw = (marriedIn.has(memberId) || inLawTargets.has(memberId)) && generation > 0;
    result.set(memberId, { generation, roleLabel: isInLaw ? "Menantu" : generationLabel(generation) });
  }
  return result;
}

/** Direct children (by descent edges) of every member — used both for the ancestry BFS and to know which nodes can be collapsed. */
export function computeChildrenMap(edges: RelationshipEdge[]): Map<string, string[]> {
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    if (!DESCENT_TYPES.has(edge.type)) continue;
    const list = childrenOf.get(edge.fromMemberId) ?? [];
    list.push(edge.toMemberId);
    childrenOf.set(edge.fromMemberId, list);
  }
  return childrenOf;
}

/** Every member below `memberId` in the descent tree (children, grandchildren, ...), for collapsing a branch. */
export function getDescendantMemberIds(memberId: string, edges: RelationshipEdge[]): Set<string> {
  const childrenOf = computeChildrenMap(edges);
  const descendants = new Set<string>();
  const stack = [...(childrenOf.get(memberId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (descendants.has(current)) continue;
    descendants.add(current);
    stack.push(...(childrenOf.get(current) ?? []));
  }
  return descendants;
}

/**
 * Returns true if adding a child edge (parentMemberId -> childMemberId) would create a cycle,
 * i.e. childMemberId is already an ancestor of parentMemberId via existing child edges.
 */
export function wouldCreateCycle(
  parentMemberId: string,
  childMemberId: string,
  edges: RelationshipEdge[],
): boolean {
  if (parentMemberId === childMemberId) return true;

  const parentsOf = new Map<string, string[]>();
  for (const edge of edges) {
    if (!DESCENT_TYPES.has(edge.type)) continue;
    const list = parentsOf.get(edge.toMemberId) ?? [];
    list.push(edge.fromMemberId);
    parentsOf.set(edge.toMemberId, list);
  }

  const stack = [parentMemberId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === childMemberId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const parent of parentsOf.get(current) ?? []) {
      stack.push(parent);
    }
  }
  return false;
}
