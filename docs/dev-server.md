# Dev Server

Use `boo` when you want a dev server that keeps running and that you can attach to later from inside the VM.

## Start

From the repo root:

```sh
boo new llm-usage-dev -d -- bash -lc 'cd /Users/ylapin/vm/JLarky/llm-usage && vp run dev -- --host 0.0.0.0'
```

This creates a detached `boo` session named `llm-usage-dev` and starts the Remix dev server inside it.

## Check status

Peek at the live terminal without attaching:

```sh
boo peek llm-usage-dev
```

When the server is ready you should see output like:

```text
➜  Local:   http://localhost:4576/
➜  Network: http://192.168.5.15:4576/
```

From inside the VM, verify the server directly:

```sh
curl http://127.0.0.1:4576/
curl http://127.0.0.1:4576/api/usage
```

## Attach

Attach to the running session:

```sh
boo attach llm-usage-dev
```

Detach with normal `boo` key handling after you are done inspecting it.

## Stop

Kill the session when you no longer need it:

```sh
boo kill llm-usage-dev
```

## Notes

- `localhost:4576` works from inside the VM when the server is running in `boo`.
- Local Node persistence uses `data/app-store.local.json`.
- Anonymous `GET /api/usage` returns sample data.
- `POST /api/usage` requires a personal API token (`Authorization: Bearer …`) or a signed-in session cookie.
