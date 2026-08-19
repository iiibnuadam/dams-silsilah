import { wouldCreateCycle, type RelationshipEdge, type RelationshipType } from "./generation";

export type ImportRow = {
  no: number;
  fullName: string;
  gender: "male" | "female";
  birthDate?: string;
  deathDate?: string;
  occupation?: string;
  phone?: string;
  parentNo?: number;
  childType?: "biological_child" | "adopted_child" | "child_in_law";
  spouseNo?: number;
};

export type ImportPlan = {
  descentEdges: { parentNo: number; childNo: number; type: RelationshipType }[];
  spouseEdges: { aNo: number; bNo: number }[];
};

/**
 * Validates a batch of import rows that reference each other by their own `no` column (no real
 * IDs exist yet) and builds the descent/spouse edges to create. Reuses wouldCreateCycle by
 * treating each row's `no` as a temporary member id, so a cycle introduced entirely within the
 * import batch (e.g. row 1 lists row 2 as parent, row 2 lists row 1 as parent) is caught the same
 * way a live relationship edit would be. Throws on the first bad reference so the whole import
 * can be rejected atomically before touching the DB.
 */
export function planImport(rows: ImportRow[]): ImportPlan {
  const nos = new Set(rows.map((r) => r.no));
  if (nos.size !== rows.length) throw new Error("Kolom No harus unik untuk setiap baris.");

  const descentEdges: ImportPlan["descentEdges"] = [];
  const edgesSoFar: RelationshipEdge[] = [];
  for (const row of rows) {
    if (row.parentNo === undefined) continue;
    if (row.parentNo === row.no) throw new Error(`Baris No ${row.no}: Induk tidak boleh diri sendiri.`);
    if (!nos.has(row.parentNo)) throw new Error(`Baris No ${row.no}: No Induk ${row.parentNo} tidak ditemukan.`);
    const from = String(row.parentNo);
    const to = String(row.no);
    if (wouldCreateCycle(from, to, edgesSoFar)) {
      throw new Error(`Baris No ${row.no}: relasi induk ini membuat siklus.`);
    }
    const type = row.childType ?? "biological_child";
    edgesSoFar.push({ fromMemberId: from, toMemberId: to, type });
    descentEdges.push({ parentNo: row.parentNo, childNo: row.no, type });
  }

  const spouseEdges: ImportPlan["spouseEdges"] = [];
  const seenPairs = new Set<string>();
  for (const row of rows) {
    if (row.spouseNo === undefined) continue;
    if (row.spouseNo === row.no) throw new Error(`Baris No ${row.no}: Pasangan tidak boleh diri sendiri.`);
    if (!nos.has(row.spouseNo)) throw new Error(`Baris No ${row.no}: No Pasangan ${row.spouseNo} tidak ditemukan.`);
    const key = [row.no, row.spouseNo].sort((a, b) => a - b).join("-");
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    spouseEdges.push({ aNo: row.no, bNo: row.spouseNo });
  }

  return { descentEdges, spouseEdges };
}
