import { useState, useEffect } from "react";
import type { CommandMeta } from "../../shared/types";
import ParamField from "./ParamField";
import vscode from "../vscode-api";

interface CommandFormProps {
  command: CommandMeta;
}

export default function CommandForm({ command }: CommandFormProps) {
  const [args, setArgs] = useState<Record<string, unknown>>({});

  // Reset args when command changes, pre-fill defaults
  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    const props = command.inputSchema.properties ?? {};
    const req = new Set(command.inputSchema.required ?? []);
    for (const [key, prop] of Object.entries(props)) {
      if (prop.default !== undefined) {
        defaults[key] = prop.default;
      } else if (prop.enum && prop.enum.length > 0 && req.has(key)) {
        defaults[key] = prop.enum[0];
      }
    }
    setArgs(defaults);
  }, [command.name]);

  const properties = command.inputSchema.properties ?? {};
  const required = new Set(command.inputSchema.required ?? []);
  const hasParams = Object.keys(properties).length > 0;

  const handleRun = () => {
    // Strip undefined/empty values
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== "") cleaned[k] = v;
    }
    vscode.postMessage({ type: "run", name: command.name, args: cleaned });
  };

  return (
    <div className="command-form">
      <div className="form-header">
        <h2>{command.label}</h2>
        <span className="form-group-badge">{command.group}</span>
      </div>
      <p className="form-description">{command.description}</p>

      {hasParams && (
        <div className="form-fields">
          {Object.entries(properties).map(([name, schema]) => (
            <ParamField
              key={name}
              name={name}
              schema={schema}
              required={required.has(name)}
              value={args[name]}
              onChange={(val) => setArgs((prev) => ({ ...prev, [name]: val }))}
            />
          ))}
        </div>
      )}

      <button
        className="run-button"
        onClick={handleRun}
        title={`wm ${command.name}`}
      >
        <span className="run-icon">&#9654;</span>
        Run (wm {command.name})
      </button>
    </div>
  );
}
