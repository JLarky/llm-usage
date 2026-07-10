import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { Router } from "remix/router";
import { renderWith } from "remix/middleware/render";
import { createHtmlResponse } from "remix/response/html";
import type { RemixNode } from "remix/ui";
import { renderToStream } from "remix/ui/server";

/** Stable module ids for clientEntry components (survives Nitro SSR bundling). */
const CLIENT_ENTRY_BY_EXPORT: Record<string, string> = {
  PasskeyButtons: "/app/ui/passkey-buttons.tsx",
  PromptButton: "/app/assets/prompt-button.tsx",
};

export function render() {
  return renderWith(
    ({ request, router }) =>
      function render(node: RemixNode, init?: ResponseInit) {
        const stream = renderToStream(node, {
          frameSrc: request.url,
          signal: request.signal,
          resolveFrame: (src) => resolveFrame(router, request, src),
          async resolveClientEntry(entryId, component) {
            const exportName =
              entryId.split("#")[1] || component.name || titleCaseFileName(entryId);

            // Explicit app-relative ids (preferred for production)
            if (entryId.startsWith("/app/")) {
              return { href: entryId.split("#")[0]!, exportName };
            }

            if (!entryId.startsWith("file://")) {
              throw new Error(
                `Expected \`/app/...\` or \`import.meta.url\` for clientEntry ID, received '${entryId}'`,
              );
            }

            const filePath = fileURLToPath(entryId);
            let relPath = path.relative(process.cwd(), filePath).replaceAll("\\", "/");

            // Nitro SSR bundles collapse import.meta.url to .output/server/_ssr/ssr.mjs
            if (relPath.includes(".output/") || /(^|\/)ssr\.mjs$/.test(relPath)) {
              const recovered = CLIENT_ENTRY_BY_EXPORT[exportName];
              if (!recovered) {
                throw new Error(
                  `Cannot resolve client entry "${exportName}" from bundled SSR path ${relPath}`,
                );
              }
              return { href: recovered, exportName };
            }

            return {
              href: `/${relPath}`,
              exportName,
            };
          },
        });

        return createHtmlResponse(stream, init);
      },
  );
}

async function resolveFrame(router: Router, request: Request, src: string) {
  const url = new URL(src, request.url);

  const headers = new Headers();
  headers.set("Accept", "text/html");

  const cookie = request.headers.get("Cookie");
  if (cookie) headers.set("Cookie", cookie);

  const response = await router.fetch(
    new Request(url, {
      method: "GET",
      headers,
      signal: request.signal,
    }),
  );

  if (!response.ok) {
    return `<pre>Frame error: ${response.status} ${response.statusText}</pre>`;
  }

  if (response.body) return response.body;
  return await response.text();
}

function titleCaseFileName(fileUrl: string): string {
  const url = new URL(fileUrl, "file:///");
  const fileName = path.basename(url.pathname, path.extname(url.pathname));
  return fileName
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join("");
}
