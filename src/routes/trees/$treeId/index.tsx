import { createFileRoute } from "@tanstack/react-router";
import { getTree } from "@/server/trees";
import { TreeChart } from "@/components/tree/TreeChart";
import { AddPersonDialog } from "@/components/tree/AddPersonDialog";
import { RelationshipDialog } from "@/components/tree/RelationshipDialog";

export const Route = createFileRoute("/trees/$treeId/")({
  loader: async ({ params }) => getTree({ data: { treeId: params.treeId } }),
  component: TreeChartPage,
});

function TreeChartPage() {
  const detail = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-4">
      {detail.canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <AddPersonDialog treeId={detail.tree.id} />
          {detail.members.length > 0 && <RelationshipDialog treeId={detail.tree.id} members={detail.members} />}
          {detail.members.length > 0 && (
            <span className="text-muted-foreground text-xs">
              Klik individu untuk mengedit &middot; panah di bawah avatar menyembunyikan keturunannya.
            </span>
          )}
        </div>
      )}
      {detail.members.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          Belum ada anggota. Tambahkan individu pertama sebagai Pendiri silsilah ini.
        </p>
      ) : (
        <TreeChart detail={detail} />
      )}
    </div>
  );
}
