export const docsCacheControl = "public, max-age=0, must-revalidate";

export const docsErrorCacheControl = "no-store";

export const docsHtmlContentType = "text/html; charset=utf-8";

const docsContentTypes = new Map<string, string>([
  [".cjs", "text/plain; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml"],
]);

const extensionOf = (pathname: string) => {
  const name = pathname.slice(pathname.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");

  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
};

export const docsContentType = (pathname: string, fallback: string) =>
  docsContentTypes.get(extensionOf(pathname)) ?? fallback;
