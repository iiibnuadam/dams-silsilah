import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { TreeDetail } from "./detail";

const NODE_WIDTH = 112;
const NODE_HEIGHT = 122;
const RANK_GAP = 96;
const ROW_HEIGHT = NODE_HEIGHT + RANK_GAP;
const SPOUSE_GAP = 24;
const COUPLE_WIDTH = NODE_WIDTH * 2 + SPOUSE_GAP;
const MARRIAGE_NODE_SIZE = 20;
const DESCENT_TYPES = new Set(["biological_child", "adopted_child", "child_in_law"]);

export type PersonNodeData = {
  person: TreeDetail["members"][number]["person"];
  roleLabel: string;
  generation: number;
  hasChildren: boolean;
  hasSpouse: boolean;
  collapsed: boolean;
  onToggleCollapse?: () => void;
};

export type MarriageNodeData = {
  status: "married" | "divorced" | null;
  hasChildren: boolean;
  collapsed: boolean;
  onToggleCollapse?: () => void;
};

export type TreeNode = Node<PersonNodeData, "person"> | Node<MarriageNodeData, "marriage">;

/**
 * Lays out tree members by generation using dagre (top-to-bottom).
 *
 * Couples are grouped into one double-wide "family unit" *before* dagre runs, rather than laid
 * out as two independent nodes: dagre gets a single node per couple (width = two avatars + gap),
 * with descent edges pointing at the unit instead of at either member individually. This is what
 * actually guarantees spouses end up adjacent and non-overlapping — dagre's own sibling spacing
 * does the work, instead of a heuristic patched on after the fact. (An earlier version fed dagre
 * the two members separately and tried to special-case "a spouse with no children of their own"
 * after layout; that missed cases and could still collide with an unrelated sibling. A version
 * before that fed dagre a real zero-length edge between spouses, which crashes dagre 3.1.1 on
 * realistic multi-generation graphs.) A member with no spouse is simply a singleton unit.
 *
 * The marriage node (the small link-icon hub between a couple, and the source of their
 * children's edges) is derived after dagre.layout() from the unit's resolved position — dagre
 * never needs to know it exists.
 */
