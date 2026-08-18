import { useMemo, useState } from "react";
import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  HeartIcon,
  SearchIcon,
  SproutIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditPersonDialog } from "@/components/tree/EditPersonDialog";
import { EditRelationshipDialog } from "@/components/tree/EditRelationshipDialog";
import { AddPersonDialog } from "@/components/tree/AddPersonDialog";
import { RelationshipDialog } from "@/components/tree/RelationshipDialog";
import { buildFamilySections, type FamilyRow } from "@/lib/tree/familyGroups";
import type { TreeDetail } from "@/lib/tree/detail";

type Member = TreeDetail["members"][number];
type Relationship = TreeDetail["relationships"][number];

const PAGE_SIZE = 8;

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(members: Member[], treeName: string) {
  const header = ["Nama", "Peran", "Generasi", "Jenis Kelamin", "Pekerjaan", "No. HP", "Tanggal Lahir", "Tanggal Wafat"];
  const rows = members.map((m) => [
    m.person.fullName,
    m.roleLabel ?? "-",
    String((m.generation ?? -1) + 1),
    m.person.gender === "male" ? "Laki-laki" : "Perempuan",
    m.person.occupation ?? "",
    m.person.phone ?? "",
    m.person.birthDate ?? "",
    m.person.deathDate ?? "",
  ]);
  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${treeName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function FamilyDataModal({
  treeId,
  shareToken,
  tree,
  members,
  relationships,
  canEdit,
  open,
  onOpenChange,
}: {
  treeId: string;
  shareToken?: string;
  tree: TreeDetail["tree"];
  members: Member[];
  relationships: Relationship[];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const editingMember = members.find((m) => m.id === editingMemberId) ?? null;
  const editingRelationship = relationships.find((r) => r.id === editingRelationshipId) ?? null;

  const sections = useMemo(
    () => buildFamilySections(members, relationships, (id) => memberById.get(id)?.person.fullName ?? "?"),
    [members, relationships, memberById],
  );

  const flatRows = useMemo(
    () => sections.flatMap((section) => section.rows.map((row) => ({ sectionTitle: section.title, row }))),
    [sections],
  );

  function matchesSearch(memberId: string) {
    if (!search.trim()) return true;
    const person = memberById.get(memberId)?.person;
    if (!person) return false;
    const q = search.toLowerCase();
    return (
      person.fullName.toLowerCase().includes(q) ||
      (person.occupation ?? "").toLowerCase().includes(q) ||
      (person.phone ?? "").toLowerCase().includes(q)
    );
  }

  const filteredRows = useMemo(
    () => flatRows.filter(({ row }) => row.memberIds.some(matchesSearch) || row.childMemberIds.some(matchesSearch)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatRows, search],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filteredRows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const stats = useMemo(() => {
    const male = members.filter((m) => m.person.gender === "male").length;
    const female = members.filter((m) => m.person.gender === "female").length;
    const menantu = members.filter((m) => m.roleLabel === "Menantu").length;
    const maxGeneration = Math.max(-1, ...members.map((m) => m.generation ?? -1));
    return { total: members.length, male, female, menantu, generationSpan: maxGeneration + 1 };
  }, [members]);

  function relationshipFor(row: FamilyRow): Relationship | undefined {
    if (row.memberIds.length !== 2) return undefined;
    const [a, b] = row.memberIds;
    return relationships.find(
      (r) =>
        r.type === "spouse" &&
        ((r.fromMemberId === a && r.toMemberId === b) || (r.fromMemberId === b && r.toMemberId === a)),
    );
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden p-0 sm:max-w-5xl">
          <div className="flex flex-wrap items-center gap-4 border-b p-5">
            <div className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl">
              <Building2Icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-display truncate text-lg font-semibold">Pusat Data Silsilah</p>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                Family Data Management
              </p>
            </div>
            <div className="relative w-full max-w-56 sm:w-56">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Cari nama, pekerjaan, HP..."
                className="pl-8"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(members, tree.name)}>
              <DownloadIcon /> Download Excel
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 px-5 pt-4 sm:grid-cols-4">
            <StatCard icon={<UserIcon className="size-4" />} label="Total Anggota" value={stats.total} />
            <StatCard icon={<HeartIcon className="size-4" />} label="Gender Mix" value={`${stats.male} / ${stats.female}`} />
            <StatCard icon={<StarIcon className="size-4" />} label="Total Menantu" value={stats.menantu} />
            <StatCard icon={<SproutIcon className="size-4" />} label="Jangkauan Gen" value={stats.generationSpan} />
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 px-5 pt-4">
              <AddPersonDialog treeId={treeId} shareToken={shareToken} />
              {members.length > 0 && <RelationshipDialog treeId={treeId} shareToken={shareToken} members={members} />}
            </div>
          )}

          <div className="flex-1 overflow-auto px-5 py-4">
            <table className="w-full border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-[10px] font-semibold tracking-wide uppercase">
                  <th className="w-10 px-2 py-1">No</th>
                  <th className="px-2 py-1">Keluarga (Pasangan)</th>
                  <th className="px-2 py-1">Anak-anak</th>
                  <th className="px-2 py-1">Generasi</th>
                  <th className="px-2 py-1">Detail & Kontak</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(({ sectionTitle, row }, index) => {
                  const previousSectionTitle = index > 0 ? pageRows[index - 1]!.sectionTitle : null;
                  const relationship = relationshipFor(row);
                  return (
                    <RowWithSection
                      key={row.unitId}
                      showSectionHeader={sectionTitle !== previousSectionTitle}
                      sectionTitle={sectionTitle}
                      rowNumber={currentPage * PAGE_SIZE + index + 1}
                      row={row}
                      memberById={memberById}
                      relationship={relationship}
                      canEdit={canEdit}
                      onEditMember={setEditingMemberId}
                      onEditRelationship={setEditingRelationshipId}
                    />
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground py-10 text-center">
                      Tidak ada hasil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t px-5 py-3 text-xs">
            <span className="text-muted-foreground">
              <span className="text-foreground font-semibold">{filteredRows.length}</span> records
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeftIcon /> Prev
              </Button>
              <span className="text-muted-foreground px-1">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {canEdit && (
        <EditPersonDialog
          treeId={treeId}
          shareToken={shareToken}
          member={editingMember}
          onOpenChange={(nextOpen) => !nextOpen && setEditingMemberId(null)}
        />
      )}
      {canEdit && (
        <EditRelationshipDialog
          treeId={treeId}
          shareToken={shareToken}
          members={members}
          relationship={editingRelationship}
          onOpenChange={(nextOpen) => !nextOpen && setEditingRelationshipId(null)}
        />
      )}
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-muted/40 flex items-center gap-3 rounded-2xl px-4 py-3">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
        {icon}
      </div>
      <div className="leading-tight">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function PersonBadge({ member, onClick }: { member: Member; onClick?: () => void }) {
  const tone = member.person.gender === "female" ? "female" : "male";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex items-center gap-2 text-left enabled:cursor-pointer"
    >
      <span
        className={
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white " +
          (tone === "female" ? "bg-female" : "bg-male")
        }
      >
        {initials(member.person.fullName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{member.person.fullName}</span>
        <Badge
          variant="secondary"
          className={
            "text-[9px] " +
            (member.roleLabel === "Menantu" ? "bg-female/10 text-female" : "bg-male/10 text-male")
          }
        >
          {member.roleLabel ?? "-"}
        </Badge>
      </span>
    </button>
  );
}

function RowWithSection({
  showSectionHeader,
  sectionTitle,
  rowNumber,
  row,
  memberById,
  relationship,
  canEdit,
  onEditMember,
  onEditRelationship,
}: {
  showSectionHeader: boolean;
  sectionTitle: string;
  rowNumber: number;
  row: FamilyRow;
  memberById: Map<string, Member>;
  relationship: Relationship | undefined;
  canEdit: boolean;
  onEditMember: (memberId: string) => void;
  onEditRelationship: (relationshipId: string) => void;
}) {
  const rowMembers = row.memberIds.map((id) => memberById.get(id)).filter((m): m is Member => Boolean(m));
  const children = row.childMemberIds.map((id) => memberById.get(id)).filter((m): m is Member => Boolean(m));
  const primary = rowMembers[0];
  const generationLabel = primary ? (primary.roleLabel ?? "-") : "-";

  return (
    <>
      {showSectionHeader && (
        <tr>
          <td colSpan={5} className="pt-3 pb-1">
            <div className="bg-primary/5 flex items-center gap-2 rounded-md px-3 py-1.5">
              <span className="bg-primary block h-3.5 w-1 rounded-full" />
              <span className="text-primary text-[11px] font-bold tracking-wide uppercase">{sectionTitle}</span>
            </div>
          </td>
        </tr>
      )}
      <tr className="bg-card">
        <td className="text-muted-foreground rounded-l-lg px-2 py-3 align-top">{rowNumber}</td>
        <td className="px-2 py-3 align-top">
          <div className="flex items-center gap-1.5">
            {rowMembers[0] && (
              <PersonBadge member={rowMembers[0]} onClick={canEdit ? () => onEditMember(rowMembers[0]!.id) : undefined} />
            )}
            {rowMembers.length === 2 && (
              <>
                <button
                  type="button"
                  disabled={!relationship || !canEdit}
                  onClick={() => relationship && onEditRelationship(relationship.id)}
                  className="text-muted-foreground shrink-0 enabled:hover:text-female enabled:cursor-pointer"
                >
                  <HeartIcon className="size-3.5" />
                </button>
                {rowMembers[1] && (
                  <PersonBadge member={rowMembers[1]} onClick={canEdit ? () => onEditMember(rowMembers[1]!.id) : undefined} />
                )}
              </>
            )}
          </div>
        </td>
        <td className="px-2 py-3 align-top">
          <p className="text-primary mb-1 text-[10px] font-semibold uppercase">Daftar Anak ({children.length})</p>
          {children.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">Belum terdokumentasi</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={canEdit ? () => onEditMember(child.id) : undefined}
                  disabled={!canEdit}
                  className="border-border bg-background rounded-full border px-2 py-0.5 text-xs enabled:hover:border-primary/40 enabled:cursor-pointer"
                >
                  {child.person.fullName}
                </button>
              ))}
            </div>
          )}
        </td>
        <td className="px-2 py-3 align-top">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            G{(row.generation < 0 ? 0 : row.generation) + 1}
          </Badge>
          <p className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">{generationLabel}</p>
        </td>
        <td className="text-muted-foreground rounded-r-lg px-2 py-3 align-top text-xs">
          {rowMembers
            .map((m) => [m.person.occupation, m.person.phone].filter(Boolean).join(" · "))
            .filter(Boolean)
            .join(" / ") || "-"}
        </td>
      </tr>
    </>
  );
}
