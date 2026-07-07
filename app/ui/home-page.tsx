import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import type { UsagePlanRow } from "../utils/usage-budget.ts";
import { Document } from "./document.tsx";

const FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const columns = [
  "Provider",
  "Conservative",
  "Aggressive",
  "Budget/day",
  "Reported Usage",
  "Days Left",
] as const;

export function HomePage(handle: Handle<{ rows: UsagePlanRow[] }>) {
  const rows = handle.props.rows;

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
                      {row.subscription.emoji} {row.subscription.provider}
                    </td>
                    <td mix={cellStyle(row.conservative)}>{row.conservative}</td>
                    <td mix={cellStyle()}>{row.aggressive}</td>
                    <td mix={cellStyle()}>{row.budgetPerDay}</td>
                    <td mix={cellStyle()}>{row.subscription.reportedUsage}</td>
                    <td mix={cellStyle()} title={row.timeTitle}>
                      {row.daysLeft}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </Document>
  );
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
