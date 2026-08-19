import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGenerations,
  findUltimateAncestor,
  getDescendantMemberIds,
  getHiddenByCollapse,
  wouldCreateCycle,
  type RelationshipEdge,
} from "./generation.ts";

// Founder (F) -> Child (C) -> Grandchild (G) -> GreatGrandchild (GG), C married to Spouse (S).
const edges: RelationshipEdge[] = [
  { fromMemberId: "F", toMemberId: "C", type: "biological_child" },
  { fromMemberId: "C", toMemberId: "S", type: "spouse" },
  { fromMemberId: "C", toMemberId: "G", type: "adopted_child" },
  { fromMemberId: "G", toMemberId: "GG", type: "biological_child" },
];

test("computeGenerations assigns increasing depth down the blood line", () => {
  const result = computeGenerations(["F", "C", "S", "G", "GG"], "F", edges);
  assert.equal(result.get("F")?.generation, 0);
  assert.equal(result.get("F")?.roleLabel, "Pendiri");
  assert.equal(result.get("C")?.generation, 1);
  assert.equal(result.get("C")?.roleLabel, "Anak");
  assert.equal(result.get("G")?.generation, 2);
  assert.equal(result.get("G")?.roleLabel, "Cucu");
  assert.equal(result.get("GG")?.generation, 3);
  assert.equal(result.get("GG")?.roleLabel, "Cicit");
});

test("computeGenerations labels a married-in spouse as Menantu at the partner's generation", () => {
  const result = computeGenerations(["F", "C", "S"], "F", edges);
  assert.equal(result.get("S")?.generation, 1);
  assert.equal(result.get("S")?.roleLabel, "Menantu");
});

test("computeGenerations labels a direct child_in_law edge as Menantu", () => {
  const inLawEdges: RelationshipEdge[] = [
    { fromMemberId: "F", toMemberId: "C", type: "biological_child" },
    { fromMemberId: "F", toMemberId: "M", type: "child_in_law" },
  ];
  const result = computeGenerations(["F", "C", "M"], "F", inLawEdges);
  assert.equal(result.get("M")?.generation, 1);
  assert.equal(result.get("M")?.roleLabel, "Menantu");
});

test("computeGenerations marks members unreachable from the founder", () => {
  const result = computeGenerations(["F", "Orphan"], "F", edges);
  assert.equal(result.get("Orphan")?.generation, -1);
});

test("wouldCreateCycle detects a member becoming their own ancestor", () => {
  assert.equal(wouldCreateCycle("GG", "F", edges), true);
  assert.equal(wouldCreateCycle("F", "F", edges), true);
});

test("wouldCreateCycle allows a normal new descent edge", () => {
  assert.equal(wouldCreateCycle("GG", "NewMember", edges), false);
});

test("getDescendantMemberIds collects the whole subtree below a member, spouse excluded", () => {
  const descendants = getDescendantMemberIds("C", edges);
  assert.deepEqual([...descendants].sort(), ["G", "GG"]);
  assert.equal(descendants.has("S"), false, "a spouse is not a descendant, only children are");
});

test("getDescendantMemberIds returns empty set for a leaf member", () => {
  assert.equal(getDescendantMemberIds("GG", edges).size, 0);
});

test("getHiddenByCollapse hides a hidden member's spouse when the spouse has no blood parent of their own", () => {
  const hidden = getHiddenByCollapse(["F"], edges);
  assert.deepEqual([...hidden].sort(), ["C", "G", "GG", "S"]);
});

test("getHiddenByCollapse keeps a spouse visible if they have their own blood parent elsewhere", () => {
  const cousinEdges: RelationshipEdge[] = [
    { fromMemberId: "F1", toMemberId: "C1", type: "biological_child" },
    { fromMemberId: "F2", toMemberId: "X", type: "biological_child" },
    { fromMemberId: "C1", toMemberId: "X", type: "spouse" },
  ];
  const hidden = getHiddenByCollapse(["F1"], cousinEdges);
  assert.deepEqual([...hidden].sort(), ["C1"]);
  assert.equal(hidden.has("X"), false, "X has their own blood parent (F2), so stays visible");
});

test("getHiddenByCollapse cascades to a hidden spouse's own children", () => {
  const remarriageEdges: RelationshipEdge[] = [
    { fromMemberId: "F", toMemberId: "C", type: "biological_child" },
    { fromMemberId: "C", toMemberId: "S", type: "spouse" },
    { fromMemberId: "S", toMemberId: "StepChild", type: "child_in_law" },
  ];
  const hidden = getHiddenByCollapse(["F"], remarriageEdges);
  assert.deepEqual([...hidden].sort(), ["C", "S", "StepChild"]);
});

test("findUltimateAncestor stays put when the founder already has no parent", () => {
  assert.equal(findUltimateAncestor("F", edges), "F");
});

test("findUltimateAncestor walks up through a newly added parent above the current founder", () => {
  const withGrandparent: RelationshipEdge[] = [...edges, { fromMemberId: "GreatGrandparent", toMemberId: "F", type: "biological_child" }];
  assert.equal(findUltimateAncestor("F", withGrandparent), "GreatGrandparent");
});

test("findUltimateAncestor walks up multiple generations at once", () => {
  const chain: RelationshipEdge[] = [
    { fromMemberId: "Root", toMemberId: "Mid", type: "biological_child" },
    { fromMemberId: "Mid", toMemberId: "Leaf", type: "biological_child" },
  ];
  assert.equal(findUltimateAncestor("Leaf", chain), "Root");
});
