/**
 * CLI argument parsing, in three phases:
 *
 *   1. tokenize  — turn argv into a structured token stream (flags vs. positionals)
 *   2. dispatch  — bind tokens to parameter names using positional order and
 *                  schema-declared array flags (repeats accumulate)
 *   3. coerce    — convert raw strings to JSON Schema-declared types
 *
 * Each phase is independently testable and has one job. Coercion is driven by
 * the command's JSON Schema rather than heuristics, so `z.string()` fields
 * always stay strings and `z.array(...)` fields always come out as arrays.
 */

type Token =
  | { kind: "flag"; key: string; value?: string }
  | { kind: "positional"; value: string };

type SchemaProp = {
  type?: string;
  items?: { type?: string; enum?: unknown[] };
  enum?: unknown[];
};

type SchemaObject = {
  properties?: Record<string, SchemaProp>;
};

// --- 1. tokenize ---------------------------------------------------------

function tokenize(argv: string[]): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith("--")) {
      tokens.push({ kind: "positional", value: tok });
      continue;
    }

    const eq = tok.indexOf("=");
    if (eq >= 0) {
      tokens.push({ kind: "flag", key: tok.slice(2, eq), value: tok.slice(eq + 1) });
      continue;
    }

    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      tokens.push({ kind: "flag", key });
    } else {
      tokens.push({ kind: "flag", key, value: next });
      i++;
    }
  }
  return tokens;
}

// --- 2. dispatch ---------------------------------------------------------

function isArrayField(schema: SchemaObject, name: string): boolean {
  return schema.properties?.[name]?.type === "array";
}

function appendToArray(out: Record<string, unknown>, key: string, value: string): void {
  const prev = out[key];
  out[key] = Array.isArray(prev) ? [...prev, value] : [value];
}

function assignFlag(
  out: Record<string, unknown>,
  schema: SchemaObject,
  key: string,
  value: string | undefined,
): void {
  if (value === undefined) {
    out[key] = true;
    return;
  }
  if (isArrayField(schema, key)) {
    appendToArray(out, key, value);
    return;
  }
  out[key] = value;
}

function dispatch(
  tokens: Token[],
  positional: string[],
  schema: SchemaObject,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let posIdx = 0;

  for (const tok of tokens) {
    if (tok.kind === "flag") {
      assignFlag(out, schema, tok.key, tok.value);
    } else if (posIdx < positional.length) {
      out[positional[posIdx]] = tok.value;
      posIdx++;
    }
  }
  return out;
}

// --- 3. coerce -----------------------------------------------------------

function coerceScalar(raw: string, type?: string): unknown {
  switch (type) {
    case "number":
    case "integer": {
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    }
    case "boolean":
      if (raw === "true") return true;
      if (raw === "false") return false;
      return raw;
    default:
      return raw;
  }
}

function coerceField(value: unknown, prop: SchemaProp | undefined): unknown {
  if (prop === undefined) return value;
  if (typeof value === "boolean") return value;

  if (prop.type === "array") {
    const items = Array.isArray(value) ? value : [value];
    return items.map((item) => coerceScalar(String(item), prop.items?.type));
  }

  return coerceScalar(String(value), prop.type);
}

function coerce(
  raw: Record<string, unknown>,
  schema: SchemaObject,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const props = schema.properties ?? {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = coerceField(value, props[key]);
  }
  return out;
}

// --- orchestrator --------------------------------------------------------

export function parseArgs(
  argv: string[],
  positional: string[],
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const s = schema as SchemaObject;
  return coerce(dispatch(tokenize(argv), positional, s), s);
}
