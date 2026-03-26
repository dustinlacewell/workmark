import { useState, useMemo, useEffect, useRef } from "react";
import type { CommandMeta } from "../../shared/types";
import vscode from "../vscode-api";

interface CommandTreeProps {
  groups: Map<string, CommandMeta[]>;
  selected: CommandMeta | null;
  onSelect: (cmd: CommandMeta) => void;
  collapseSignal: number;
}

export default function CommandTree({ groups, selected, onSelect, collapseSignal }: CommandTreeProps) {
  const groupNames = useMemo(() => Array.from(groups.keys()), [groups]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const prevSignal = useRef(collapseSignal);

  // Collapse all groups when signal changes
  useEffect(() => {
    if (collapseSignal !== prevSignal.current) {
      prevSignal.current = collapseSignal;
      setCollapsed(new Set(groupNames));
    }
  }, [collapseSignal, groupNames]);

  const toggle = (group: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const ungrouped = groups.get("") ?? [];
  const namedGroups = Array.from(groups.entries()).filter(([g]) => g !== "");

  return (
    <nav className="command-tree">
      {ungrouped.length > 0 && (
        <ul className="tree-items tree-items-top">
          {ungrouped.map((cmd) => (
            <li key={cmd.name}>
              <button
                className={`tree-item ${selected?.name === cmd.name ? "active" : ""}`}
                onClick={() => onSelect(cmd)}
                onDoubleClick={() => {
                  if (cmd.sourceFile) vscode.postMessage({ type: "openFile", path: cmd.sourceFile });
                }}
                title={cmd.description}
              >
                {cmd.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {namedGroups.map(([group, cmds]) => (
        <div key={group} className="tree-group">
          <button
            className="tree-group-header"
            onClick={() => toggle(group)}
            aria-expanded={!collapsed.has(group)}
          >
            <span className={`chevron ${collapsed.has(group) ? "" : "open"}`} />
            <span className="group-label">{group}</span>
            <span className="group-count">{cmds.length}</span>
          </button>
          {!collapsed.has(group) && (
            <ul className="tree-items">
              {cmds.map((cmd) => (
                <li key={cmd.name}>
                  <button
                    className={`tree-item ${selected?.name === cmd.name ? "active" : ""}`}
                    onClick={() => onSelect(cmd)}
                    onDoubleClick={() => {
                      if (cmd.sourceFile) vscode.postMessage({ type: "openFile", path: cmd.sourceFile });
                    }}
                    title={cmd.description}
                  >
                    {cmd.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
