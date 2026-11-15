export interface PlannedWorkerRoute {
  readonly active: false;
  readonly basePath: string;
  readonly pattern: string;
  readonly zoneName: string;
}

export const docsRatstackRoute: PlannedWorkerRoute = {
  active: false,
  basePath: "/ratstack",
  pattern: "docs.hypertask.ai/ratstack*",
  zoneName: "hypertask.ai",
};
