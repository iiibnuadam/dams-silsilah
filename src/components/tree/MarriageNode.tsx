import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDownIcon, ChevronUpIcon, Link2Icon, Link2OffIcon } from "lucide-react";
import type { MarriageNodeData } from "@/lib/tree/layout";

const handleStyle = "border-none! size-0! bg-transparent!";

/** The union point between a couple — an otherwise-invisible node that exists purely so a
 * couple's children can be routed from their shared center instead of one specific parent. */
export function MarriageNode({ data }: NodeProps<Node<MarriageNodeData>>) {
  const divorced = data.status === "divorced";

  return (
    <div className="relative flex size-5 items-center justify-center">
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <div
        className={
          "flex size-5 items-center justify-center rounded-full border bg-card " +
          (divorced ? "border-muted-foreground/40 text-muted-foreground" : "border-female text-female")
        }
      >
        {divorced ? <Link2OffIcon className="size-3" /> : <Link2Icon className="size-3" />}
      </div>
      {data.hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse?.();
          }}
          className="bg-card border-border text-foreground hover:bg-muted absolute -right-6 flex size-5 items-center justify-center rounded-full border shadow-sm"
          aria-label={data.collapsed ? "Tampilkan keturunan" : "Sembunyikan keturunan"}
        >
          {data.collapsed ? <ChevronDownIcon className="size-3" /> : <ChevronUpIcon className="size-3" />}
        </button>
      )}
    </div>
  );
}
