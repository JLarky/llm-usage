# llm-usage

Remix 3 app with Vite+ toolchain and Nitro deployment.

## Stack

- [Remix 3](https://remix.run/) (`remix@next`) — fetch-router, SSR, `clientEntry` hydration
- [vite-plugin-remix3](https://github.com/pi0/vite-plugin-remix3) + [Nitro](https://nitro.build/) — Vite dev/build and portable deploys
- [Vite+](https://viteplus.dev/) (`vp`) — lint, format, typecheck, dev, build

## Data storage

Subscription rows are stored as JSON in Deno KV under `["usage", "subscriptions"]`:

```json
{ "subscriptions": [{ "id": "cursor", "used": 6, "total": 20, ... }] }
```

- **Deno Deploy:** link a Deno KV database in the dashboard; `Deno.openKv()` connects automatically.
- **Local Deno:** set `DENO_KV_URL` to your database connect URL (see `.env.example`).
- **Local Node (`vp run dev`):** falls back to `data/usage-subscriptions.local.json`, then `data/usage-subscriptions.default.json`.

On first read, an empty KV key is seeded from the default JSON file.

### Update via API

```sh
curl -X POST https://llm-usage.jlarky.deno.net/api/usage \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <USAGE_API_TOKEN>' \
  -d @data/usage-subscriptions.default.json
```

`USAGE_API_TOKEN` is required on the server. POST without a matching `Authorization: Bearer` header returns 401.

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
