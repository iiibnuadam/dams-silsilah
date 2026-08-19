import { test } from "node:test";
import assert from "node:assert/strict";
import { planImport, type ImportRow } from "./import.ts";

function row(partial: Partial<ImportRow> & { no: number }): ImportRow {
  return { fullName: `Person ${partial.no}`, gender: "male", ...partial };
}

test("planImport builds descent and spouse edges from No references", () => {
  const rows = [row({ no: 1 }), row({ no: 2, spouseNo: 1 }), row({ no: 3, parentNo: 1, childType: "adopted_child" })];
  const plan = planImport(rows);
  assert.deepEqual(plan.descentEdges, [{ parentNo: 1, childNo: 3, type: "adopted_child" }]);
  assert.deepEqual(plan.spouseEdges, [{ aNo: 2, bNo: 1 }]);
});

test("planImport defaults child type to biological_child", () => {
  const plan = planImport([row({ no: 1 }), row({ no: 2, parentNo: 1 })]);
  assert.equal(plan.descentEdges[0]?.type, "biological_child");
});

test("planImport dedupes a spouse pair listed from both sides", () => {
  const plan = planImport([row({ no: 1, spouseNo: 2 }), row({ no: 2, spouseNo: 1 })]);
  assert.equal(plan.spouseEdges.length, 1);
});

test("planImport rejects duplicate No values", () => {
  assert.throws(() => planImport([row({ no: 1 }), row({ no: 1 })]), /unik/);
});

test("planImport rejects a parent reference that doesn't exist in the batch", () => {
  assert.throws(() => planImport([row({ no: 1, parentNo: 99 })]), /tidak ditemukan/);
});

test("planImport rejects self-parenting", () => {
  assert.throws(() => planImport([row({ no: 1, parentNo: 1 })]), /diri sendiri/);
});

test("planImport rejects a cycle introduced entirely within the batch", () => {
  const rows = [row({ no: 1, parentNo: 2 }), row({ no: 2, parentNo: 1 })];
  assert.throws(() => planImport(rows), /siklus/);
});
