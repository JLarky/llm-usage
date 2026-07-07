import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import type { UsagePlanRow, TimeHorizon } from "../utils/usage-budget.ts";
import { buildProjectionData, formatTimeShift } from "../utils/usage-budget.ts";
import { Document } from "./document.tsx";
import { UsageBar, TimeBar } from "./progress-bar.tsx";
import { ProjectionChart } from "./projection-chart.tsx";

const MS_1H = 3_600_000;
const MS_6H = 6 * MS_1H;
const MS_1D = 24 * MS_1H;

const FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const HORIZONS: { value: TimeHorizon; label: string }[] = [
  { value: "cycle", label: "Cycle" },
  { value: "day", label: "Day" },
  { value: "hour", label: "Hour" },
];

const columns = [
  "Provider",
  "Conservative",
  "Aggressive",
  "Budget/day",
  "Reported Usage",
  "Days Left",
] as const;

export function HomePage(
  handle: Handle<{ rows: UsagePlanRow[]; horizon: TimeHorizon; now: Date; shiftMs: number }>,
) {
  const rows = handle.props.rows;
  const horizon = handle.props.horizon;
  const now = handle.props.now;
  const shiftMs = handle.props.shiftMs;
  const projection = buildProjectionData(
    rows.map((r) => r.subscription),
    now,
    horizon,
    30,
  );

  return () => (
    <Document head={<HomeHead />} title="llm-usage">
      <main
        mix={css({
          "--surface-0": "#dee2e6",
          "--surface-2": "#e8ecef",
          "--surface-3": "#f0f4f7",
          "--surface-4": "#f7fbff",
          "--text-primary": "#313539",
          "--text-secondary": "#5c6166",
          "--text-tertiary": "#94989c",
          "--brand-blue": "#2dacf9",
          "--border": "#c8ccd0",
          "@media (prefers-color-scheme: dark)": {
            "--surface-0": "#1e2226",
            "--surface-2": "#282c30",
            "--surface-3": "#313539",
            "--surface-4": "#363a3e",
            "--text-primary": "#dee2e6",
            "--text-secondary": "#b8bcc0",
            "--text-tertiary": "#94989c",
            "--border": "#45494e",
          },
          "& *, & *::before, & *::after": { boxSizing: "border-box" },
          margin: 0,
          padding: "32px 20px 48px",
          minHeight: "100vh",
          background: "var(--surface-0)",
          color: "var(--text-primary)",
          fontFamily: FONT_STACK,
          fontSize: "14px",
          lineHeight: 1.5,
        })}
      >
        <div
          mix={css({
            width: "100%",
            maxWidth: "1180px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          })}
        >
          <header>
            <p
              mix={css({
                margin: "0 0 8px",
                fontSize: "12px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              })}
            >
              Daily usage plan
            </p>
            <h1
              mix={css({
                margin: 0,
                fontSize: "28px",
                lineHeight: 1.2,
                fontWeight: 700,
              })}
            >
              LLM subscriptions
            </h1>
            <p
              mix={css({
                margin: "8px 0 0",
                color: "var(--text-secondary)",
                maxWidth: "72ch",
              })}
            >
              Under-budget providers first, then smallest overage. Use conservative ranges before
              aggressive pace.
            </p>
            <div
              mix={css({
                display: "flex",
                gap: "4px",
                marginTop: "12px",
              })}
            >
              {HORIZONS.map((h) => {
                const active = h.value === horizon;
                const href =
                  h.value === "cycle" ? buildUrl(shiftMs, "") : buildUrl(shiftMs, h.value);
                return (
                  <a
                    key={h.value}
                    href={href}
                    mix={css({
                      display: "inline-block",
                      padding: "4px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      borderRadius: "6px",
                      color: active ? "#fff" : "var(--text-secondary)",
                      background: active ? "var(--brand-blue)" : "var(--surface-2)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    })}
                  >
                    {h.label}
                  </a>
                );
              })}
            </div>
            <div
              mix={css({
                display: "flex",
                gap: "4px",
                marginTop: "8px",
                alignItems: "center",
              })}
            >
              {SHIFT_STEPS.map((step) => {
                const isNow = step.label === "Now";
                const newShift = isNow ? 0 : shiftMs + step.ms;
                const active = isNow && shiftMs === 0;
                return (
                  <a
                    key={step.label}
                    href={buildUrl(newShift, horizon)}
                    mix={css({
                      display: "inline-block",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      textDecoration: "none",
                      borderRadius: "4px",
                      color: active ? "#fff" : "var(--text-secondary)",
                      background: active ? "var(--brand-blue)" : "var(--surface-2)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    })}
                  >
                    {step.label}
                  </a>
                );
              })}
              <span
                mix={css({
                  fontSize: "11px",
                  color: "var(--text-tertiary)",
                  marginLeft: "4px",
                })}
              >
                {formatTimeShift(shiftMs)}
              </span>
            </div>
          </header>

          <div
            mix={css({
              overflowX: "auto",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              background: "var(--surface-3)",
            })}
          >
            <table
              mix={css({
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "920px",
              })}
            >
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      mix={css({
                        textAlign: "left",
                        padding: "12px 14px",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                        borderBottom: "1px solid var(--border)",
                        background: "var(--surface-2)",
                        whiteSpace: "nowrap",
                      })}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.subscription.id}>
                    <td
                      mix={css({
                        padding: "12px 14px",
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                      })}
                    >
                      <label
                        htmlFor={`radio-${row.subscription.id}`}
                        mix={css({
                          cursor: "pointer",
                          display: "block",
                          "&:hover": { opacity: "0.8" },
                        })}
                      >
                        {row.subscription.emoji} {row.subscription.provider}
                      </label>
                    </td>
                    <td mix={cellStyle(row.conservative)}>
                      <div>{row.conservative}</div>
                      <UsageBar
                        usedPercent={row.usedPercent}
                        target={row.conservativeTarget}
                        targetLabel="C"
                        barColor="#5c6166"
                      />
                    </td>
                    <td mix={cellStyle()}>
                      <div>{row.aggressive}</div>
                      <UsageBar
                        usedPercent={row.usedPercent}
                        target={row.aggressiveTarget}
                        targetLabel="A"
                      />
                    </td>
                    <td mix={cellStyle()}>{row.budgetPerDay}</td>
                    <td mix={cellStyle()}>{row.subscription.reportedUsage}</td>
                    <td mix={cellStyle()} title={row.timeTitle}>
                      <div>{row.daysLeft}</div>
                      <TimeBar
                        elapsedPercent={row.timeElapsedPercent}
                        label={row.timeElapsedLabel}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ProjectionChart data={projection} />
        </div>
      </main>
    </Document>
  );
}

const SHIFT_STEPS = [
  { ms: -MS_1D, label: "-1d" },
  { ms: -MS_6H, label: "-6h" },
  { ms: -MS_1H, label: "-1h" },
  { ms: 0, label: "Now" },
  { ms: MS_1H, label: "+1h" },
  { ms: MS_6H, label: "+6h" },
  { ms: MS_1D, label: "+1d" },
];

function buildUrl(shiftMs: number, horizon: string): string {
  const params = new URLSearchParams();
  if (horizon && horizon !== "cycle") params.set("horizon", horizon);
  if (shiftMs !== 0) {
    const shiftStr = shiftMs % MS_1D === 0 ? `${shiftMs / MS_1D}d` : `${shiftMs / MS_1H}h`;
    params.set("shift", shiftStr);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function cellStyle(highlight?: string) {
  const isOver = highlight?.startsWith("overage");
  const isDepleted = highlight === "depleted";

  return css({
    padding: "12px 14px",
    borderBottom: "1px solid var(--border)",
    color: isDepleted ? "#d14343" : isOver ? "#c77700" : "var(--text-primary)",
    whiteSpace: "nowrap",
  });
}

function HomeHead() {
  return () => <meta name="color-scheme" content="light dark" />;
}
