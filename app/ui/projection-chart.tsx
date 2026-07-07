import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import type { ProjectionData } from "../utils/usage-budget.ts";

const W = 600;
const H = 260;
const PAD = { top: 20, right: 60, bottom: 30, left: 40 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

export function ProjectionChart(handle: Handle<{ data: ProjectionData }>) {
  return () => {
    const { series, combined, days } = handle.props.data;
    if (series.length === 0) return null;
    const xMax = days;

    const allValues = series.flatMap((s) => [...s.conservative, ...s.aggressive]);
    if (combined) allValues.push(...combined.conservative, ...combined.aggressive);
    const maxVal = Math.max(100, ...allValues);
    const yMax = Math.ceil(maxVal / 10) * 10;

    const xScale = (d: number) => PAD.left + (d / xMax) * PW;
    const yScale = (v: number) => PAD.top + PH - (v / yMax) * PH;

    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += 10) yTicks.push(v);

    const xTickDays: number[] = [];
    const step = Math.max(1, Math.floor(xMax / 6));
    for (let d = 0; d <= xMax; d += step) xTickDays.push(d);
    if (xTickDays[xTickDays.length - 1] < xMax) xTickDays.push(xMax);

    return (
      <div
        id="chart"
        mix={css({
          marginTop: "20px",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          background: "var(--surface-3)",
          padding: "16px",
          // radio-toggle chart visibility
          "& .series-provider": { display: "none" },
          "& .legend-provider": { opacity: "0.3" },
          "&:has(#radio-all:checked) .series-combined": { display: "block" },
          "&:has(#radio-all:checked) .legend-combined": { opacity: "1" },
          ...Object.fromEntries(
            series.map((s) => [
              `&:has(#radio-${s.id}:checked) .series-${s.id}`,
              { display: "block" },
            ]),
          ),
          ...Object.fromEntries(
            series.map((s) => [`&:has(#radio-${s.id}:checked) .legend-${s.id}`, { opacity: "1" }]),
          ),
        })}
      >
        {/* Hidden radio inputs for CSS-only toggle */}
        <input
          type="radio"
          name="chart-view"
          id="radio-all"
          defaultChecked
          mix={css({ display: "none" })}
        />
        {series.map((s) => (
          <input
            key={s.id}
            type="radio"
            name="chart-view"
            id={`radio-${s.id}`}
            mix={css({ display: "none" })}
          />
        ))}

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
          {xTickDays.map((d) => (
            <text
              key={d}
              x={xScale(d)}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
              fill="var(--text-tertiary)"
              fontSize="11"
            >
              {d === 0 ? "now" : `+${d}d`}
            </text>
          ))}

          {/* Combined series */}
          {combined && (
            <g class="series-group series-combined">
              <polyline
                points={combined.conservative.map((v, d) => `${xScale(d)},${yScale(v)}`).join(" ")}
                fill="none"
                stroke={combined.color}
                strokeWidth="2"
              />
              <polyline
                points={combined.aggressive.map((v, d) => `${xScale(d)},${yScale(v)}`).join(" ")}
                fill="none"
                stroke={combined.color}
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <circle
                cx={xScale(0)}
                cy={yScale(combined.conservative[0])}
                r="3"
                fill={combined.color}
              />
            </g>
          )}

          {/* Per-provider series */}
          {series.map((s) => (
            <g key={s.id} class={`series-group series-provider series-${s.id}`}>
              <polyline
                points={s.conservative.map((v, d) => `${xScale(d)},${yScale(v)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
              />
              <polyline
                points={s.aggressive.map((v, d) => `${xScale(d)},${yScale(v)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <circle cx={xScale(0)} cy={yScale(s.conservative[0])} r="3" fill={s.color} />
            </g>
          ))}
        </svg>
        <div
          mix={css({
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 16px",
            marginTop: "8px",
            fontSize: "11px",
            color: "var(--text-secondary)",
          })}
        >
          {combined && (
            <span class="legend-item legend-combined">
              <span
                mix={css({
                  display: "inline-block",
                  width: "12px",
                  height: "3px",
                  background: combined.color,
                  marginRight: "4px",
                  verticalAlign: "middle",
                })}
              />
              {combined.label}
            </span>
          )}
          {series.map((s) => (
            <span key={s.id} class={`legend-item legend-provider legend-${s.id}`}>
              <span
                mix={css({
                  display: "inline-block",
                  width: "12px",
                  height: "3px",
                  background: s.color,
                  marginRight: "4px",
                  verticalAlign: "middle",
                })}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>
    );
  };
}
