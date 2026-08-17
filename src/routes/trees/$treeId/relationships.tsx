import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditRelationshipDialog } from "@/components/tree/EditRelationshipDialog";
import { getTree } from "@/server/trees";
import { deleteRelationship } from "@/server/relationships";

export const Route = createFileRoute("/trees/$treeId/relationships")({
  loader: async ({ params }) => getTree({ data: { treeId: params.treeId } }),
  component: RelationshipsPage,
});

const TYPE_LABELS: Record<string, string> = {
  biological_child: "Anak Kandung",
  adopted_child: "Anak Angkat",
  child_in_law: "Menantu",
  spouse: "Pasangan",
};

const STATUS_LABELS: Record<string, string> = { married: "Menikah", divorced: "Cerai" };

function RelationshipsPage() {
  const detail = Route.useLoaderData();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = detail.relationships.find((r) => r.id === editingId) ?? null;

  function personName(memberId: string) {
    return detail.members.find((m) => m.id === memberId)?.person.fullName ?? "?";
  }

  async function handleDelete(relationshipId: string) {
    await deleteRelationship({ data: { treeId: detail.tree.id, relationshipId } });
    await router.invalidate();
  }

  if (detail.relationships.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Belum ada relasi. Tambahkan relasi dari halaman Bagan.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Individu A</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Individu B</TableHead>
            <TableHead>Status</TableHead>
            {detail.canEdit && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.relationships.map((rel) => (
            <TableRow key={rel.id}>
              <TableCell>{personName(rel.fromMemberId)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{TYPE_LABELS[rel.type]}</Badge>
              </TableCell>
              <TableCell>{personName(rel.toMemberId)}</TableCell>
              <TableCell>{rel.status ? STATUS_LABELS[rel.status] : "-"}</TableCell>
              {detail.canEdit && (
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(rel.id)}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(rel.id)}>
                    <Trash2Icon className="text-destructive size-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {detail.canEdit && (
        <EditRelationshipDialog
          treeId={detail.tree.id}
          members={detail.members}
          relationship={editing}
          onOpenChange={(open) => !open && setEditingId(null)}
        />
      )}
    </div>
  );
}
