import { createServerFn } from "@tanstack/react-start";
import { and, eq, ilike, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { collaborators, persons, treeMembers, trees } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { assertCanEdit, resolveTreeAccess } from "@/lib/tree/access";
import { logAudit } from "@/lib/tree/audit";

const personInput = z.object({
  fullName: z.string().min(1).max(200),
  gender: z.enum(["male", "female"]),
  photoUrl: z.string().url().optional(),
  birthDate: z.string().optional(),
  // Nullable (not just optional) so an edit can explicitly clear a death date — e.g. correcting
  // a mistaken "sudah meninggal" toggle — rather than the field being silently skipped on update.
  deathDate: z.string().nullable().optional(),
  occupation: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

/** Global search across all persons in the system, so a person can be linked instead of duplicated (FR-3.2). */
export const searchPersons = createServerFn({ method: "GET" })
  .inputValidator(z.object({ query: z.string().min(1), excludePersonId: z.uuid().optional() }))
  .handler(async ({ data }) => {
    await requireUser();
    const conditions = [ilike(persons.fullName, `%${data.query}%`)];
    if (data.excludePersonId) conditions.push(ne(persons.id, data.excludePersonId));
    return db
      .select()
      .from(persons)
      .where(and(...conditions))
      .limit(20);
  });

/**
 * Other trees the current user can access (owns or collaborates on) that this same person is
 * also a member of — a person is global (FR-3.2) so can legitimately appear in more than one
 * tree. Deliberately scoped to the caller's own accessible trees only, never a global lookup:
 * otherwise this would leak that a person also belongs to someone else's private tree.
 */
export const getPersonOtherTrees = createServerFn({ method: "GET" })
  .inputValidator(z.object({ personId: z.uuid(), excludeTreeId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) return [];

    const owned = await db
      .select({ id: trees.id, name: trees.name })
      .from(treeMembers)
      .innerJoin(trees, eq(treeMembers.treeId, trees.id))
      .where(and(eq(treeMembers.personId, data.personId), eq(trees.ownerId, user.id)));
    const collabTrees = await db
      .select({ id: trees.id, name: trees.name })
      .from(treeMembers)
      .innerJoin(trees, eq(treeMembers.treeId, trees.id))
      .innerJoin(collaborators, eq(collaborators.treeId, trees.id))
      .where(and(eq(treeMembers.personId, data.personId), eq(collaborators.userId, user.id)));

    const byId = new Map([...owned, ...collabTrees].map((t) => [t.id, t]));
    byId.delete(data.excludeTreeId);
    return [...byId.values()];
  });

/**
 * Edits a person's biodata from within a specific tree. Scoped to that tree (rather than a
 * global "can edit any person" check) since access to biodata is granted by tree membership —
 * the caller must have edit rights on `treeId`, and the person must actually be a member of it.
 */
export const updatePerson = createServerFn({ method: "POST" })
  .inputValidator(personInput.partial().extend({ personId: z.uuid(), treeId: z.uuid(), shareToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id, shareToken: data.shareToken });
    assertCanEdit(access);

    const membership = await db.query.treeMembers.findFirst({
      where: and(eq(treeMembers.treeId, data.treeId), eq(treeMembers.personId, data.personId)),
    });
    if (!membership) throw new Error("Individu ini bukan anggota silsilah ini.");

    const { personId, treeId, shareToken: _shareToken, ...patch } = data;
    const [person] = await db
      .update(persons)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(persons.id, personId))
      .returning();

    await logAudit({
      treeId,
      actorId: user?.id ?? null,
      action: "update_person",
      entityType: "person",
      entityId: personId,
      diff: patch,
    });
    return person;
  });
