#!/usr/bin/env node

import { loadCommands } from "./lib/load.js";
import { loadWorkspace } from "./lib/workspace.js";
import { parseArgs } from "./lib/parse.js";
import type { ResolvedCommand } from "./lib/types.js";

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp(commands: ResolvedCommand[]): void {
  console.log("Usage: wm <command> [args...]\n");

  // Group by group name
  const groups = new Map<string, ResolvedCommand[]>();
  for (const cmd of commands) {
    const list = groups.get(cmd.group) ?? [];
    list.push(cmd);
    groups.set(cmd.group, list);
  }

  const maxCmd = Math.max(...commands.map((c) => {
    const pos = c.positional.map((p) => `<${p}>`).join(" ");
    return (c.name + " " + pos).trim().length;
  }));

  // Print ungrouped commands first (top-level)
  const ungrouped = groups.get("");
  if (ungrouped) {
    for (const cmd of ungrouped) {
      const pos = cmd.positional.map((p) => `<${p}>`).join(" ");
      const left = (cmd.name + " " + pos).trim();
      console.log(`  ${left.padEnd(maxCmd + 4)} ${cmd.description}`);
    }
    console.log();
  }

  // Then grouped commands
  for (const [group, cmds] of groups) {
    if (group === "") continue;
    console.log(`  ${group}:`);
    for (const cmd of cmds) {
      const pos = cmd.positional.map((p) => `<${p}>`).join(" ");
      const left = (cmd.name + " " + pos).trim();
      console.log(`    ${left.padEnd(maxCmd + 4)} ${cmd.description}`);
    }
    console.log();
  }
}

function printCommandHelp(cmd: ResolvedCommand): void {
  const pos = cmd.positional.map((p) => `<${p}>`).join(" ");
  console.log(`Usage: wm ${cmd.name} ${pos}\n`);
  console.log(cmd.description);

  const schema = cmd.inputSchema as {
    properties?: Record<string, { type?: string; description?: string; enum?: string[]; default?: unknown }>;
    required?: string[];
  };
  const props = schema.properties;
  if (!props || Object.keys(props).length === 0) return;

  const positionalSet = new Set(cmd.positional);
  const required = new Set(schema.required ?? []);

  console.log("\nArguments:");
  for (const [name, prop] of Object.entries(props)) {
    const isPositional = positionalSet.has(name);
    const isReq = required.has(name);
    const flag = isPositional ? `  ${name}` : `  --${name}`;
    const parts: string[] = [];
    if (prop.enum) parts.push(`[${prop.enum.join("|")}]`);
    if (prop.type) parts.push(`(${prop.type})`);
    if (prop.default !== undefined) parts.push(`default: ${prop.default}`);
    if (isReq && !isPositional) parts.push("required");
    const desc = prop.description ?? "";
    console.log(`${flag.padEnd(20)} ${desc}${parts.length ? "  " + parts.join(", ") : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  const workspace = await loadWorkspace();
  const commands = await loadCommands(workspace);

  if (!command || command === "--help" || command === "-h") {
    printHelp(commands);
    return;
  }

  // Build lookup: command name → ResolvedCommand
  const cmdMap = new Map<string, ResolvedCommand>();
  for (const cmd of commands) {
    cmdMap.set(cmd.name, cmd);
  }

  const cmd = cmdMap.get(command);
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'wm --help' for available commands.`);
    process.exit(1);
  }

  // Per-command help
  if (rest[0] === "--help" || rest[0] === "-h") {
    printCommandHelp(cmd);
    return;
  }

  const args = parseArgs(rest, cmd.positional, cmd.inputSchema);
  const result = await cmd.handler(args);

  for (const content of result.content) {
    if (content.type === "text") {
      const stream = result.isError ? process.stderr : process.stdout;
      stream.write(content.text + "\n");
    }
  }

  if (result.isError) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
