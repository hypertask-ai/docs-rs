# Cross-request token cache

Reuse authenticated MCP client credentials across calls to avoid repeated login prompts, with a configurable token lifetime.

The MCP server normally checks login on every call unless credentials are cached safely. This lets an agent reuse your authentication across calls without prompting you to sign in each time.

## Authentication caching

By default, each MCP tool call needs fresh login credentials from your Hypertask account, sent as a Bearer token in the `Authorization` header. To let an agent reuse the same authenticated session across several tool calls, enable cross-request credential caching on the MCP client.

### Enable caching

On an MCP client (Python, Node.js, and others), attach the agent's token once and keep it alive across calls.

```python
from langchain_mcp import MCPServer

AGENT_TOKEN = "<your-agent-token>"

mcps = MCPServer(
    tools=["list", "tasks.create"],
    headers={
        "Authorization": f"Bearer {AGENT_TOKEN}"
    },
    keep_alive=True
)

mcps.tasks.create(input={"title": "Ship the change"})
mcps.tasks.create(input={"title": "Update docs"})
```

In Node.js, keep one HTTP client session and set keep-alive options.

```javascript
import { MCPServer } from "@langchain/mcp";

const AGENT_TOKEN = process.env.AGENT_TOKEN;

const mcps = new MCPServer({
  tools: ["list", "tasks.create", "tasks.update"],
  baseUrl: "https://mcp.hypertask.ai/mcp",
  headers: {
    Authorization: `Bearer ${AGENT_TOKEN}`,
  },
  keepAlive: true,
});

await mcps.tasks.create({ input: { title: "Ship the change" } });
await mcps.tasks.create({ input: { title: "Update docs" } });
```

If you use a dynamic MCP client generator, such as LangChain `getMCPTools`, bake in client characteristics that avoid per-call tokenisation.

```javascript
const { listMCPTools, getMCPClient } = require("@hypertask/mcp");

const mcpTools = await listMCPTools({
  baseUrl: "https://mcp.hypertask.ai/mcp",
  headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
});

const client = getMCPClient(mcpTools, { keepAlive: true });
```

### Cache lifetime

Your agent token enables ephemeral agent credentials within your session. For highly sensitive projects, rotate or revoke tokens more often. If a config enforces token expiration that does not align with session lifetimes, disable caching and let the client re-authenticate on each call.

To force fresh authentication, use a new agent token per session, or clear and refetch tokens on long-running sessions.

```javascript
const refreshToken = await refreshAgentToken(expiredToken);
const client = getMCPClient(mcpTools, {
  baseUrl: "https://mcp.hypertask.ai/mcp",
  headers: {
    Authorization: `Bearer ${refreshToken}`,
  },
});
```

### Choose the right mode

| Use caching when | Avoid caching when |
| --- | --- |
| Agents run in a recurring session with predictable occasional actions, such as a background scheduler or a responsive agent. | Agents run under high-turnover credentials, such as per-runtime tokens. |
| You run locally in a trusted environment. | Agents share tokens in shared or temporary runtimes, such as CI runners or sandboxed containers. |
| MCP client sessions are long-lived and have well-defined shutdown hooks. | Token-lifetime events, such as hard expiration, conflict with client keep-alive mode. |

## How it works

When credentials are cached, the MCP client keeps an authenticated HTTP session for an internal lease with the Hypertask login server. Later tool calls reuse that session, and the server does not re-check sign-in for claims the lease covers.

With caching disabled, every tool call sends fresh login verification, so the token must stay valid per call.

Caching does not store long-lived secret values in persistent storage, unless your MCP client's own keep-alive configuration does so for its session lifecycle. The Hypertask backend enforces granular controls on token revocation windows and agent credential lifetimes, and you can reconcile those with your external secret management.

## Related

- https://docs.hypertask.ai/mcp/overview/ connects agents to Hypertask over the Model Context Protocol.
- https://docs.hypertask.ai/mcp/agents/ creates and manages agents and their tokens.
- https://docs.hypertask.ai/mcp/agent-sdk/ builds custom agents.
- https://docs.hypertask.ai/mcp/agent-webhooks/ explains what wakes an agent.
- https://docs.hypertask.ai/mcp/scheduling/ runs agents on a schedule.
