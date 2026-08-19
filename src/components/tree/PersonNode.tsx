import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDownIcon, ChevronUpIcon, FlowerIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PersonNodeData } from "@/lib/tree/layout";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const handleStyle = "border-none! size-0! bg-transparent!";

export function PersonNode({ data }: NodeProps<Node<PersonNodeData>>) {
  const { person, roleLabel, generation, hasChildren, hasSpouse, collapsed, onToggleCollapse } = data;
  const deceased = person.deceased;
  const tone = person.gender === "female" ? "female" : "male";
  // Couples get one shared collapse toggle on the spousal connector (SpouseEdge); this node's
  // own toggle only appears when there's no partner to hang that shared toggle off of.
  const showOwnToggle = hasChildren && !hasSpouse;

  return (
    <div className="flex w-28 flex-col items-center gap-1 text-center">
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />

      <div className="relative">
        {generation >= 0 && (
          <span
            className={
              "border-background absolute -top-1 -right-1 z-10 flex size-5 items-center justify-center rounded-full border-2 text-[9px] font-bold " +
              (tone === "female" ? "bg-female text-female-foreground" : "bg-male text-male-foreground")
            }
          >
            G{generation + 1}
          </span>
        )}
        <Avatar
          className={
            "size-16 shadow-sm ring-2 " +
            (tone === "female" ? "ring-female/40" : "ring-male/40") +
            (deceased ? " grayscale" : "")
          }
        >
          <AvatarImage src={person.photoUrl ?? undefined} alt={person.fullName} />
          <AvatarFallback
            className={"font-display text-lg " + (tone === "female" ? "bg-female/10 text-female" : "bg-male/10 text-male")}
          >
            {initials(person.fullName)}
          </AvatarFallback>
        </Avatar>
        {deceased && (
          <span className="bg-foreground text-background border-background absolute -bottom-0.5 -left-0.5 flex size-5 items-center justify-center rounded-full border-2">
            <FlowerIcon className="size-2.5" />
          </span>
        )}
        {showOwnToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
            className="bg-card border-border text-foreground hover:bg-muted absolute -bottom-1.5 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border shadow-sm"
            aria-label={collapsed ? "Tampilkan keturunan" : "Sembunyikan keturunan"}
          >
            {collapsed ? <ChevronDownIcon className="size-3" /> : <ChevronUpIcon className="size-3" />}
          </button>
        )}
      </div>

      <p className="w-full truncate text-xs font-semibold tracking-wide uppercase">{person.fullName}</p>
      <span
        className={
          "rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase " +
          (tone === "female" ? "border-female/30 bg-female/10 text-female" : "border-male/30 bg-male/10 text-male")
        }
      >
        {roleLabel}
      </span>
    </div>
  );
}
