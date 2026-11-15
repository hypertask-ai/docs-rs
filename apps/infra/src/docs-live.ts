export type DocsSettingSurface =
  | "github-secret"
  | "github-variable"
  | "script-setting"
  | "worker-secret"
  | "worker-variable";

export interface DocsLiveSetting {
  readonly name: string;
  readonly sensitive: boolean;
  readonly surface: DocsSettingSurface;
}

export interface DocsLiveResource {
  readonly action: "adopt";
  readonly declareIn: string;
  readonly declaredInStack: boolean;
  readonly logicalId: string;
  readonly name: string;
  readonly type: string;
}

export const docsZoneName = "hypertask.ai";

export const docsPagesProjectName = "hypertask-docs";

export const docsPagesBranch = "main";

export const docsPagesDomainName = "docs.hypertask.ai";

export const docsMcpWorkerName = "hypertask-docs-mcp";

const docsCutoverTicket = "HTPR-9201";

export const docsLiveGithubEnvironment = "scheduled-jobs";

export const docsLiveResources: readonly DocsLiveResource[] = [
  {
    action: "adopt",
    declareIn: docsCutoverTicket,
    declaredInStack: false,
    logicalId: "HypertaskDocsZone",
    name: docsZoneName,
    type: "Cloudflare.Zone.Zone",
  },
  {
    action: "adopt",
    declareIn: docsCutoverTicket,
    declaredInStack: false,
    logicalId: "HypertaskDocsPages",
    name: docsPagesProjectName,
    type: "Cloudflare.Pages.Project",
  },
  {
    action: "adopt",
    declareIn: docsCutoverTicket,
    declaredInStack: false,
    logicalId: "HypertaskDocsPagesDomain",
    name: docsPagesDomainName,
    type: "Cloudflare.Pages.Domain",
  },
  {
    action: "adopt",
    declareIn: docsCutoverTicket,
    declaredInStack: false,
    logicalId: "HypertaskDocsMcp",
    name: docsMcpWorkerName,
    type: "Cloudflare.Worker",
  },
];

export const docsLiveSettings: readonly DocsLiveSetting[] = [
  { name: "CLOUDFLARE_API_TOKEN", sensitive: true, surface: "github-secret" },
  { name: "DOCS_REFS_HT_TOKEN", sensitive: true, surface: "github-secret" },
  { name: "DOCS_REFS_PUSH_KEY", sensitive: true, surface: "github-secret" },
  { name: "DOCS_REFS_ENABLED", sensitive: false, surface: "github-variable" },
  { name: "DOCS_REFS_PUBLISH", sensitive: false, surface: "github-variable" },
  { name: "DOCS_REFS_AGENT_ID", sensitive: false, surface: "github-variable" },
  {
    name: "DOCS_MCP_APPROVED_SHA",
    sensitive: false,
    surface: "github-variable",
  },
  { name: "GITHUB_TOKEN", sensitive: true, surface: "worker-secret" },
  { name: "JWT_SECRET", sensitive: true, surface: "worker-secret" },
  { name: "CF_PAGES_DEPLOY_HOOK", sensitive: true, surface: "worker-secret" },
  { name: "GITHUB_OWNER", sensitive: false, surface: "worker-variable" },
  { name: "GITHUB_REPO", sensitive: false, surface: "worker-variable" },
  { name: "GITHUB_BRANCH", sensitive: false, surface: "worker-variable" },
  { name: "DOCS_BASE_PATH", sensitive: false, surface: "worker-variable" },
  { name: "CONFIG_FILE_PATH", sensitive: false, surface: "worker-variable" },
  {
    name: "DOCS_EDITOR_USER_IDS",
    sensitive: false,
    surface: "worker-variable",
  },
  { name: "HYPERTASK_MCP_TOKEN", sensitive: true, surface: "script-setting" },
  { name: "DOCS_SITE_URL", sensitive: false, surface: "script-setting" },
  { name: "EXPECTED_AGENT_ID", sensitive: false, surface: "script-setting" },
];
