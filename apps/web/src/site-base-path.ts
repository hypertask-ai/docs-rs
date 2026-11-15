const rootRelativePath = /^\/(?:[A-Za-z0-9._~-]+\/?)*$/u;

export const normalizeSiteBasePath = (value?: string): string => {
  const trimmed = (value ?? "").trim();

  if (trimmed === "" || trimmed === "/") {
    return "";
  }

  if (trimmed.startsWith("//") || !rootRelativePath.test(trimmed)) {
    throw new Error(
      "Site base path must be one root-relative path such as /ratstack. A relative path or a full URL cannot prefix the site's own links. Fix: set SITE_BASE_PATH to /ratstack, or leave it empty to serve the site at the origin root."
    );
  }

  return `/${trimmed.replaceAll(/^\/+|\/+$/gu, "")}`;
};

export const addSiteBasePath = (basePath: string, path: string): string => {
  if (basePath === "" || !path.startsWith("/") || path.startsWith("//")) {
    return path;
  }

  if (path === basePath || path.startsWith(`${basePath}/`)) {
    return path;
  }

  return path === "/" ? `${basePath}/` : `${basePath}${path}`;
};

export const removeSiteBasePath = (basePath: string, path: string): string => {
  if (basePath === "") {
    return path;
  }

  if (path === basePath) {
    return "/";
  }

  return path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : path;
};
