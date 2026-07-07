import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import type { ProjectionPoint } from "../utils/usage-budget.ts";

const W = 600;
const H = 240;
const PAD = { top: 20, right: 20, bottom: 30, left: 40 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

export function ProjectionChart(handle: Handle<{ data: ProjectionPoint[] }>) {
  return () => {
    const data = handle.props.data;
    if (data.length < 2) return null;

    const maxVal = Math.max(
      100,
      ...data.map((d) => Math.max(d.totalConservative, d.totalAggressive)),
    );
    const yMax = Math.ceil(maxVal / 10) * 10;
    const xMax = data.length - 1;

    const xScale = (d: number) => PAD.left + (d / xMax) * PW;
    const yScale = (v: number) => PAD.top + PH - (v / yMax) * PH;

    const conPoints = data.map((d) => `${xScale(d.day)},${yScale(d.totalConservative)}`).join(" ");
    const aggPoints = data.map((d) => `${xScale(d.day)},${yScale(d.totalAggressive)}`).join(" ");

    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += 10) yTicks.push(v);

    const xLabels: { day: number; label: string }[] = [];
    const step = Math.max(1, Math.floor(xMax / 6));
    for (let d = 0; d <= xMax; d += step) {
      xLabels.push(data[d] ?? data[data.length - 1]);
    }
    if (xLabels.length === 0 || xLabels[xLabels.length - 1].day < xMax) {
      xLabels.push(data[data.length - 1]);
    }

    return (
      <div
        mix={css({
          marginTop: "20px",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          background: "var(--surface-3)",
          padding: "16px",
        })}
      >
        <h2
          mix={css({
            margin: "0 0 8px",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          })}
        >
          Projection (next {xMax} days)
        </h2>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          mix={css({
            width: "100%",
            height: "auto",
            display: "block",
            "--chart-line-con": "#2dacf9",
            "--chart-line-agg": "#c77700",
          })}
        >
          {/* Grid */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={yScale(v)}
                x2={PAD.left + PW}
                y2={yScale(v)}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={yScale(v) + 4}
                textAnchor="end"
                fill="var(--text-tertiary)"
                fontSize="11"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* X labels */}
          {xLabels.map((d) => (
            <text
              key={d.day}
              x={xScale(d.day)}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
              fill="var(--text-tertiary)"
              fontSize="11"
            >
              {d.label}
            </text>
          ))}

          {/* Data */}
          <polyline
            points={aggPoints}
            fill="none"
            stroke="var(--chart-line-agg)"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <polyline points={conPoints} fill="none" stroke="var(--chart-line-con)" strokeWidth="2" />

          {/* Start dots */}
          <circle
            cx={xScale(0)}
            cy={yScale(data[0].totalAggressive)}
            r="3"
            fill="var(--chart-line-agg)"
          />
          <circle
            cx={xScale(0)}
            cy={yScale(data[0].totalConservative)}
            r="3"
            fill="var(--chart-line-con)"
          />
        </svg>
        <div
          mix={css({
            display: "flex",
            gap: "16px",
            marginTop: "8px",
            fontSize: "11px",
            color: "var(--text-secondary)",
          })}
        >
          <span>
            <span
              mix={css({
                display: "inline-block",
                width: "12px",
                height: "3px",
                background: "var(--chart-line-con)",
                marginRight: "4px",
                verticalAlign: "middle",
              })}
            />
            Conservative
          </span>
          <span>
            <span
              mix={css({
                display: "inline-block",
                width: "12px",
                height: "3px",
                background: "var(--chart-line-agg)",
                marginRight: "4px",
                verticalAlign: "middle",
              })}
            />
            Aggressive
          </span>
        </div>
      </div>
    );
  };
}
