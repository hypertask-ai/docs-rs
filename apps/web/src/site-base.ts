import type { HtmlBuilder } from "foldkit/html";

import {
  addSiteBasePath,
  normalizeSiteBasePath,
  removeSiteBasePath,
} from "./site-base-path.js";

export const siteBasePath = normalizeSiteBasePath(import.meta.env.BASE_URL);

export const siteRobotsTag = "noindex, nofollow";

export const isSiteBasePathSet = siteBasePath !== "";

export const withSiteBasePath = (path: string): string =>
  addSiteBasePath(siteBasePath, path);

export const withoutSiteBasePath = (path: string): string =>
  removeSiteBasePath(siteBasePath, path);

export const isWithinSiteBasePath = (path: string): boolean =>
  !isSiteBasePathSet ||
  path === siteBasePath ||
  path.startsWith(`${siteBasePath}/`);

const siteUrlAttributes: ReadonlySet<string> = new Set([
  "action",
  "formaction",
  "href",
  "src",
]);

const srcsetWithSiteBasePath = (basePath: string, value: string): string =>
  basePath === ""
    ? value
    : value
        .split(",")
        .map((candidate) => {
          const [url = "", ...descriptor] = candidate.trim().split(/\s+/u);

          return [addSiteBasePath(basePath, url), ...descriptor].join(" ");
        })
        .join(", ");

const siteAttributeValue = (
  basePath: string,
  name: string,
  value: string
): string => {
  if (name === "srcset") {
    return srcsetWithSiteBasePath(basePath, value);
  }

  return siteUrlAttributes.has(name) ? addSiteBasePath(basePath, value) : value;
};

export const siteBuilder = <Message>(
  basePath: string,
  h: HtmlBuilder<Message>
): HtmlBuilder<Message> =>
  basePath === ""
    ? h
    : {
        ...h,
        Action: (value) => h.Action(addSiteBasePath(basePath, value)),
        Attribute: (name, value) =>
          h.Attribute(name, siteAttributeValue(basePath, name, value)),
        Formaction: (value) => h.Formaction(addSiteBasePath(basePath, value)),
        Href: (value) => h.Href(addSiteBasePath(basePath, value)),
        Src: (value) => h.Src(addSiteBasePath(basePath, value)),
      };
