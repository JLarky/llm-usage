import { clientEntry, css, on, type Handle } from "remix/ui";
import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

type Mode = "login" | "register" | "invite";

export const PasskeyButtons = clientEntry(
  "/app/ui/passkey-buttons.tsx",
  function PasskeyButtons(
    handle: Handle<{ mode: Mode; returnTo: string; inviteId?: string; error?: string | null }>,
  ) {
    let busy = false;
    let error = handle.props.error ?? null;

    async function postJson(url: string, body?: unknown) {
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: body == null ? undefined : JSON.stringify(body),
      });
      const json = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Request failed");
      }
      return json;
    }

    async function runRegister() {
      const options = await postJson("/api/auth/register/options");
      const attestation = await startRegistration({ optionsJSON: options as never });
      await postJson("/api/auth/register/verify", {
        response: attestation,
        label: "Primary device",
      });
      window.location.href = handle.props.returnTo || "/admin";
    }

    async function runLogin() {
      const options = await postJson("/api/auth/login/options");
      const assertion = await startAuthentication({ optionsJSON: options as never });
      await postJson("/api/auth/login/verify", { response: assertion });
      window.location.href = handle.props.returnTo || "/admin";
    }

    async function runInvite() {
      const inviteId = handle.props.inviteId;
      if (!inviteId) throw new Error("Missing invite id");
      const options = await postJson("/api/auth/invite/options", { inviteId });
      const attestation = await startRegistration({ optionsJSON: options as never });
      await postJson("/api/auth/invite/verify", {
        response: attestation,
        label: "Linked device",
      });
      window.location.href = "/admin";
    }

    async function onClick(action: () => Promise<void>) {
      if (busy) return;
      if (!browserSupportsWebAuthn()) {
        error = "This browser does not support passkeys.";
        void handle.update();
        return;
      }
      busy = true;
      error = null;
      void handle.update();
      try {
        await action();
      } catch (err) {
        error = err instanceof Error ? err.message : "Passkey failed";
        busy = false;
        void handle.update();
      }
    }

    return () => (
      <div
        mix={css({
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        })}
      >
        {error ? (
          <p
            mix={css({
              margin: 0,
              color: "var(--danger, #b42318)",
              fontSize: "13px",
            })}
          >
            {error}
          </p>
        ) : null}

        {handle.props.mode === "login" ? (
          <>
            <button
              type="button"
              disabled={busy}
              mix={[
                buttonStyle(),
                on("click", () => {
                  void onClick(runRegister);
                }),
              ]}
            >
              {busy ? "Waiting for passkey…" : "Create account with passkey"}
            </button>
            <button
              type="button"
              disabled={busy}
              mix={[
                buttonStyle({ secondary: true }),
                on("click", () => {
                  void onClick(runLogin);
                }),
              ]}
            >
              {busy ? "Waiting for passkey…" : "Sign in with existing passkey"}
            </button>
          </>
        ) : null}

        {handle.props.mode === "register" ? (
          <button
            type="button"
            disabled={busy}
            mix={[
              buttonStyle(),
              on("click", () => {
                void onClick(runRegister);
              }),
            ]}
          >
            {busy ? "Waiting for passkey…" : "Create account with passkey"}
          </button>
        ) : null}

        {handle.props.mode === "invite" ? (
          <button
            type="button"
            disabled={busy}
            mix={[
              buttonStyle(),
              on("click", () => {
                void onClick(runInvite);
              }),
            ]}
          >
            {busy ? "Waiting for passkey…" : "Link this device with passkey"}
          </button>
        ) : null}
      </div>
    );
  },
);

function buttonStyle(opts?: { secondary?: boolean }) {
  return css({
    appearance: "none",
    border: opts?.secondary ? "1px solid var(--border, #c8ccd0)" : "none",
    borderRadius: "10px",
    padding: "12px 14px",
    font: "inherit",
    fontWeight: 600,
    cursor: "pointer",
    background: opts?.secondary ? "transparent" : "var(--brand-blue, #2dacf9)",
    color: opts?.secondary ? "var(--text-primary, #313539)" : "#fff",
    "&:disabled": { opacity: 0.6, cursor: "default" },
  });
}
