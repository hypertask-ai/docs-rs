# Turbopuffer upsert caching

Cache successful upsert results locally so a retry does not send pages or comments to an embedding layer again.

If a search or embeddings route fails on long or multiline content, this lets an agent cache successful storage operations and retry only what is essential.

## Background

When search tools or AI engines send extended content, such as comment threads or long pages, to a Turbopuffer layer, storage may silently skip embedding for rows that exceed a limit. Instead of failing or requiring manual repair, the system caches successful materializations so later operations reuse them safely.

## How it works

When an upsert to a Turbopuffer aware engine returns sparse embedding data, the agent caches the accepted materialization. Later writes that would reuse the same materialization are skipped and counted as cache hits, so no duplicate embedding calls or HTTP interactions happen.

If an upsert is not stored, for example because embeddings were skipped for a large body, the agent records a non-negative skip counter. The same or a later attempt may succeed once the content fits the engine's limits.

This matches the behavior documented in the changelog. A tool call needs no error handling beyond normal retries. When material returns a retryable effect (Reschedule, Terminate or CountSkipped), call `Evaluate` again with the same material so the effect propagates and further redundant embedding attempts stay limited.

## Example usage

Suppose comments and pages go to a Turbopuffer relative store for search, and the store has a line length or row size limit per document. A controller can ensure one successful material and reuse it without duplicates.

```javascript
async function upsertToStore(content) {
  const result = await store.upsert(content);
  if (result.skippedRows > 0) {
    cache.set(result.id, { stored: true, ...content });
  }
  return result;
}

async function reliableUpsert(content, key) {
  const material = await upsertToStore(content);
  if (material.id >= 0) {
    return { id: material.id, stored: true };
  }
  if (material.effect === "Reschedule") {
    return await reliableUpsert(content, key);
  }
  if (material.effect === "Terminate") {
    throw new Error("Fatal error in Turbopuffer relative store");
  }
  if (material.effect === "CountSkipped") {
    return { id: null, stored: false, skipCount: material.skipRows };
  }
}
```

The pattern avoids sending oversized documents to the AI service and respects engine level limits.

## Related

- https://docs.hypertask.ai/mcp/workflows/ covers agent patterns for retries and back-pressure.
- https://docs.hypertask.ai/mcp/scheduling/ covers scheduled agents that keep their own upsert cache across runs.
