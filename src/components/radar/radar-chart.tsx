import type { DeepSeekScores } from "@/types/report";

const axes: { key: keyof DeepSeekScores; label: string; invert?: boolean }[] = [
  { key: "sincerity", label: "真诚", invert: true },
  { key: "avoidance", label: "回避" },
  { key: "coldViolence", label: "冷暴力" },
  { key: "breadcrumbing", label: "养鱼" },
  { key: "manipulation", label: "操控" },
  { key: "overInvestmentRisk", label: "上头" },
];

function point(index: number, value: number, radius = 92) {
  const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
  const scaled = (value / 100) * radius;
  return [120 + Math.cos(angle) * scaled, 120 + Math.sin(angle) * scaled] as const;
}

export function RadarChart({ scores }: { scores: DeepSeekScores }) {
  const polygon = axes
    .map((axis, index) => point(index, axis.invert ? 100 - scores[axis.key] : scores[axis.key]).join(","))
    .join(" ");

  return (
    <div className="relative mx-auto aspect-square w-full max-w-72">
      <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
        {[92, 68, 44, 20].map((radius) => (
          <polygon
            key={radius}
            points={axes.map((_, index) => point(index, 100, radius).join(",")).join(" ")}
            fill="none"
            stroke="rgb(255 255 255 / 0.12)"
          />
        ))}
        {axes.map((axis, index) => {
          const [x, y] = point(index, 100, 96);
          const [labelX, labelY] = point(index, 100, 112);
          return (
            <g key={axis.key}>
              <line x1="120" y1="120" x2={x} y2={y} stroke="rgb(255 255 255 / 0.12)" />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {axis.label}
              </text>
            </g>
          );
        })}
        <polygon points={polygon} fill="rgb(244 63 94 / 0.28)" stroke="rgb(251 113 133)" strokeWidth="2" />
        {axes.map((axis, index) => {
          const [x, y] = point(index, axis.invert ? 100 - scores[axis.key] : scores[axis.key]);
          return <circle key={axis.key} cx={x} cy={y} r="3.5" fill="rgb(253 164 175)" />;
        })}
      </svg>
    </div>
  );
}
