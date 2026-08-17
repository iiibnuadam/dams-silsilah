import { createFileRoute } from "@tanstack/react-router";
import { TreeChart } from "@/components/tree/TreeChart";
import { AddPersonDialog } from "@/components/tree/AddPersonDialog";
import { RelationshipDialog } from "@/components/tree/RelationshipDialog";
import { getTreeByShareToken } from "@/server/share";

export const Route = createFileRoute("/share/$token")({
  loader: async ({ params }) => getTreeByShareToken({ data: { token: params.token } }),
  component: SharedTreePage,
});

function SharedTreePage() {
  const detail = Route.useLoaderData();

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">{detail.tree.name}</h1>
        {detail.tree.description && <p className="text-muted-foreground text-sm">{detail.tree.description}</p>}
      </div>
      {detail.canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <AddPersonDialog treeId={detail.tree.id} shareToken={detail.shareToken} />
          {detail.members.length > 0 && (
            <RelationshipDialog treeId={detail.tree.id} shareToken={detail.shareToken} members={detail.members} />
          )}
          {detail.members.length > 0 && (
            <span className="text-muted-foreground text-xs">
              Klik individu untuk mengedit &middot; panah di bawah avatar menyembunyikan keturunannya.
            </span>
          )}
        </div>
      )}
      {detail.members.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">Silsilah ini belum memiliki anggota.</p>
      ) : (
        <TreeChart detail={detail} shareToken={detail.shareToken} />
      )}
    </div>
  );
}
