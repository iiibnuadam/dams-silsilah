import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFamilySections } from "./familyGroups.ts";
import type { RelationshipEdge } from "./generation.ts";

const names: Record<string, string> = { F1: "Yunus", F2: "Siti Aminah", C1: "Rahman", S: "Khusnul", G: "Fahri" };
const nameOf = (id: string) => names[id] ?? id;

// Founder couple (F1+F2) -> child C1, married to S, who has a child G.
const members = [
  { id: "F1", generation: 0 },
  { id: "F2", generation: 0 },
  { id: "C1", generation: 1 },
  { id: "S", generation: 1 },
  { id: "G", generation: 2 },
];
const edges: RelationshipEdge[] = [
  { fromMemberId: "F1", toMemberId: "F2", type: "spouse" },
  { fromMemberId: "F1", toMemberId: "C1", type: "biological_child" },
  { fromMemberId: "C1", toMemberId: "S", type: "spouse" },
  { fromMemberId: "C1", toMemberId: "G", type: "biological_child" },
];

test("buildFamilySections puts the founder couple alone in the root section", () => {
  const sections = buildFamilySections(members, edges, nameOf);
  assert.equal(sections[0]!.title, "Akar Silsilah Keluarga");
  assert.equal(sections[0]!.rows.length, 1);
  assert.deepEqual(sections[0]!.rows[0]!.memberIds.sort(), ["F1", "F2"]);
});

test("buildFamilySections groups a couple's children under a 'Keturunan X & Y' section", () => {
  const sections = buildFamilySections(members, edges, nameOf);
  const childSection = sections.find((s) => s.title === "Keturunan Yunus & Siti Aminah");
  assert.ok(childSection, "expected a section for the founder couple's children");
  assert.equal(childSection!.rows.length, 1);
  assert.deepEqual(childSection!.rows[0]!.memberIds.sort(), ["C1", "S"]);
  assert.deepEqual(childSection!.rows[0]!.childMemberIds, ["G"]);
});

test("buildFamilySections gives a single member with no spouse their own row", () => {
  const soloMembers = [...members, { id: "Solo", generation: 2 }];
  const soloEdges: RelationshipEdge[] = [...edges, { fromMemberId: "C1", toMemberId: "Solo", type: "biological_child" }];
  const sections = buildFamilySections(soloMembers, soloEdges, nameOf);
  const childSection = sections.find((s) => s.title === "Keturunan Rahman & Khusnul");
  assert.ok(childSection);
  const soloRow = childSection!.rows.find((r) => r.memberIds.includes("Solo"));
  assert.deepEqual(soloRow!.memberIds, ["Solo"], "a childless, spouse-less member still gets their own single-person row");
});
