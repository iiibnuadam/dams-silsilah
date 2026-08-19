import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutTree } from "./layout.ts";
import type { TreeDetail } from "./detail.ts";

function member(id: string, generation: number, roleLabel: string, gender: "male" | "female") {
  return { id, generation, roleLabel, person: { fullName: id, gender } } as unknown as TreeDetail["members"][number];
}

function rel(id: string, fromMemberId: string, toMemberId: string, type: "biological_child" | "spouse") {
  return { id, fromMemberId, toMemberId, type, status: type === "spouse" ? "married" : null } as unknown as TreeDetail["relationships"][number];
}

test("layoutTree always slots the male spouse on the left and female on the right", () => {
  // fromMemberId/toMemberId order deliberately puts the female first, to prove the gender rule
  // wins over relationship-record order.
  const members = [member("F", 0, "Anak", "female"), member("M", 0, "Menantu", "male")];
  const relationships = [rel("r1", "F", "M", "spouse")];

  const { nodes } = layoutTree({ members, relationships });
  const xOf = (id: string) => nodes.find((n) => n.id === id)!.position.x;

  assert.ok(xOf("M") < xOf("F"), "male should be positioned left of female");
});

test("layoutTree keeps the gender rule even when each spouse has their own parent branch", () => {
  // A1+A2 are C1's parents; B1+B2 are C2's parents; C1(male)+C2(female) are a couple — mirrors a
  // "besan" tree where both sides of a marriage have their own recorded parents.
  const members = [
    member("A1", 0, "Pendiri", "male"),
    member("A2", 0, "Pendiri", "female"),
    member("B1", 0, "Kerabat", "male"),
    member("B2", 0, "Kerabat", "female"),
    member("C1", 1, "Anak", "male"),
    member("C2", 1, "Menantu", "female"),
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

  assert.ok(xOf("C1") < xOf("C2"), "male C1 stays left of female C2 regardless of parent side");

  // Each side's own parents must also land on the matching side, or the two descent lines cross.
  const aCenter = (xOf("A1") + xOf("A2")) / 2;
  const bCenter = (xOf("B1") + xOf("B2")) / 2;
  assert.ok(aCenter < bCenter, "C1's parents (A) must stay left of C2's parents (B)");
});
