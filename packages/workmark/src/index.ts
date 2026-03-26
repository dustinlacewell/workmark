#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { loadCommands } from "./lib/load.js";
import { loadWorkspace } from "./lib/workspace.js";

async function main(): Promise<void> {
  const server = new Server(
    { name: "workmark", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const workspace = await loadWorkspace();
  const commands = await loadCommands(workspace);
  const handlers = new Map(commands.map((c) => [c.name, c.handler]));

  console.error(`Loaded ${commands.length} commands from ${workspace.projects.length} projects`);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: commands.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const handler = handlers.get(request.params.name);
    if (!handler) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`,
      );
    }
    return handler(request.params.arguments ?? {});
  });

  server.onerror = (error) => console.error("[MCP Error]", error);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("workmark MCP server running on stdio");

  const cleanup = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
