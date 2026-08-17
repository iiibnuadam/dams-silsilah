import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { collaborators, shareLinks, trees } from "@/db/schema";

export type TreeAccess = {
  tree: typeof trees.$inferSelect;
  canEdit: boolean;
};

/**
 * Resolves what a caller may do with a tree, either via an authenticated session
 * (owner/collaborator) or an anonymous share-link token (FR-6.1 allows edit access
 * without an account). Falls back to public read access if the tree is public.
 */
export async function resolveTreeAccess(
  treeId: string,
  opts: { userId?: string | null; shareToken?: string | null },
): Promise<TreeAccess> {
  const tree = await db.query.trees.findFirst({ where: eq(trees.id, treeId) });
  if (!tree) throw new Error("NOT_FOUND");

  if (opts.userId) {
    if (tree.ownerId === opts.userId) return { tree, canEdit: true };
    const collab = await db.query.collaborators.findFirst({
      where: and(eq(collaborators.treeId, treeId), eq(collaborators.userId, opts.userId)),
    });
    if (collab) return { tree, canEdit: true };
  }

  if (opts.shareToken) {
    const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, opts.shareToken) });
    if (
      link &&
      link.treeId === treeId &&
      !link.revokedAt &&
      (!link.expiresAt || link.expiresAt.getTime() > Date.now())
    ) {
      return { tree, canEdit: link.accessLevel === "edit" };
    }
  }

  if (tree.privacy === "public") return { tree, canEdit: false };

  throw new Error("FORBIDDEN");
}

export function assertCanEdit(access: TreeAccess) {
  if (!access.canEdit) throw new Error("FORBIDDEN");
}
