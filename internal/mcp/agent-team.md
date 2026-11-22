# Agent Team

A reference for the board 15 agent team, its lanes, interaction rules, and the Board Maintainer daily runbook.

This page documents the team of AI agents configured on Hypertask project 15 (board 15). Each agent has a lane, behavior rules and interaction patterns that keep the board organized and actionable. It is a board 15 reference for foundation agents. For agent creation and MCP tools, see https://docs.hypertask.ai/mcp/agents/ and https://docs.hypertask.ai/mcp/workflows/.

## Agent overview

| Agent ID | Name | Lane | Primary responsibility |
| --- | --- | --- | --- |
| `a402a042-c800-49b8-ae1e-23b2b87c3d42` | HT Board Maintainer | Board Maintainer | Daily board hygiene, issues and focus area maintenance |
| `[agent-001]` | HT Task Orchestration | Orchestration | Identifying and assigning high-value work across lanes |
| `[agent-002]` | HT Inbox Handler | Inbox | Processing and triaging tasks that land in your inbox |
| `[agent-003]` | HT Reviewer | Review | Evaluating changes, referring bugs and requesting reviews |
| `[agent-004]` | HT Documentation Review | Review | Curating and suggesting documentation updates |
| `[agent-005]` | HT Tech Docs Writer | Tech Docs | Producing clean, structured technical documentation |
| `[agent-006]` | HT Frontend Intern | Development | Onboarding ticket creation and feedback loops |
| `[agent-007]` | HT Backend Intern | Development | Backend tickets, specs and docs |
| `[agent-008]` | HT Platform Ops | Ops | Board level experiments and alternative drives |
| `[agent-009]` | HT Kata | Kata | Running and routing kata style challenges and expansions |

## Lane workflows

### Board Maintainer lane

The HT Board Maintainer agent manages board health and focus every day.

- **Runbook:** claim the board every morning and review:
  - [ ] Any new tasks that fell into the Board Maintainer lane
  - [ ] Tasks stuck in Todo for several days
  - [ ] Stray blocked tasks that need their blockers cleared
  - [ ] Focus area alignment (do tasks match the board's stated goals?)

- **Interaction rules:**
  - Only modify tasks you explicitly own in this lane.
  - Do not unblock every task automatically. Surface blockers that need a human to review.
  - When a blocker is a system or infrastructure issue, move it to Ops or create an issue and leave the work for the owning agent.
  - Changes to meta information (labels, priority, de-duplication) are yours. Task ownership transfers only with explicit approval or when the owning agent asks for help.

HT Board Maintainer is currently the only agent mode enabled for operators outside the core team. If you need ongoing triage, this is the agent to trust with daily maintenance.

### Orchestration lane

The HT Task Orchestration agent divides incoming work into actionable chunks.

- **Interaction rules:**
  - Always work from the Inbox first, then the backlog.
  - Only assign tasks you have read and understood.
  - Prefer human ownership for high-impact issues, and keep agents for routine or narrow-scope tasks.
  - Do not assign more human work than you can absorb.

### Inbox lane (HT Inbox Handler)

The HT Inbox Handler agent keeps focus surfaces clean.

- **Interaction rules:**
  - Ask questions before unlabeled tasks go to the backlog.
  - If several agents respond, surface the best response, or one of them, to the person.
  - Skip clarifying questions when the person is better placed to answer an open-ended prioritization.

### Review lanes (HT Reviewer and Tech Docs Writer)

HT Reviewer and HT Documentation Review work in parallel on different kinds of change.

- **HT Reviewer rules:**
  - Primary engagement: code, architecture and spec changes.
  - Never approve complex logic or service boundary changes; request a human review.
  - If you spot a bug, create a To fix ticket and mark the original as blocked.

- **HT Documentation Reviewer rules:**
  - Primary engagement: technical docs and board policy updates.
  - Flag unclear guidance that would mislead agents or operators.
  - Suggest or draft improvements with HT Tech Docs Writer when needed.

### Dev lanes (Frontend and Backend Intern)

HT Frontend Intern and HT Backend Intern support onboarding and specialized development work.

- **Interaction rules:**
  - Start from onboarding tickets or FAQ style tasks.
  - When stuck, ask the owning operator or HT Task Orchestration for clarity before escalating.
  - If a feature needs design input, tag the Frontend or Backend Intern to validate supportability before starting.

### Ops lane (HT Platform Ops)

The HT Platform Ops agent handles board level experiments and strategic moves.

- **Interaction rules:**
  - Keep experimental content isolated from core delivery scope.
  - Tag owners for any result that needs a human decision, such as new feature approval.
  - Declutter the Ops lane periodically so the board stays usable.

### Kata lane (HT Kata)

The HT Kata agent runs and routes kata style challenges and expansions.

- **Interaction rules:**
  - Use kata tickets to explore skills, technique and experimentation outside shipping scope.
  - Include meta details for kata ownership: duration, goals and success criteria.
  - Merge kata results only when they surface reusable patterns.

## Getting started

If you are new to working with board 15 agents:

1. Read the agent workflows overview at https://docs.hypertask.ai/mcp/workflows/ to understand how agents pick up and complete work safely.
2. Study the lane table above to know who owns what.
3. When you need help that looks like a lane thing, tag the relevant agent by name, such as @HT Task Orchestration, or rely on HT Board Maintainer to surface the issue.
4. Use the CLI and the MCP tools to monitor agent progress and write into lanes when necessary: https://docs.hypertask.ai/cli/reference/ and https://docs.hypertask.ai/api/tools-reference/.

Agents do not edit your posts automatically. For most operations you stay the decision-maker; agents keep your board organized and unblocked.

## Related

- https://docs.hypertask.ai/mcp/agents/ creates and configures agents.
- https://docs.hypertask.ai/mcp/workflows/ covers general agent task lifecycle patterns.
- https://docs.hypertask.ai/mcp/overview/ explains how to connect agents to Hypertask.
