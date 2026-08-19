import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { persons, relationships, treeMembers, trees } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { assertCanEdit, resolveTreeAccess } from "@/lib/tree/access";
import { logAudit } from "@/lib/tree/audit";
import { planImport, type ImportRow } from "@/lib/tree/import";
import { recomputeTreeGenerations } from "@/lib/tree/recompute";

const importRow = z.object({
  no: z.number().int().positive(),
  fullName: z.string().min(1).max(200),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  occupation: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  parentNo: z.number().int().positive().optional(),
  childType: z.enum(["biological_child", "adopted_child", "child_in_law"]).optional(),
  spouseNo: z.number().int().positive().optional(),
});

/** Bulk-creates persons (and their parent/spouse relationships) from a parsed import template in one atomic transaction — see planImport for reference validation. */
export const bulkImportPersons = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid(), shareToken: z.string().optional(), rows: z.array(importRow).min(1).max(500) }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id, shareToken: data.shareToken });
    assertCanEdit(access);

    const plan = planImport(data.rows as ImportRow[]);
    const creatorId = user?.id ?? access.tree.ownerId;

    const memberIdByNo = new Map<number, string>();
    const personIdByNo = new Map<number, string>();

    await db.transaction(async (tx) => {
      for (const row of data.rows) {
        const [person] = await tx
          .insert(persons)
          .values({
            fullName: row.fullName,
            gender: row.gender,
            birthDate: row.birthDate || undefined,
            deceased: Boolean(row.deathDate),
            deathDate: row.deathDate || undefined,
            occupation: row.occupation || undefined,
            phone: row.phone || undefined,
            createdBy: creatorId,
          })
          .returning();
        const [member] = await tx.insert(treeMembers).values({ treeId: data.treeId, personId: person!.id }).returning();
        memberIdByNo.set(row.no, member!.id);
        personIdByNo.set(row.no, person!.id);
      }

      for (const edge of plan.descentEdges) {
        await tx.insert(relationships).values({
          treeId: data.treeId,
          fromMemberId: memberIdByNo.get(edge.parentNo)!,
          toMemberId: memberIdByNo.get(edge.childNo)!,
          type: edge.type,
        });
      }
      for (const edge of plan.spouseEdges) {
        await tx.insert(relationships).values({
          treeId: data.treeId,
          fromMemberId: memberIdByNo.get(edge.aNo)!,
          toMemberId: memberIdByNo.get(edge.bNo)!,
          type: "spouse",
        });
      }

      if (!access.tree.founderPersonId) {
        const firstNo = Math.min(...data.rows.map((r) => r.no));
        await tx.update(trees).set({ founderPersonId: personIdByNo.get(firstNo) }).where(eq(trees.id, data.treeId));
      }
    });

    await recomputeTreeGenerations(data.treeId);
    await logAudit({
      treeId: data.treeId,
      actorId: user?.id ?? null,
      action: "bulk_import",
      entityType: "tree",
      entityId: data.treeId,
      diff: { count: data.rows.length },
    });
    return { imported: data.rows.length };
  });
