import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { collaborators, profiles, trees } from "@/db/schema";
import { requireUser } from "@/lib/auth";

async function assertOwner(treeId: string, userId: string) {
  const tree = await db.query.trees.findFirst({ where: eq(trees.id, treeId) });
  if (!tree || tree.ownerId !== userId) throw new Error("FORBIDDEN");
}

export const listCollaborators = createServerFn({ method: "GET" })
  .inputValidator(z.object({ treeId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertOwner(data.treeId, user.id);
    return db
      .select({ userId: collaborators.userId, email: profiles.email, displayName: profiles.displayName })
      .from(collaborators)
      .innerJoin(profiles, eq(collaborators.userId, profiles.id))
      .where(eq(collaborators.treeId, data.treeId));
  });

/** Invites an already-registered user by email. ponytail: no pending-invite flow for unregistered emails — add one when that becomes a real request. */
export const inviteCollaborator = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid(), email: z.email() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertOwner(data.treeId, user.id);
    const invitee = await db.query.profiles.findFirst({ where: eq(profiles.email, data.email) });
    if (!invitee) throw new Error("Belum ada akun terdaftar dengan email ini.");
    await db.insert(collaborators).values({ treeId: data.treeId, userId: invitee.id }).onConflictDoNothing();
    return { ok: true };
  });

export const removeCollaborator = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid(), userId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertOwner(data.treeId, user.id);
    await db
      .delete(collaborators)
      .where(and(eq(collaborators.treeId, data.treeId), eq(collaborators.userId, data.userId)));
    return { ok: true };
  });
