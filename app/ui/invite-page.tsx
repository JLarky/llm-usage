import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import { Document } from "./document.tsx";
import { PasskeyButtons } from "./passkey-buttons.tsx";

const FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function InvitePage(handle: Handle<{ error: string | null; inviteId: string }>) {
  const { error, inviteId } = handle.props;

  return () => (
    <Document head={<InviteHead />} title="llm-usage invite">
      <main
        mix={css({
          "--surface-0": "#dee2e6",
          "--surface-3": "#f0f4f7",
          "--text-primary": "#313539",
          "--text-secondary": "#5c6166",
          "--text-tertiary": "#94989c",
          "--border": "#c8ccd0",
          "--brand-blue": "#2dacf9",
          "--danger": "#b42318",
          "@media (prefers-color-scheme: dark)": {
            "--surface-0": "#1e2226",
            "--surface-3": "#313539",
            "--text-primary": "#dee2e6",
            "--text-secondary": "#b8bcc0",
            "--text-tertiary": "#94989c",
            "--border": "#45494e",
            "--danger": "#ff8d8d",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <div
          mix={css({
            width: "100%",
            maxWidth: "420px",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            background: "var(--surface-3)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
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
              Device invite
            </p>
            <h1 mix={css({ margin: 0, fontSize: "28px", lineHeight: 1.2, fontWeight: 700 })}>
              Link this device
            </h1>
            <p mix={css({ margin: "8px 0 0", color: "var(--text-secondary)" })}>
              One-time invite. Creates a new passkey on this browser and attaches it to the same
              user account so you share one usage dataset.
            </p>
          </header>
          {error &&
          !error.includes("not found") &&
          !error.includes("expired") &&
          !error.includes("used") ? (
            <p mix={css({ margin: 0, color: "var(--danger)" })}>{error}</p>
          ) : null}
          {error === "Invite not found" ||
          error === "Invite already used" ||
          error === "Invite expired" ? (
            <p mix={css({ margin: 0, color: "var(--danger)" })}>{error}</p>
          ) : (
            <PasskeyButtons mode="invite" returnTo="/admin" inviteId={inviteId} error={null} />
          )}
        </div>
      </main>
    </Document>
  );
}

function InviteHead() {
  return () => <meta name="color-scheme" content="light dark" />;
}
