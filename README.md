# llm-usage

Remix 3 app with Vite+ toolchain and Nitro deployment.

## Stack

- [Remix 3](https://remix.run/) (`remix@next`) — fetch-router, SSR, `clientEntry` hydration
- [vite-plugin-remix3](https://github.com/pi0/vite-plugin-remix3) + [Nitro](https://nitro.build/) — Vite dev/build and portable deploys
- [Vite+](https://viteplus.dev/) (`vp`) — lint, format, typecheck, dev, build

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
