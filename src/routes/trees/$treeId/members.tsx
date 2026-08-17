import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowUpDownIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EditPersonDialog } from "@/components/tree/EditPersonDialog";
import { getTree, removeTreeMember } from "@/server/trees";
import type { TreeDetail } from "@/lib/tree/detail";

export const Route = createFileRoute("/trees/$treeId/members")({
  loader: async ({ params }) => getTree({ data: { treeId: params.treeId } }),
  component: MembersPage,
});

type MemberRow = TreeDetail["members"][number];

const COLUMNS: Array<{ key: string; header: string; value: (row: MemberRow) => string | number }> = [
  { key: "fullName", header: "Nama", value: (row) => row.person.fullName },
  { key: "roleLabel", header: "Peran", value: (row) => row.roleLabel ?? "-" },
  { key: "generation", header: "Generasi", value: (row) => row.generation ?? -1 },
  { key: "gender", header: "Jenis Kelamin", value: (row) => (row.person.gender === "male" ? "Laki-laki" : "Perempuan") },
  { key: "birthDate", header: "Lahir", value: (row) => row.person.birthDate ?? "-" },
  { key: "deathDate", header: "Wafat", value: (row) => row.person.deathDate ?? "-" },
];

function MembersPage() {
  const detail = Route.useLoaderData();
  const router = useRouter();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const editingMember = detail.members.find((m) => m.id === editingMemberId) ?? null;

  const rows = useMemo(() => {
    if (!sortKey) return detail.members;
    const column = COLUMNS.find((c) => c.key === sortKey)!;
    return [...detail.members].sort((a, b) => {
      const cmp = String(column.value(a)).localeCompare(String(column.value(b)), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [detail.members, sortKey, sortAsc]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortAsc((asc) => !asc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function handleRemove(memberId: string) {
    await removeTreeMember({ data: { treeId: detail.tree.id, memberId } });
    await router.invalidate();
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.key}>
                <button type="button" className="flex items-center gap-1" onClick={() => toggleSort(column.key)}>
                  {column.header}
                  <ArrowUpDownIcon className="size-3" />
                </button>
              </TableHead>
            ))}
            {detail.canEdit && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {COLUMNS.map((column) => (
                <TableCell key={column.key}>{column.value(row)}</TableCell>
              ))}
              {detail.canEdit && (
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingMemberId(row.id)}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(row.id)}>
                    <Trash2Icon className="text-destructive size-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {detail.canEdit && (
        <EditPersonDialog
          treeId={detail.tree.id}
          member={editingMember}
          onOpenChange={(open) => !open && setEditingMemberId(null)}
        />
      )}
    </div>
  );
}
