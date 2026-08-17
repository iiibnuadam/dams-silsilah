import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditRelationshipDialog } from "@/components/tree/EditRelationshipDialog";
import { deleteRelationship } from "@/server/relationships";
import type { TreeDetail } from "@/lib/tree/detail";

const TYPE_LABELS: Record<string, string> = {
  biological_child: "Anak Kandung",
  adopted_child: "Anak Angkat",
  child_in_law: "Menantu",
  spouse: "Pasangan",
};

const STATUS_LABELS: Record<string, string> = { married: "Menikah", divorced: "Cerai" };

export function RelationshipsModal({
  treeId,
  members,
  relationships,
  canEdit,
  open,
  onOpenChange,
}: {
  treeId: string;
  members: TreeDetail["members"];
  relationships: TreeDetail["relationships"];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = relationships.find((r) => r.id === editingId) ?? null;

  function personName(memberId: string) {
    return members.find((m) => m.id === memberId)?.person.fullName ?? "?";
  }

  async function handleDelete(relationshipId: string) {
    await deleteRelationship({ data: { treeId, relationshipId } });
    await router.invalidate();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Daftar Relasi</DialogTitle>
            <DialogDescription>Semua relasi antar individu dalam silsilah ini.</DialogDescription>
          </DialogHeader>
          {relationships.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Belum ada relasi. Tambahkan relasi dari toolbar bagan.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Individu A</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Individu B</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relationships.map((rel) => (
                    <TableRow key={rel.id}>
                      <TableCell>{personName(rel.fromMemberId)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{TYPE_LABELS[rel.type]}</Badge>
                      </TableCell>
                      <TableCell>{personName(rel.toMemberId)}</TableCell>
                      <TableCell>{rel.status ? STATUS_LABELS[rel.status] : "-"}</TableCell>
                      {canEdit && (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
      {canEdit && (
        <EditRelationshipDialog
          treeId={treeId}
          members={members}
          relationship={editing}
          onOpenChange={(nextOpen) => !nextOpen && setEditingId(null)}
        />
      )}
    </>
  );
}