export function layoutTree(detail: Pick<TreeDetail, "members" | "relationships">): {
  nodes: TreeNode[];
  edges: Edge[];
} {
  const spouseEdges = detail.relationships.filter((r) => r.type === "spouse");

  // ponytail: a member's LAST spouse relationship wins if they have more than one (polygamy /
  // remarriage) — they end up grouped into whichever couple that was. Revisit if multi-spouse
  // trees become a real use case.
  const unitIdOf = new Map<string, string>(); // memberId -> family unit id
  const unitMembers = new Map<string, string[]>(); // unit id -> member ids in that unit
  for (const rel of spouseEdges) {
    const unitId = `couple-${rel.id}`;
    unitIdOf.set(rel.fromMemberId, unitId);
    unitIdOf.set(rel.toMemberId, unitId);
    unitMembers.set(unitId, [rel.fromMemberId, rel.toMemberId]);
  }
  for (const member of detail.members) {
    if (unitIdOf.has(member.id)) continue;
    unitIdOf.set(member.id, member.id);
    unitMembers.set(member.id, [member.id]);
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 56, ranksep: RANK_GAP });

  for (const [unitId, memberIds] of unitMembers) {
    graph.setNode(unitId, { width: memberIds.length === 2 ? COUPLE_WIDTH : NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const rel of detail.relationships) {
    if (!DESCENT_TYPES.has(rel.type)) continue;
    graph.setEdge(unitIdOf.get(rel.fromMemberId)!, unitIdOf.get(rel.toMemberId)!);
  }

  dagre.layout(graph);

  const memberById = new Map(detail.members.map((m) => [m.id, m]));
  // Same generation always means the same row, guaranteeing spouse pairs line up horizontally
  // regardless of what dagre's ranker did — dagre's y is only a fallback for members not yet
  // connected to the founder (generation -1), which have no reliable row of their own.
  function rowY(memberId: string): number {
    const member = memberById.get(memberId)!;
    const unitPos = graph.node(unitIdOf.get(memberId)!);
    return member.generation !== null && member.generation >= 0 ? member.generation * ROW_HEIGHT : unitPos.y - NODE_HEIGHT / 2;
  }

  // Split each couple's double-wide slot into its two members' actual x positions — left/right
  // order follows the relationship's own from/to order (arbitrary but stable; not assumed from
  // gender). A singleton just takes its unit's own center.
  const memberX = new Map<string, number>();
  for (const [unitId, memberIds] of unitMembers) {
    const unitX = graph.node(unitId).x;
    if (memberIds.length === 1) {
      memberX.set(memberIds[0]!, unitX);
    } else {
      const [leftId, rightId] = memberIds;
      memberX.set(leftId!, unitX - COUPLE_WIDTH / 2 + NODE_WIDTH / 2);
      memberX.set(rightId!, unitX + COUPLE_WIDTH / 2 - NODE_WIDTH / 2);
    }
  }

  const personNodes: Array<Node<PersonNodeData, "person">> = detail.members.map((member) => ({
    id: member.id,
    type: "person",
    position: { x: memberX.get(member.id)! - NODE_WIDTH / 2, y: rowY(member.id) },
    data: {
      person: member.person,
      roleLabel: member.roleLabel ?? "-",
      generation: member.generation ?? -1,
      hasChildren: false,
      hasSpouse: unitIdOf.get(member.id) !== member.id,
      collapsed: false,
    },
  }));

  // Sits at the same height as the couple's centers (not dropped below them) — right on top of
  // the straight connector line drawn between them, at the middle of their shared dagre slot.
  const marriageNodes: Array<Node<MarriageNodeData, "marriage">> = spouseEdges.map((rel) => {
    const x = graph.node(`couple-${rel.id}`).x;
    const y = rowY(rel.fromMemberId) + NODE_HEIGHT / 2;
    return {
      id: `marriage-${rel.id}`,
      type: "marriage",
      position: { x: x - MARRIAGE_NODE_SIZE / 2, y: y - MARRIAGE_NODE_SIZE / 2 },
      width: MARRIAGE_NODE_SIZE,
      height: MARRIAGE_NODE_SIZE,
      draggable: false,
      selectable: false,
      data: { status: rel.status, hasChildren: false, collapsed: false },
    };
  });

  // A straight line directly between the couple's own left/right handles — the marriage node
  // plays no part in this edge, it just happens to visually sit on top of its midpoint.
  const coupleEdges: Edge[] = spouseEdges.map((rel) => {
    const divorced = rel.status === "divorced";
    return {
      id: rel.id,
      source: rel.fromMemberId,
      sourceHandle: "right",
      target: rel.toMemberId,
      targetHandle: "left",
      type: "straight",
      style: divorced
        ? { stroke: "var(--muted-foreground)", strokeWidth: 1.5, strokeDasharray: "3 3" }
        : { stroke: "var(--female)", strokeWidth: 1.5 },
    };
  });

  const spouseRelByMember = new Map<string, string>();
  for (const rel of spouseEdges) {
    spouseRelByMember.set(rel.fromMemberId, rel.id);
    spouseRelByMember.set(rel.toMemberId, rel.id);
  }

  const descentEdges: Edge[] = detail.relationships
    .filter((rel) => DESCENT_TYPES.has(rel.type))
    .map((rel) => {
      const marriageRelId = spouseRelByMember.get(rel.fromMemberId);
      return {
        id: rel.id,
        source: marriageRelId ? `marriage-${marriageRelId}` : rel.fromMemberId,
        sourceHandle: "bottom",
        target: rel.toMemberId,
        targetHandle: "top",
        type: "smoothstep",
        pathOptions: { borderRadius: 10 },
        style: { stroke: "var(--primary)", strokeWidth: 1.5 },
      };
    });

  return { nodes: [...personNodes, ...marriageNodes], edges: [...coupleEdges, ...descentEdges] };
}
