export function Architecture() {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />

      <div className="relative">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-2">
          // architecture
        </div>
        <h3 className="text-[20px] mb-1">SSE + Redis Pub/Sub fan-out</h3>
        <p className="text-[13px] text-muted-foreground mb-8 max-w-[560px]">
          Flag mutations broadcast through Redis to every API instance. SDKs
          receive ruleset deltas via SSE in under{' '}
          <span className="text-primary font-mono">200ms</span>, end-to-end.
        </p>

        <svg
          viewBox="0 0 800 320"
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10" fill="#4a5560" />
            </marker>
          </defs>

          <ArchNode x={40} y={130} w={130} h={60} label="dashboard" sub="PATCH /flags" color="#6bc5ff" />
          <ArchNode x={260} y={60} w={140} h={60} label="api · fastify" sub="postgres write" color="#8be36b" />
          <ArchNode x={260} y={200} w={140} h={60} label="api · fastify" sub="instance #2" color="#8be36b" />
          <ArchNode x={490} y={130} w={130} h={60} label="redis pub/sub" sub="pulse:env:*" color="#c77dff" />
          <ArchNode x={680} y={40} w={100} h={50} label="sdk · web" sub="EventSource" color="#f0b95a" />
          <ArchNode x={680} y={130} w={100} h={50} label="sdk · node" sub="EventSource" color="#f0b95a" />
          <ArchNode x={680} y={220} w={100} h={50} label="sdk · mobile" sub="EventSource" color="#f0b95a" />

          {/* Static connections */}
          <path d="M170 160 L260 90" stroke="#2a343c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          <path d="M170 160 L260 230" stroke="#2a343c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          <path d="M400 90 L490 150" stroke="#2a343c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          <path d="M400 230 L490 170" stroke="#2a343c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          <path d="M620 160 L680 65" stroke="#2a343c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          <path d="M620 160 L680 155" stroke="#2a343c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          <path d="M620 160 L680 245" stroke="#2a343c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

          {/* Animated flow lines */}
          <path d="M170 160 L260 90" stroke="#8be36b" strokeWidth="1.5" fill="none" className="dash-flow" />
          <path d="M400 90 L490 150" stroke="#8be36b" strokeWidth="1.5" fill="none" className="dash-flow" style={{ animationDelay: '0.4s' }} />
          <path d="M620 160 L680 65" stroke="#f0b95a" strokeWidth="1.5" fill="none" className="dash-flow" style={{ animationDelay: '0.8s' }} />
          <path d="M620 160 L680 155" stroke="#f0b95a" strokeWidth="1.5" fill="none" className="dash-flow" style={{ animationDelay: '1.0s' }} />
          <path d="M620 160 L680 245" stroke="#f0b95a" strokeWidth="1.5" fill="none" className="dash-flow" style={{ animationDelay: '1.2s' }} />

          <text x="200" y="105" fontSize="9" fontFamily="JetBrains Mono" fill="#6b7a85">write</text>
          <text x="425" y="105" fontSize="9" fontFamily="JetBrains Mono" fill="#6b7a85">PUBLISH</text>
          <text x="635" y="105" fontSize="9" fontFamily="JetBrains Mono" fill="#6b7a85">SSE</text>
        </svg>

        <div className="flex items-center gap-4 mt-4 font-mono text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> &lt;200ms end-to-end
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-info" /> horizontal scale
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-magenta" /> redis fan-out
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-warning" /> three-tier fallback
          </span>
        </div>
      </div>
    </div>
  );
}

function ArchNode({
  x, y, w, h, label, sub, color,
}: {
  x: number; y: number; w: number; h: number;
  label: string; sub: string; color: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#0f1316" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      <rect x={x} y={y} width={w} height={h} rx={6} fill={color} fillOpacity="0.04" />
      <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fontSize="11.5" fontFamily="JetBrains Mono" fill="#d6e0e6">
        {label}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fontSize="9.5" fontFamily="JetBrains Mono" fill="#6b7a85">
        {sub}
      </text>
      <circle cx={x + 8} cy={y + 8} r={2} fill={color} />
    </g>
  );
}
