/**
 * Signature hero graphic: a small four-generation lineage diagram using the same visual
 * language as the real chart (solid = descent, dashed = married-in) — a preview of the
 * product rendered as illustration rather than a stock icon.
 */
export function LineageMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 380 340" fill="none" className={className} role="img" aria-label="Diagram silsilah empat generasi">
      <g className="stroke-primary/50" strokeWidth="1.5">
        <path d="M190 56 V88" />
        <path d="M110 88 H270" />
        <path d="M110 88 V116" />
        <path d="M270 88 V116" />
        <path d="M70 148 H150" />
        <path d="M70 148 V176" />
        <path d="M150 148 V176" />
        <path d="M270 148 V176" />
        <path d="M110 208 H190" />
        <path d="M110 208 V236" />
      </g>
      <g className="stroke-accent/70" strokeWidth="1.5" strokeDasharray="3 4">
        <path d="M270 116 H310" />
        <path d="M150 176 H190" />
      </g>

      <NodeCard x={190} y={40} label="G1" filled />
      <NodeCard x={110} y={116} label="G2" filled />
      <NodeCard x={270} y={116} label="G2" filled />
      <NodeCard x={310} y={116} label="G2" />
      <NodeCard x={70} y={176} label="G3" filled />
      <NodeCard x={150} y={176} label="G3" filled />
      <NodeCard x={190} y={176} label="G3" />
      <NodeCard x={270} y={176} label="G3" filled />
      <NodeCard x={110} y={236} label="G4" filled />
    </svg>
  );
}

function NodeCard({ x, y, filled = false }: { x: number; y: number; label: string; filled?: boolean }) {
  return (
    <g transform={`translate(${x - 16} ${y - 16})`}>
      <rect
        width="32"
        height="32"
        rx="8"
        className={filled ? "fill-primary/90" : "fill-accent/25 stroke-accent stroke-1"}
      />
      <circle cx="16" cy="13" r="5" className={filled ? "fill-card/80" : "fill-accent"} />
      <path
        d="M6 27c1.5-6 6-9 10-9s8.5 3 10 9"
        className={filled ? "stroke-card/80" : "stroke-accent"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}
