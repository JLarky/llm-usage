import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import { Document } from "./document.tsx";
import { PasskeyButtons } from "./passkey-buttons.tsx";

const FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function LoginPage(handle: Handle<{ error: string | null; returnTo: string }>) {
  const { error, returnTo } = handle.props;

  return () => (
    <Document head={<LoginHead />} title="llm-usage login">
      <main mix={shellStyle()}>
        <div mix={cardStyle()}>
          <header>
            <p mix={eyebrowStyle()}>Account</p>
            <h1 mix={titleStyle()}>Sign in</h1>
            <p mix={bodyStyle()}>
              First time here? Use <strong>Create account</strong> — that is what triggers Touch ID
              / fingerprint on this Mac. <strong>Sign in</strong> only works after a passkey already
              exists for this site; otherwise the browser offers QR / security key.
            </p>
          </header>
          <PasskeyButtons mode="login" returnTo={returnTo} error={error} />
          <p mix={css({ margin: 0, fontSize: "12px", color: "var(--text-tertiary)" })}>
            <a href="/" mix={css({ color: "inherit" })}>
              Back to sample home
            </a>
          </p>
        </div>
      </main>
    </Document>
  );
}

function LoginHead() {
  return () => <meta name="color-scheme" content="light dark" />;
}

function shellStyle() {
  return css({
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
  });
}

function cardStyle() {
  return css({
    width: "100%",
    maxWidth: "420px",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    background: "var(--surface-3)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  });
}

function eyebrowStyle() {
  return css({
    margin: "0 0 8px",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-tertiary)",
  });
}

function titleStyle() {
  return css({ margin: 0, fontSize: "28px", lineHeight: 1.2, fontWeight: 700 });
}

function bodyStyle() {
  return css({ margin: "8px 0 0", color: "var(--text-secondary)" });
}
