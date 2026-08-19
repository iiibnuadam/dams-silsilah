import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutTree } from "./layout.ts";
import type { TreeDetail } from "./detail.ts";

function member(id: string, generation: number, roleLabel: string) {
  return { id, generation, roleLabel, person: { fullName: id } } as unknown as TreeDetail["members"][number];
}

function rel(id: string, fromMemberId: string, toMemberId: string, type: "biological_child" | "spouse") {
  return { id, fromMemberId, toMemberId, type, status: type === "spouse" ? "married" : null } as unknown as TreeDetail["relationships"][number];
}

test("layoutTree keeps each spouse on the same side as their own parents, avoiding a crossing X", () => {
  // A1+A2 are C1's parents; B1+B2 are C2's parents; C1+C2 are a couple — mirrors a "besan" tree
  // where both sides of a marriage have their own recorded parents.
  const members = [
    member("A1", 0, "Pendiri"),
    member("A2", 0, "Pendiri"),
    member("B1", 0, "Kerabat"),
    member("B2", 0, "Kerabat"),
    member("C1", 1, "Anak"),
    member("C2", 1, "Menantu"),
  ];
  const relationships = [
    rel("rA", "A1", "A2", "spouse"),
    rel("rB", "B1", "B2", "spouse"),
    rel("rC", "C1", "C2", "spouse"),
    rel("rAC", "A1", "C1", "biological_child"),
    rel("rBC", "B1", "C2", "biological_child"),
  ];

  const { nodes } = layoutTree({ members, relationships });
  const xOf = (id: string) => nodes.find((n) => n.id === id)!.position.x;

  const aCenter = (xOf("A1") + xOf("A2")) / 2;
  const bCenter = (xOf("B1") + xOf("B2")) / 2;
  const c1x = xOf("C1");
  const c2x = xOf("C2");

  // Whichever side dagre put each parent couple on, their own child must land on that same side —
  // otherwise the two descent lines cross into an X.
  assert.equal(aCenter < bCenter, c1x < c2x);
});
