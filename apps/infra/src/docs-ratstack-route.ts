import { normalizeSiteBasePath } from "../../web/src/site-base-path.js";

export const docsHost = "docs.hypertask.ai";

export const docsZoneName = "hypertask.ai";

export interface DocsRatstackRoute {
  readonly basePath: string;
  readonly pattern: string;
  readonly zoneName: string;
}

export const docsRatstackRoute = (siteBasePath: string): DocsRatstackRoute => {
  const basePath = normalizeSiteBasePath(siteBasePath);

  if (basePath === "") {
    throw new Error(
      "The docs publish stack needs a site base path. An empty SITE_BASE_PATH would put the new site on the root of docs.hypertask.ai, where the old site still answers. Fix: set SITE_BASE_PATH to /ratstack, or delete this stack once the cutover is done."
    );
  }

  return {
    basePath,
    pattern: `${docsHost}${basePath}*`,
    zoneName: docsZoneName,
  };
};
