import type { ScorePoint } from "../api/types";

interface Props {
  points: ScorePoint[];
}

/** Small dependency-free line chart; native SVG, accessible via a text summary. */
export function ScoreTrendChart({ points }: Props) {
  if (points.length < 2) {
    return <p className="muted text-sm">Not enough essays yet to show a trend.</p>;
  }

  const width = 560;
  const height = 220;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 44;
  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const span = max - min || 1;
  const baseline = height - padBottom;

  const x = (i: number) =>
    padLeft + (i * (width - padLeft - padRight)) / (points.length - 1);
  const y = (v: number) => baseline - ((v - min) / span) * (height - padTop - padBottom);

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const summary = points.map((p) => `${p.label}: ${p.value}%`).join(", ");

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Score trend across the last ${points.length} essays. ${summary}.`}
      preserveAspectRatio="xMidYMid meet"
    >
      <line className="chart__axis" x1={padLeft} y1={baseline} x2={width - padRight} y2={baseline} />
      <text className="chart__axis-label" x={width / 2} y={height - 6} textAnchor="middle">
        Essay #
      </text>
      <text
        className="chart__axis-label"
        x={14}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${height / 2})`}
      >
        Score (%)
      </text>
      <polyline className="chart__line" points={line} />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle className="chart__point" cx={x(i)} cy={y(p.value)} r={4} />
          <text className="chart__value" x={x(i)} y={y(p.value) - 10} textAnchor="middle">
            {p.value}%
          </text>
          <text className="chart__label" x={x(i)} y={baseline + 16} textAnchor="middle">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
