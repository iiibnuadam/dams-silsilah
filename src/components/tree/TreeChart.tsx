import { useMemo, useRef, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type NodeMouseHandler } from "@xyflow/react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { DownloadIcon, FileImageIcon } from "lucide-react";
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
import { layoutTree, type TreeNode } from "@/lib/tree/layout";
import { computeChildrenMap, getDescendantMemberIds } from "@/lib/tree/generation";
import type { TreeDetail } from "@/lib/tree/detail";

const nodeTypes = { person: PersonNode, marriage: MarriageNode };

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function TreeChart({ detail, shareToken }: { detail: TreeDetail; shareToken?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

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
    const hiddenIds = new Set<string>();
    for (const id of collapsedIds) {
      for (const descendant of getDescendantMemberIds(id, detail.relationships)) hiddenIds.add(descendant);
    }
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
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={exporting} />}>
            <DownloadIcon /> {exporting ? "Mengekspor..." : "Ekspor"}
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
      </div>
      <div ref={wrapperRef} className="bg-background relative h-[75vh] w-full overflow-hidden rounded-lg border">
        <ReactFlow<TreeNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          nodesConnectable={false}
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} className="opacity-40" />
          <Controls />
          <MiniMap pannable zoomable className="bg-card! border-border! border" nodeColor="var(--primary)" />
        </ReactFlow>

        <div className="bg-card/95 border-border pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border px-5 py-2 text-xs shadow-md backdrop-blur">
          <span className="text-primary font-display text-base font-semibold">{detail.stats.total}</span>
          <span className="text-muted-foreground -ml-3">Anggota</span>
          <span className="bg-border h-4 w-px" />
          <StatItem label="Laki-laki" value={detail.stats.male} />
          <StatItem label="Perempuan" value={detail.stats.female} />
          <StatItem label="Wafat" value={detail.stats.deceased} />
        </div>
      </div>
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
