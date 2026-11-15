const allowedResources = [
  { id: "HypertaskDocsZone", type: "Cloudflare.Zone.Zone" },
  { id: "RatstackDocsRoute", type: "Cloudflare.Workers.Route" },
  { id: "RpcBackend", type: "Cloudflare.Worker" },
  { id: "Website", type: "Cloudflare.Worker" },
] as const;

export const docsRatstackResourcesAllowed = (
  resources: Readonly<Record<string, { readonly Type: string }>>
): boolean => {
  const declared = Object.keys(resources);

  return (
    declared.length === allowedResources.length &&
    allowedResources.every(({ id, type }) => resources[id]?.Type === type)
  );
};
