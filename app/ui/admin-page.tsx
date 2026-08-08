import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import type { DeviceInviteRecord, UserRecord } from "../data/users.ts";
import type { UsageSubscriptionRecord } from "../data/usage-types.ts";
import { Document } from "./document.tsx";

const FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const columns = ["Provider", "Used", "Total", "Cycle", "Resets at", "Id", "Action"] as const;

export function AdminPage(
  handle: Handle<{
    user: UserRecord;
    pendingInvites: DeviceInviteRecord[];
    subscriptions: UsageSubscriptionRecord[];
    error: string | null;
    notice: string | null;
    createdToken: string | null;
    confirmDelete: boolean;
  }>,
) {
  const { user, pendingInvites, subscriptions, error, notice, createdToken, confirmDelete } =
    handle.props;

  return () => (
    <Document head={<AdminHead />} title="llm-usage admin">
      <main
        mix={css({
          "--surface-0": "#dee2e6",
          "--surface-2": "#e8ecef",
          "--surface-3": "#f0f4f7",
          "--text-primary": "#313539",
          "--text-secondary": "#5c6166",
          "--text-tertiary": "#94989c",
          "--border": "#c8ccd0",
          "--brand-blue": "#2dacf9",
          "--danger": "#b42318",
          "@media (prefers-color-scheme: dark)": {
            "--surface-0": "#1e2226",
            "--surface-2": "#282c30",
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
        })}
      >
        <div
          mix={css({
            width: "100%",
            maxWidth: "960px",
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
              Admin
            </p>
            <h1 mix={css({ margin: 0, fontSize: "28px", lineHeight: 1.2, fontWeight: 700 })}>
              Your subscriptions
            </h1>
            <p mix={css({ margin: "8px 0 0", color: "var(--text-secondary)", maxWidth: "72ch" })}>
              Signed in as <code>{user.id}</code>. Edit your data, create personal API tokens for
              curl, and invite more of your devices with a one-time URL.
            </p>
            <div
              mix={css({
                display: "flex",
                gap: "12px",
                marginTop: "14px",
                alignItems: "center",
              })}
            >
              <a href="/" mix={linkStyle()}>
                Home
              </a>
              <form method="POST" action="/logout">
                <button type="submit" mix={buttonStyle({ secondary: true })}>
                  Sign out
                </button>
              </form>
            </div>
          </header>

          {error ? <p mix={css({ margin: 0, color: "var(--danger)" })}>{error}</p> : null}
          {notice ? <p mix={css({ margin: 0, color: "var(--text-secondary)" })}>{notice}</p> : null}
          {createdToken ? (
            <p
              mix={css({
                margin: 0,
                padding: "12px",
                borderRadius: "10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                wordBreak: "break-all",
              })}
            >
              New API token (copy now): <code>{createdToken}</code>
            </p>
          ) : null}

          <section mix={sectionStyle()}>
            <h2 mix={sectionTitleStyle()}>Usage rows</h2>
            <form method="POST" action="/admin">
              <input type="hidden" name="intent" value="save-usage" />
              <div mix={tableWrapStyle()}>
                <table mix={tableStyle()}>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column} scope="col" mix={thStyle()}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((row) => (
                      <tr key={row.id}>
                        <td mix={tdStyle()}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="emoji" value={row.emoji} />
                          <span>
                            {row.emoji}{" "}
                            <input name="provider" value={row.provider} mix={inputStyle()} />
                          </span>
                        </td>
                        <td mix={tdStyle()}>
                          <input
                            name="used"
                            type="number"
                            step="any"
                            value={row.used}
                            mix={inputStyle()}
                          />
                        </td>
                        <td mix={tdStyle()}>
                          <input
                            name="total"
                            type="number"
                            step="any"
                            value={row.total}
                            mix={inputStyle()}
                          />
                        </td>
                        <td mix={tdStyle()}>
                          <select name="cycle" mix={inputStyle()}>
                            <option value="weekly" selected={row.cycle === "weekly"}>
                              weekly
                            </option>
                            <option value="monthly" selected={row.cycle === "monthly"}>
                              monthly
                            </option>
                          </select>
                        </td>
                        <td mix={tdStyle()}>
                          <input name="resetsAt" value={row.resetsAt} mix={inputStyle()} />
                        </td>
                        <td
                          mix={css({ ...tdBase, color: "var(--text-tertiary)", fontSize: "12px" })}
                        >
                          {row.id}
                        </td>
                        <td mix={tdStyle()}>
                          <button
                            type="submit"
                            form={`delete-form-${row.id}`}
                            mix={linkButtonStyle()}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="submit" mix={buttonStyle()}>
                Save
              </button>
            </form>
            {subscriptions.map((row) => (
              <form
                key={`delete-form-${row.id}`}
                id={`delete-form-${row.id}`}
                method="POST"
                action="/admin"
              >
                <input type="hidden" name="intent" value="delete-subscription" />
                <input type="hidden" name="id" value={row.id} />
              </form>
            ))}
          </section>

          <section mix={sectionStyle()}>
            <h2 mix={sectionTitleStyle()}>Add subscription</h2>
            <form
              method="POST"
              action="/admin"
              mix={css({ display: "flex", flexDirection: "column", gap: "12px" })}
            >
              <input type="hidden" name="intent" value="add-subscription" />
              <div
                mix={css({
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                })}
              >
                <div>
                  <label
                    mix={css({
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                    })}
                  >
                    ID
                  </label>
                  <input name="newId" placeholder="e.g. cursor" required mix={inputStyle()} />
                </div>
                <div>
                  <label
                    mix={css({
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                    })}
                  >
                    Emoji
                  </label>
                  <input name="newEmoji" defaultValue="🟢" required mix={inputStyle()} />
                </div>
                <div>
                  <label
                    mix={css({
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                    })}
                  >
                    Provider
                  </label>
                  <input name="newProvider" placeholder="e.g. Cursor" required mix={inputStyle()} />
                </div>
                <div>
                  <label
                    mix={css({
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                    })}
                  >
                    Used
                  </label>
                  <input
                    name="newUsed"
                    type="number"
                    step="any"
                    defaultValue="0"
                    required
                    mix={inputStyle()}
                  />
                </div>
                <div>
                  <label
                    mix={css({
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                    })}
                  >
                    Total
                  </label>
                  <input
                    name="newTotal"
                    type="number"
                    step="any"
                    defaultValue="100"
                    required
                    mix={inputStyle()}
                  />
                </div>
                <div>
                  <label
                    mix={css({
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                    })}
                  >
                    Cycle
                  </label>
                  <select name="newCycle" mix={inputStyle()}>
                    <option value="weekly">weekly</option>
                    <option value="monthly" selected>
                      monthly
                    </option>
                  </select>
                </div>
                <div>
                  <label
                    mix={css({
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 600,
                      fontSize: "12px",
                    })}
                  >
                    Resets at
                  </label>
                  <input
                    name="newResetsAt"
                    defaultValue={new Date().toISOString().slice(0, 19)}
                    required
                    mix={inputStyle()}
                  />
                </div>
              </div>
              <div>
                <button type="submit" mix={buttonStyle()}>
                  Add subscription
                </button>
              </div>
            </form>
          </section>

          <section mix={sectionStyle()}>
            <h2 mix={sectionTitleStyle()}>Devices / passkeys</h2>
            <ul mix={css({ margin: 0, paddingLeft: "18px" })}>
              {user.passkeys.map((passkey) => (
                <li key={passkey.credentialId}>
                  {passkey.label} · added {passkey.createdAt.slice(0, 10)}
                </li>
              ))}
            </ul>
            <form method="POST" action="/admin" mix={css({ marginTop: "12px" })}>
              <input type="hidden" name="intent" value="create-device-invite" />
              <button type="submit" mix={buttonStyle({ secondary: true })}>
                Create device invite URL
              </button>
            </form>
            {pendingInvites.length > 0 ? (
              <ul mix={css({ margin: "12px 0 0", paddingLeft: "18px" })}>
                {pendingInvites.map((invite) => (
                  <li key={invite.id}>
                    <code>/invite/{invite.id}</code> · expires {invite.expiresAt.slice(0, 10)}{" "}
                    <form method="POST" action="/admin" mix={css({ display: "inline" })}>
                      <input type="hidden" name="intent" value="revoke-device-invite" />
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button type="submit" mix={linkButtonStyle()}>
                        revoke
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section mix={sectionStyle()}>
            <h2 mix={sectionTitleStyle()}>Personal API tokens</h2>
            <p mix={css({ margin: "0 0 12px", color: "var(--text-secondary)" })}>
              Use as <code>Authorization: Bearer …</code> for <code>POST /api/usage</code>. Scoped
              to your data only.
            </p>
            <form
              method="POST"
              action="/admin"
              mix={css({ display: "flex", gap: "8px", marginBottom: "12px" })}
            >
              <input type="hidden" name="intent" value="create-api-token" />
              <input name="tokenName" placeholder="Token name" mix={inputStyle()} />
              <button type="submit" mix={buttonStyle({ secondary: true })}>
                Create token
              </button>
            </form>
            {user.apiTokens.length === 0 ? (
              <p mix={css({ margin: 0, color: "var(--text-tertiary)" })}>No tokens yet.</p>
            ) : (
              <ul mix={css({ margin: 0, paddingLeft: "18px" })}>
                {user.apiTokens.map((token) => (
                  <li key={token.id}>
                    {token.name} · <code>{token.prefix}…</code> · {token.createdAt.slice(0, 10)}{" "}
                    <form method="POST" action="/admin" mix={css({ display: "inline" })}>
                      <input type="hidden" name="intent" value="revoke-api-token" />
                      <input type="hidden" name="tokenId" value={token.id} />
                      <button type="submit" mix={linkButtonStyle()}>
                        revoke
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            mix={css({
              border: "1px solid var(--danger)",
              borderRadius: "12px",
              background: "var(--surface-3)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            })}
          >
            <h2 mix={sectionTitleStyle()}>Delete account</h2>
            {confirmDelete ? (
              <>
                <p mix={css({ margin: 0, color: "var(--danger)" })}>
                  Are you sure? This permanently deletes your user, passkeys, invites, API tokens,
                  and usage data. This cannot be undone.
                </p>
                <div mix={css({ display: "flex", gap: "12px", alignItems: "center" })}>
                  <form method="POST" action="/admin">
                    <input type="hidden" name="intent" value="delete-account" />
                    <input type="hidden" name="confirm" value="yes" />
                    <button type="submit" mix={buttonStyle({ danger: true })}>
                      Yes, delete everything
                    </button>
                  </form>
                  <a href="/admin" mix={linkStyle()}>
                    Cancel
                  </a>
                </div>
              </>
            ) : (
              <>
                <p mix={css({ margin: 0, color: "var(--text-secondary)" })}>
                  Remove this account and all stored data for <code>{user.id}</code>.
                </p>
                <a href="/admin?confirmDelete=1" mix={buttonStyle({ danger: true, asLink: true })}>
                  Delete account…
                </a>
              </>
            )}
          </section>
        </div>
      </main>
    </Document>
  );
}

const tdBase = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
} as const;

function AdminHead() {
  return () => <meta name="color-scheme" content="light dark" />;
}

function sectionStyle() {
  return css(sectionBase);
}

const sectionBase = {
  border: "1px solid var(--border)",
  borderRadius: "12px",
  background: "var(--surface-3)",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
} as const;

function sectionTitleStyle() {
  return css({ margin: 0, fontSize: "16px", fontWeight: 700 });
}

function tableWrapStyle() {
  return css({ overflowX: "auto", marginBottom: "12px" });
}

function tableStyle() {
  return css({ width: "100%", borderCollapse: "collapse", minWidth: "720px" });
}

function thStyle() {
  return css({
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--text-tertiary)",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
  });
}

function tdStyle() {
  return css(tdBase);
}

function inputStyle() {
  return css({
    width: "100%",
    minWidth: "72px",
    font: "inherit",
    padding: "6px 8px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
  });
}

function buttonStyle(opts?: { secondary?: boolean; danger?: boolean; asLink?: boolean }) {
  return css({
    appearance: "none",
    display: opts?.asLink ? "inline-block" : undefined,
    textDecoration: opts?.asLink ? "none" : undefined,
    border: opts?.secondary ? "1px solid var(--border)" : "none",
    borderRadius: "10px",
    padding: "10px 14px",
    font: "inherit",
    fontWeight: 600,
    cursor: "pointer",
    background: opts?.danger
      ? "var(--danger)"
      : opts?.secondary
        ? "transparent"
        : "var(--brand-blue)",
    color: opts?.secondary ? "var(--text-primary)" : "#fff",
  });
}

function linkStyle() {
  return css({ color: "var(--brand-blue)", fontWeight: 600 });
}

function linkButtonStyle() {
  return css({
    appearance: "none",
    border: "none",
    background: "transparent",
    color: "var(--danger)",
    font: "inherit",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  });
}
