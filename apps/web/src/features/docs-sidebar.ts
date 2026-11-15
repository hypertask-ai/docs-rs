export interface DocsSidebarLink {
  readonly label: string;
  readonly path: string;
}

export interface DocsSidebarGroup {
  readonly items: readonly DocsSidebarLink[];
  readonly label: string;
}

export interface DocsHeaderTab {
  readonly isActive: (path: string) => boolean;
  readonly label: string;
  readonly path: string;
}

const isWithin = (section: string, path: string) =>
  path === section || path.startsWith(`${section}/`);

export const docsHeaderTabs: readonly DocsHeaderTab[] = [
  {
    isActive: (path) => path === "/" || isWithin("/getting-started", path),
    label: "Getting started",
    path: "/getting-started/introduction",
  },
  {
    isActive: (path) => isWithin("/features", path),
    label: "Web App",
    path: "/features/boards",
  },
  {
    isActive: (path) =>
      isWithin("/mcp", path) ||
      isWithin("/api", path) ||
      isWithin("/connect-an-agent", path),
    label: "MCP for AI agents",
    path: "/mcp/overview",
  },
  {
    isActive: (path) => isWithin("/cli", path),
    label: "CLI reference",
    path: "/cli/reference",
  },
  {
    isActive: (path) => isWithin("/changelog", path),
    label: "Changelog",
    path: "/changelog",
  },
];

export const docsSidebarGroups: readonly DocsSidebarGroup[] = [
  {
    items: [
      { label: "Overview", path: "/" },
      {
        label: "What is Hypertask?",
        path: "/getting-started/introduction",
      },
      { label: "Quickstart", path: "/getting-started/quickstart" },
      {
        label: "Switching from Trello, Jira, or Asana",
        path: "/getting-started/switching",
      },
      { label: "Core concepts", path: "/getting-started/concepts" },
      {
        label: "Profile & Settings",
        path: "/getting-started/settings-profile",
      },
      {
        label: "Security and privacy",
        path: "/getting-started/security-and-privacy",
      },
      {
        label: "Troubleshooting Login",
        path: "/getting-started/troubleshooting-login",
      },
      { label: "Mobile and desktop apps", path: "/getting-started/apps" },
      { label: "Get help", path: "/getting-started/contact-support" },
    ],
    label: "Getting started",
  },
  {
    items: [
      { label: "AI features", path: "/features/ai-features" },
      { label: "What AI chat can do", path: "/features/ai-chat-capabilities" },
      { label: "Boards & sections", path: "/features/boards" },
      { label: "Search Screen", path: "/features/search-screen" },
      { label: "Tasks", path: "/features/tasks" },
      { label: "Scheduling", path: "/features/scheduling" },
      { label: "Inbox & notifications", path: "/features/inbox" },
      { label: "Collaboration", path: "/features/collaboration" },
      { label: "Calendar", path: "/features/calendar" },
      { label: "Table View", path: "/features/table-view" },
      { label: "Custom Fields", path: "/features/custom-fields" },
      { label: "Time Tracking", path: "/features/time-tracking" },
      { label: "Appearance & AI Models", path: "/features/appearance" },
      { label: "Keyboard Shortcuts", path: "/features/keyboard-shortcuts" },
      { label: "Pages", path: "/features/pages" },
      { label: "Skills", path: "/features/skills" },
      { label: "Favorites", path: "/features/favorites" },
      { label: "Bring Your Own Key (BYOK)", path: "/features/byok" },
      { label: "Board Settings", path: "/features/board-settings" },
      { label: "AI Chat Board Filter", path: "/features/chat-board-filter" },
      {
        label: "Superhuman-Style Snippets",
        path: "/features/superhuman-snippets",
      },
      { label: "Integrations", path: "/features/integrations" },
      { label: "Slack", path: "/features/slack" },
      { label: "AI Agents", path: "/features/agents" },
      { label: "Agent Chat", path: "/features/agent-chat" },
      { label: "Images and Attachments", path: "/features/images" },
    ],
    label: "Explore the platform",
  },
  {
    items: [
      { label: "CLI reference", path: "/cli/reference" },
      { label: "CLI Commands", path: "/cli/commands" },
      { label: "CLI Task Assignment", path: "/cli/tasks-assign" },
      { label: "MCP integration", path: "/mcp/overview" },
      { label: "MCP troubleshooting", path: "/mcp/troubleshooting" },
      { label: "Agent Workflows", path: "/mcp/workflows" },
      { label: "Scheduling Agents", path: "/mcp/scheduling" },
      { label: "Creating Agents", path: "/mcp/agents" },
      { label: "Agent webhooks", path: "/mcp/agent-webhooks" },
      { label: "REST API", path: "/api/rest-api" },
      { label: "MCP tools reference", path: "/api/tools-reference" },
      { label: "Connect a new agent", path: "/connect-an-agent" },
      { label: "Changelog", path: "/changelog" },
    ],
    label: "Reference",
  },
];

export const docsGroupForPath = (path: string): DocsSidebarGroup | undefined =>
  docsSidebarGroups.find((group) =>
    group.items.some((item) => item.path === path)
  );

export const docsPageMarkdownPath = (path: string) =>
  path === "/" ? "/llms-full.txt" : `${path}.md`;
