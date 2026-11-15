const docsRatstackResources: Readonly<Record<string, string>> = {
  HypertaskDocsZone: "Cloudflare.Zone.Zone",
  RatstackDocsRoute: "Cloudflare.Workers.Route",
  RpcBackend: "Cloudflare.Worker",
  Website: "Cloudflare.Worker",
};

export const docsRatstackResourcesAllowed = (
  resources: Readonly<Record<string, { readonly Type: string }>>
): boolean => {
  const declared = Object.keys(resources);

  return (
    declared.length === Object.keys(docsRatstackResources).length &&
    declared.every((id) => resources[id]?.Type === docsRatstackResources[id])
  );
};
