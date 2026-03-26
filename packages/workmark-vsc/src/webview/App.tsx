import { useState, useCallback, useRef, useEffect } from "react";
import type { CommandMeta } from "../shared/types";
import CommandTree from "./components/CommandTree";
import CommandForm from "./components/CommandForm";

interface AppProps {
  commands: CommandMeta[];
  collapseSignal: number;
}

const MIN_TREE_HEIGHT = 60;
const DEFAULT_TREE_HEIGHT = 300;

export default function App({ commands, collapseSignal }: AppProps) {
  const [selected, setSelected] = useState<CommandMeta | null>(null);
  const [treeHeight, setTreeHeight] = useState(DEFAULT_TREE_HEIGHT);
  const dragging = useRef(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Group commands by group name
  const groups = new Map<string, CommandMeta[]>();
  for (const cmd of commands) {
    const list = groups.get(cmd.group) ?? [];
    list.push(cmd);
    groups.set(cmd.group, list);
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !dashboardRef.current) return;
    const rect = dashboardRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const maxHeight = rect.height - MIN_TREE_HEIGHT;
    setTreeHeight(Math.max(MIN_TREE_HEIGHT, Math.min(y, maxHeight)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Prevent text selection while dragging
  useEffect(() => {
    const handler = (e: Event) => {
      if (dragging.current) e.preventDefault();
    };
    document.addEventListener("selectstart", handler);
    return () => document.removeEventListener("selectstart", handler);
  }, []);

  return (
    <div className="dashboard" ref={dashboardRef}>
      <div className="tree-pane" style={{ height: treeHeight }}>
        <CommandTree
          groups={groups}
          selected={selected}
          onSelect={setSelected}
          collapseSignal={collapseSignal}
        />
      </div>
      <div
        className="resize-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <div className="form-pane">
        {selected ? (
          <CommandForm command={selected} />
        ) : (
          <div className="placeholder">
            <p>Select a command to configure and run it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
