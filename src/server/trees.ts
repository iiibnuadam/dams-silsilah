import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { collaborators, persons, treeMembers, trees } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { assertCanEdit, resolveTreeAccess } from "@/lib/tree/access";
import { logAudit } from "@/lib/tree/audit";
import { loadTreeDetail } from "@/lib/tree/detail";
import { recomputeTreeGenerations } from "@/lib/tree/recompute";

export const listTrees = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const owned = await db.select().from(trees).where(eq(trees.ownerId, user.id));
  const collabRows = await db
    .select({ tree: trees })
    .from(collaborators)
    .innerJoin(trees, eq(collaborators.treeId, trees.id))
    .where(eq(collaborators.userId, user.id));
  const byId = new Map(owned.map((t) => [t.id, t]));
  for (const row of collabRows) byId.set(row.tree.id, row.tree);
  return [...byId.values()];
});

export const createTree = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1).max(200), description: z.string().max(2000).optional() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const [tree] = await db.insert(trees).values({ ...data, ownerId: user.id }).returning();
    await logAudit({ treeId: tree!.id, actorId: user.id, action: "create", entityType: "tree", entityId: tree!.id });
    return tree;
  });

export const updateTree = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      treeId: z.uuid(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      privacy: z.enum(["private", "public"]).optional(),
      coverPhotoUrl: z.string().url().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const { treeId, ...patch } = data;
    const tree = await db.query.trees.findFirst({ where: eq(trees.id, treeId) });
    if (!tree || tree.ownerId !== user.id) throw new Error("FORBIDDEN");
    const [updated] = await db.update(trees).set({ ...patch, updatedAt: new Date() }).where(eq(trees.id, treeId)).returning();
    await logAudit({ treeId, actorId: user.id, action: "update", entityType: "tree", entityId: treeId, diff: patch });
    return updated;
  });

export const deleteTree = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const tree = await db.query.trees.findFirst({ where: eq(trees.id, data.treeId) });
    if (!tree || tree.ownerId !== user.id) throw new Error("FORBIDDEN");
    await db.delete(trees).where(eq(trees.id, data.treeId));
    return { ok: true };
  });

export const getTree = createServerFn({ method: "GET" })
  .inputValidator(z.object({ treeId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id });
    return loadTreeDetail(access);
  });

const newOrExistingPerson = z.union([
  z.object({ personId: z.uuid() }),
  z.object({
    fullName: z.string().min(1).max(200),
    gender: z.enum(["male", "female"]),
    photoUrl: z.string().url().optional(),
    birthDate: z.string().optional(),
    deathDate: z.string().optional(),
    notes: z.string().max(2000).optional(),
  }),
]);

/** Adds a person to a tree (creating the person if new, or linking an existing one — FR-3.2). The very first member added becomes the founder. */
export const addTreeMember = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid(), shareToken: z.string().optional(), person: newOrExistingPerson }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id, shareToken: data.shareToken });
    assertCanEdit(access);

    let personId: string;
    if ("personId" in data.person) {
      personId = data.person.personId;
    } else {
      const [created] = await db
        .insert(persons)
        .values({ ...data.person, createdBy: user?.id ?? access.tree.ownerId })
        .returning();
      personId = created!.id;
    }

    const [member] = await db
      .insert(treeMembers)
      .values({ treeId: data.treeId, personId })
      .onConflictDoNothing()
      .returning();

    if (!member) throw new Error("Individu ini sudah menjadi anggota silsilah ini.");

    if (!access.tree.founderPersonId) {
      await db.update(trees).set({ founderPersonId: personId }).where(eq(trees.id, data.treeId));
    }

    await recomputeTreeGenerations(data.treeId);
    await logAudit({
      treeId: data.treeId,
      actorId: user?.id ?? null,
      action: "add_member",
      entityType: "tree_member",
      entityId: member.id,
    });
    return member;
  });

export const removeTreeMember = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid(), memberId: z.uuid(), shareToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const access = await resolveTreeAccess(data.treeId, { userId: user?.id, shareToken: data.shareToken });
    assertCanEdit(access);

    await db
      .delete(treeMembers)
      .where(and(eq(treeMembers.id, data.memberId), eq(treeMembers.treeId, data.treeId)));

    await recomputeTreeGenerations(data.treeId);
    await logAudit({
      treeId: data.treeId,
      actorId: user?.id ?? null,
      action: "remove_member",
      entityType: "tree_member",
      entityId: data.memberId,
    });
    return { ok: true };
  });
