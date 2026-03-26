import type { JsonSchemaProperty } from "../../shared/types";

interface ParamFieldProps {
  name: string;
  schema: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
}

export default function ParamField({ name, schema, required, value, onChange }: ParamFieldProps) {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const label = schema.description ?? name;

  // Enum → dropdown
  if (schema.enum) {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <select
          id={name}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          {!required && <option value="">— none —</option>}
          {schema.enum.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Boolean → checkbox
  if (type === "boolean") {
    return (
      <div className="field field-checkbox">
        <label>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {label}
        </label>
      </div>
    );
  }

  // Number / integer → number input
  if (type === "number" || type === "integer") {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          type="number"
          value={value !== undefined ? String(value) : ""}
          min={schema.minimum}
          max={schema.maximum}
          step={type === "integer" ? 1 : undefined}
          placeholder={schema.default !== undefined ? `default: ${schema.default}` : undefined}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : Number(v));
          }}
        />
      </div>
    );
  }

  // Default → text input
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        type="text"
        value={String(value ?? "")}
        placeholder={schema.default !== undefined ? `default: ${schema.default}` : undefined}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}
