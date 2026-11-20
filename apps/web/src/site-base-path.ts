const pathSegment = /^[A-Za-z0-9._~-]+$/u;

const isRootRelativePath = (value: string) => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  const segments = value.slice(1).split("/");
  const last = segments.length - 1;

  return segments.every((segment, index) =>
    segment === "" ? index === last : pathSegment.test(segment)
  );
};

export const normalizeSiteBasePath = (value?: string): string => {
  const trimmed = (value ?? "").trim();

  if (trimmed === "" || trimmed === "/") {
    return "";
  }

  if (!isRootRelativePath(trimmed)) {
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
