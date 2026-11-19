const docsPublishStack = "apps/infra/alchemy.docs-ratstack.ts";

const allowedResources = [
  { id: "RpcBackend", type: "Cloudflare.Worker" },
  { id: "Website", type: "Cloudflare.Worker" },
] as const;

const forbiddenResourceTypes: readonly {
  readonly label: string;
  readonly match: (type: string) => boolean;
}[] = [
  {
    label: "Zone",
    match: (type) => type.startsWith("Cloudflare.Zone."),
  },
  {
    label: "DnsRecord",
    match: (type) => type === "Cloudflare.DNS.Record",
  },
  {
    label: "CustomDomain",
    match: (type) => type.includes("CustomDomain"),
  },
  {
    label: "WorkerRoute",
    match: (type) => type === "Cloudflare.Workers.Route",
  },
];

export const docsRatstackResourcesError = (
  resources: Readonly<Record<string, { readonly Type: string }>>
): string | undefined => {
  for (const [id, { Type }] of Object.entries(resources)) {
    for (const { label, match } of forbiddenResourceTypes) {
      if (match(Type)) {
        return `${docsPublishStack} must not declare a ${label} resource (${id}: ${Type}). The publish stack must only create the docs Worker, its RPC backend and one route on the existing hypertask.ai zone. Fix: attach routes to the Worker with zoneName instead of adopting the zone, or move the resource into apps/infra/alchemy.run.ts.`;
      }
    }
  }

  const declared = Object.keys(resources);

  if (
    declared.length !== allowedResources.length ||
    !allowedResources.every(({ id, type }) => resources[id]?.Type === type)
  ) {
    return `${docsPublishStack} declared resources outside the docs Worker and its RPC backend (${declared.join(", ")}). Fix: keep this stack to those two Workers only.`;
  }

  return undefined;
};

export const docsRatstackResourcesAllowed = (
  resources: Readonly<Record<string, { readonly Type: string }>>
): boolean => docsRatstackResourcesError(resources) === undefined;
