import type { Handle, RemixNode } from "remix/ui";
import { css } from "remix/ui";

import entryAssets from "../entry.client.ts?assets=client";

export interface DocumentProps {
  children?: RemixNode;
  head?: RemixNode;
  title?: string;
}

const DEFAULT_TITLE = readAppDisplayName("llm-usage");

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    const { children, head, title = DEFAULT_TITLE } = handle.props;

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <title>{title}</title>
          {head}
          {entryAssets.css.map((file) => (
            <link key={file.href} rel="stylesheet" href={file.href} />
          ))}
        </head>
        <body mix={css({ margin: 0 })}>
          {children}
          <script type="module" src={entryAssets.entry} />
        </body>
      </html>
    );
  };
}

function readAppDisplayName(value: string): string {
  return value.startsWith("%%") ? "Remix App" : decodeURIComponent(value);
}
