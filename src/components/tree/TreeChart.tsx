import { useMemo, useRef, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type NodeMouseHandler } from "@xyflow/react";
import { Link } from "@tanstack/react-router";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { ArrowLeftIcon, DownloadIcon, FileImageIcon, ListIcon, Share2Icon, SettingsIcon, TreesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonNode } from "@/components/tree/PersonNode";
import { MarriageNode } from "@/components/tree/MarriageNode";
import { EditPersonDialog } from "@/components/tree/EditPersonDialog";
import { FamilyDataModal } from "@/components/tree/FamilyDataModal";
import { TreeSettingsModal } from "@/components/tree/TreeSettingsModal";
import { layoutTree, type TreeNode } from "@/lib/tree/layout";
import { computeChildrenMap, getHiddenByCollapse } from "@/lib/tree/generation";
import type { TreeDetail } from "@/lib/tree/detail";

const nodeTypes = { person: PersonNode, marriage: MarriageNode };

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function TreeChart({
  detail,
  shareToken,
  isOwner = false,
  fullHeight = false,
}: {
  detail: TreeDetail;
  shareToken?: string;
  isOwner?: boolean;
  fullHeight?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const childrenMap = useMemo(() => computeChildrenMap(detail.relationships), [detail.relationships]);

  function toggleCollapse(ids: string[]) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      const anyCollapsed = ids.some((id) => prev.has(id));
      for (const id of ids) (anyCollapsed ? next.delete(id) : next.add(id));
      return next;
    });
  }

  // Which members feed the shared collapse toggle on a couple's marriage node — keyed by that
  // node's id, since a marriage node's own id doesn't otherwise map to a member id.
  const marriageChildBearing = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const rel of detail.relationships) {
      if (rel.type !== "spouse") continue;
      const childBearingIds = [rel.fromMemberId, rel.toMemberId].filter((id) => (childrenMap.get(id)?.length ?? 0) > 0);
      map.set(`marriage-${rel.id}`, childBearingIds);
    }
    return map;
  }, [detail.relationships, childrenMap]);

  const { nodes, edges } = useMemo(() => {
    const hiddenIds = getHiddenByCollapse(collapsedIds, detail.relationships);
    const visibleMembers = detail.members.filter((m) => !hiddenIds.has(m.id));
    const visibleRelationships = detail.relationships.filter(
      (r) => !hiddenIds.has(r.fromMemberId) && !hiddenIds.has(r.toMemberId),
    );
    const layout = layoutTree({ members: visibleMembers, relationships: visibleRelationships });

    const nodes: TreeNode[] = layout.nodes.map((node) => {
      if (node.type === "marriage") {
        const childBearingIds = marriageChildBearing.get(node.id) ?? [];
        return {
          ...node,
          data: {
            ...node.data,
            hasChildren: childBearingIds.length > 0,
            collapsed: childBearingIds.some((id) => collapsedIds.has(id)),
            onToggleCollapse: () => toggleCollapse(childBearingIds),
          },
        };
      }
      const hasChildren = (childrenMap.get(node.id)?.length ?? 0) > 0;
      return {
        ...node,
        data: {
          ...node.data,
          hasChildren,
          collapsed: collapsedIds.has(node.id),
          onToggleCollapse: () => toggleCollapse([node.id]),
        },
      };
    });

    return { nodes, edges: layout.edges };
  }, [detail.members, detail.relationships, collapsedIds, childrenMap, marriageChildBearing]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    if (!detail.canEdit || node.type === "marriage") return;
    setEditingMemberId(node.id);
  };
  const editingMember = detail.members.find((m) => m.id === editingMemberId) ?? null;

  async function exportChart(format: "png" | "pdf") {
    if (!wrapperRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(wrapperRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      if (format === "png") {
        downloadDataUrl(dataUrl, `${detail.tree.name}.png`);
        return;
      }
      const image = new Image();
      image.src = dataUrl;
      await new Promise((resolve) => (image.onload = resolve));
      const pdf = new jsPDF({ orientation: image.width > image.height ? "landscape" : "portrait", unit: "px", format: [image.width, image.height] });
      pdf.addImage(dataUrl, "PNG", 0, 0, image.width, image.height);
      pdf.save(`${detail.tree.name}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wrapperRef}
        className={
          "bg-background relative w-full overflow-hidden " +
          (fullHeight ? "h-screen" : "h-[75vh] rounded-lg border")
        }
      >
        {detail.members.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-muted-foreground max-w-xs text-sm">
              Belum ada anggota. Tambahkan individu pertama sebagai Pendiri silsilah ini.
            </p>
          </div>
        ) : (
          <ReactFlow<TreeNode>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            nodesConnectable={false}
            fitView
            minZoom={0.1}
            proOptions={{ hideAttribution: true }}
            colorMode="light"
          >
            <Background gap={20} className="opacity-40" />
            <Controls
              className="[&_button]:border-border overflow-hidden rounded-lg! border! shadow-md!"
              style={
                {
                  "--xy-controls-button-background-color": "var(--card)",
                  "--xy-controls-button-background-color-hover": "var(--muted)",
                  "--xy-controls-button-color": "var(--foreground)",
                  "--xy-controls-button-color-hover": "var(--foreground)",
                  "--xy-controls-button-border-color": "var(--border)",
                } as React.CSSProperties
              }
            />
            <MiniMap
              pannable
              zoomable
              className="bg-card! border-border! border"
              nodeColor="var(--primary)"
              style={{ "--xy-minimap-mask-background-color": "color-mix(in oklab, var(--foreground) 15%, transparent)" } as React.CSSProperties}
            />
          </ReactFlow>
        )}

        {/* Tree identity pill */}
        <div className="bg-card/95 border-border absolute top-4 left-4 z-10 flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-md backdrop-blur">
          {fullHeight && (
            <Button variant="ghost" size="icon-sm" render={<Link to="/dashboard" />} aria-label="Semua silsilah">
              <ArrowLeftIcon className="size-4" />
            </Button>
          )}
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <TreesIcon className="size-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-display truncate text-sm font-medium">{detail.tree.name}</p>
            <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Silsilah Keluarga</p>
          </div>
          {isOwner && (
            <Button variant="ghost" size="icon-sm" onClick={() => setSettingsModalOpen(true)} aria-label="Pengaturan">
              <SettingsIcon className="size-4" />
            </Button>
          )}
        </div>

        {/* Action toolbar */}
        <div className="bg-card/95 border-border absolute top-19 left-4 z-10 flex items-center gap-1 rounded-2xl border p-1.5 shadow-md backdrop-blur">
          <Button variant="ghost" size="icon-sm" onClick={() => setDataModalOpen(true)} aria-label="Daftar keluarga">
            <ListIcon className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={exporting} aria-label="Ekspor" />}>
              <DownloadIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportChart("png")}>
                <FileImageIcon /> Gambar (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChart("pdf")}>
                <FileImageIcon /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isOwner && (
            <Button size="sm" className="ml-1" onClick={() => setSettingsModalOpen(true)}>
              <Share2Icon /> Bagikan
            </Button>
          )}
        </div>

        {detail.members.length > 0 && (
          <div className="bg-card/95 border-border pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border px-5 py-2 text-xs shadow-md backdrop-blur">
            <span className="text-primary font-display text-base font-medium">{detail.stats.total}</span>
            <span className="text-muted-foreground -ml-3">Anggota</span>
            <span className="bg-border h-4 w-px" />
            <StatItem label="Laki-laki" value={detail.stats.male} />
            <StatItem label="Perempuan" value={detail.stats.female} />
            <StatItem label="Wafat" value={detail.stats.deceased} />
          </div>
        )}
      </div>

      <FamilyDataModal
        treeId={detail.tree.id}
        shareToken={shareToken}
        tree={detail.tree}
        members={detail.members}
        relationships={detail.relationships}
        canEdit={detail.canEdit}
        open={dataModalOpen}
        onOpenChange={setDataModalOpen}
      />
      {isOwner && <TreeSettingsModal tree={detail.tree} open={settingsModalOpen} onOpenChange={setSettingsModalOpen} />}
      {detail.canEdit && (
        <EditPersonDialog
          treeId={detail.tree.id}
          shareToken={shareToken}
          member={editingMember}
          onOpenChange={(open) => !open && setEditingMemberId(null)}
        />
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-muted-foreground">
      <span className="text-foreground font-semibold">{value}</span> {label}
    </span>
  );
}
