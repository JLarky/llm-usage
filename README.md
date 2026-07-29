# llm-usage

Remix 3 app with Vite+ toolchain and Nitro deployment.

## Stack

- [Remix 3](https://remix.run/) (`remix@next`) — fetch-router, SSR, `clientEntry` hydration
- [vite-plugin-remix3](https://github.com/pi0/vite-plugin-remix3) + [Nitro](https://nitro.build/) — Vite dev/build and portable deploys
- [Vite+](https://viteplus.dev/) (`vp`) — lint, format, typecheck, dev, build
- [SimpleWebAuthn](https://simplewebauthn.dev/) — passkey register / login

## Accounts and data

- Anonymous home page shows **sample** subscription data.
- Sign in with a **passkey** creates a random user id and a personal copy of the data.
- Signed-in home page shows **your** data. Edit it on `/admin`.
- Link more of your devices with a one-time `/invite/:id` URL (new passkey on that device, same user).
- Create **personal API tokens** on `/admin` for curl / scripts. There is no global `USAGE_API_TOKEN`.

KV shape (Deno KV or local `data/app-store.local.json`):

- `["user", userId]` — passkeys, invites, API token metadata
- `["usage", userId]` — that user's subscriptions document
- `["cred", credentialId]` → userId
- `["invite", inviteId]` → userId
- `["apitoken", tokenHash]` → userId

Deno deployments use the KV database selected by `DENO_KV_URL` instead. llm-usage stores all managed KV records below the `llm-usage` key namespace so it can share a production database with other applications without colliding with their records. The local JSON fallback remains unchanged.

### Update via API

```sh
curl -X POST https://llm-usage.jlarky.deno.net/api/usage \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <personal-api-token>' \
  -d @data/usage-subscriptions.default.json
```

Anonymous `GET /api/usage` returns sample data. Authenticated GET/POST are scoped to that user.

### WebAuthn env

- RP ID is the **exact request hostname** (e.g. `llm-usage.jlarky.deno.net`). Do **not** set `WEBAUTHN_RP_ID=jlarky.deno.net` — `deno.net` is a public suffix, and a parent RP ID makes browsers offer QR / security keys instead of Touch ID.
- Local: open `http://localhost:…` (not a LAN IP, and not mixed with `127.0.0.1` — those are different RP IDs). Do not set `WEBAUTHN_RP_ID` unless it exactly matches the host you open.
- `SESSION_SECRET` required in production
- Request `Origin` is accepted for `localhost` / `127.0.0.1` and `https://*.jlarky.deno.net`
- Registration prefers platform / `client-device` (Touch ID)

See `.env.example`.

## Commands

```sh
vp install
vp run dev
vp run check
vp run build
vp run preview
```

Production server after build:

```sh
node .output/server/index.mjs
```

## Project layout

- `app/actions/controller.tsx` — top-level route actions
- `app/routes.ts` — route contract
- `app/router.ts` — wires routes to handlers
- `app/middleware/render.tsx` — request-scoped HTML renderer
- `app/entry.server.ts` — Nitro SSR entry
- `app/entry.client.ts` — browser hydration entry
- `app/ui/` — shared document shell and pages
- `public/` — static files

See `AGENTS.md` and `.agents/skills/remix/SKILL.md` for conventions.
