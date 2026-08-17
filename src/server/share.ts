import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { shareLinks, trees } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { resolveTreeAccess } from "@/lib/tree/access";
import { loadTreeDetail } from "@/lib/tree/detail";

const slugSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Gunakan huruf kecil, angka, dan tanda hubung saja.");

async function assertOwner(treeId: string, userId: string) {
  const tree = await db.query.trees.findFirst({ where: eq(trees.id, treeId) });
  if (!tree || tree.ownerId !== userId) throw new Error("FORBIDDEN");
  return tree;
}

export const listShareLinks = createServerFn({ method: "GET" })
  .inputValidator(z.object({ treeId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertOwner(data.treeId, user.id);
    return db.select().from(shareLinks).where(eq(shareLinks.treeId, data.treeId));
  });

export const createShareLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      treeId: z.uuid(),
      accessLevel: z.enum(["view", "edit"]),
      expiresAt: z.iso.datetime().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertOwner(data.treeId, user.id);
    const [link] = await db
      .insert(shareLinks)
      .values({
        treeId: data.treeId,
        token: crypto.randomUUID(),
        accessLevel: data.accessLevel,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        createdBy: user.id,
      })
      .returning();
    return link;
  });

export const updateShareLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      treeId: z.uuid(),
      linkId: z.uuid(),
      accessLevel: z.enum(["view", "edit"]).optional(),
      slug: z.union([slugSchema, z.literal("")]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertOwner(data.treeId, user.id);

    if (data.slug) {
      const existing = await db.query.shareLinks.findFirst({
        where: and(eq(shareLinks.slug, data.slug), ne(shareLinks.id, data.linkId)),
      });
      if (existing) throw new Error("URL ini sudah dipakai, coba yang lain.");
    }

    const [updated] = await db
      .update(shareLinks)
      .set({
        accessLevel: data.accessLevel,
        slug: data.slug === "" ? null : data.slug,
      })
      .where(and(eq(shareLinks.id, data.linkId), eq(shareLinks.treeId, data.treeId)))
      .returning();
    return updated;
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .inputValidator(z.object({ treeId: z.uuid(), linkId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertOwner(data.treeId, user.id);
    await db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(and(eq(shareLinks.id, data.linkId), eq(shareLinks.treeId, data.treeId)));
    return { ok: true };
  });

/** Public entry point for `/share/$token` — no session required. */
export const getTreeByShareToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, data.token) });
    if (!link || link.revokedAt || (link.expiresAt && link.expiresAt.getTime() < Date.now())) {
      throw new Error("NOT_FOUND");
    }
    const access = await resolveTreeAccess(link.treeId, { shareToken: data.token });
    return { ...(await loadTreeDetail(access)), shareToken: data.token };
  });

/** Public entry point for `/t/$slug` — the friendly-URL alternative to `/share/$token`. */
export const getTreeBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.slug, data.slug) });
    if (!link || link.revokedAt || (link.expiresAt && link.expiresAt.getTime() < Date.now())) {
      throw new Error("NOT_FOUND");
    }
    const access = await resolveTreeAccess(link.treeId, { shareToken: link.token });
    return { ...(await loadTreeDetail(access)), shareToken: link.token };
  });
