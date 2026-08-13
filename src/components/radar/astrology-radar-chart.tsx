type AstrologyRadarItem = {
  key: string;
  label: string;
  score: number;
  risk?: boolean;
};

function point(index: number, total: number, value: number, radius = 88) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const scaled = (value / 100) * radius;
  return [120 + Math.cos(angle) * scaled, 120 + Math.sin(angle) * scaled] as const;
}

function labelLines(label: string) {
  if (label.length <= 5) return [label];
  return [label.slice(0, 2), label.slice(2)];
}

export function AstrologyRadarChart({ items }: { items: AstrologyRadarItem[] }) {
  const axes = items.length ? items : [];
  const polygon = axes.map((axis, index) => point(index, axes.length, axis.score).join(",")).join(" ");

  return (
    <div className="rounded-lg border border-accent/25 bg-background/45 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">星象关系雷达</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            用金星、月亮、水星、火星等关系信号，辅助解释聊天里已经出现的互动模式。
          </p>
        </div>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-72">
        <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
          {[88, 64, 40, 16].map((radius) => (
            <polygon
              key={radius}
              points={axes.map((_, index) => point(index, axes.length, 100, radius).join(",")).join(" ")}
              fill="none"
              stroke="rgb(255 255 255 / 0.12)"
            />
          ))}
          {axes.map((axis, index) => {
            const [x, y] = point(index, axes.length, 100, 92);
            const [labelX, labelY] = point(index, axes.length, 100, 113);
            const lines = labelLines(axis.label);
            return (
              <g key={axis.key}>
                <line x1="120" y1="120" x2={x} y2={y} stroke="rgb(255 255 255 / 0.12)" />
                <text
                  x={labelX}
                  y={labelY - (lines.length - 1) * 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {lines.map((line, lineIndex) => (
                    <tspan key={line} x={labelX} dy={lineIndex === 0 ? 0 : 11}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
          <polygon points={polygon} fill="rgb(20 184 166 / 0.18)" stroke="rgb(45 212 191)" strokeWidth="2" />
          {axes.map((axis, index) => {
            const [x, y] = point(index, axes.length, axis.score);
            return <circle key={axis.key} cx={x} cy={y} r="3.5" fill={axis.risk ? "rgb(251 113 133)" : "rgb(94 234 212)"} />;
          })}
        </svg>
      </div>
    </div>
  );
}
