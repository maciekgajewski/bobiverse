export interface JsonSourceLocation {
  line: number;
  column: number;
}

export interface ParsedJsonDocument {
  value: Record<string, unknown>;
  locations: ReadonlyMap<string, JsonSourceLocation>;
}

export class JsonSourceParseError extends Error {
  constructor(
    message: string,
    readonly location: JsonSourceLocation,
  ) {
    super(message);
    this.name = "JsonSourceParseError";
  }
}

function escapePointerToken(token: string): string {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

function sourceLocation(source: string, offset: number): JsonSourceLocation {
  const prefix = source.slice(0, offset);
  const line = prefix.split("\n").length;
  const lastNewline = prefix.lastIndexOf("\n");
  return { line, column: offset - lastNewline };
}

function parseErrorLocation(
  source: string,
  error: unknown,
): JsonSourceLocation {
  const message = error instanceof Error ? error.message : "Invalid JSON.";
  const match = /position (\d+)/.exec(message);
  return sourceLocation(source, match ? Number(match[1]) : 0);
}

/**
 * Parses a JSON document and records the start position of every value by JSON
 * Pointer. The map is deliberately browser-safe: the CLI supplies file paths.
 */
export function parseJsonDocument(source: string): ParsedJsonDocument {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new JsonSourceParseError(
      error instanceof Error ? error.message : "Invalid JSON.",
      parseErrorLocation(source, error),
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new JsonSourceParseError("JSON document root must be an object.", {
      line: 1,
      column: 1,
    });
  }

  const locations = new Map<string, JsonSourceLocation>();
  let offset = 0;

  const whitespace = () => {
    while (/\s/.test(source[offset] ?? "")) offset += 1;
  };
  const stringEnd = (start: number): number => {
    let cursor = start + 1;
    while (cursor < source.length) {
      if (source[cursor] === "\\") {
        cursor += 2;
      } else if (source[cursor] === '"') {
        return cursor + 1;
      } else {
        cursor += 1;
      }
    }
    return cursor;
  };
  const parseValue = (pointer: string): void => {
    whitespace();
    locations.set(pointer, sourceLocation(source, offset));
    if (source[offset] === "{") {
      offset += 1;
      whitespace();
      if (source[offset] === "}") {
        offset += 1;
        return;
      }
      while (offset < source.length) {
        const keyStart = offset;
        const keyEnd = stringEnd(keyStart);
        const key = JSON.parse(source.slice(keyStart, keyEnd)) as string;
        offset = keyEnd;
        whitespace();
        offset += 1; // colon
        parseValue(`${pointer}/${escapePointerToken(key)}`);
        whitespace();
        if (source[offset] === "}") {
          offset += 1;
          return;
        }
        offset += 1; // comma
        whitespace();
      }
      return;
    }
    if (source[offset] === "[") {
      offset += 1;
      whitespace();
      let index = 0;
      if (source[offset] === "]") {
        offset += 1;
        return;
      }
      while (offset < source.length) {
        parseValue(`${pointer}/${index}`);
        index += 1;
        whitespace();
        if (source[offset] === "]") {
          offset += 1;
          return;
        }
        offset += 1; // comma
        whitespace();
      }
      return;
    }
    if (source[offset] === '"') {
      offset = stringEnd(offset);
      return;
    }
    while (offset < source.length && !/[\s,}\]]/.test(source[offset]!))
      offset += 1;
  };

  parseValue("");
  return { value: value as Record<string, unknown>, locations };
}

/** Returns a value location, or the closest containing JSON value location. */
export function locationForPointer(
  locations: ReadonlyMap<string, JsonSourceLocation>,
  pointer: string,
): JsonSourceLocation {
  let candidate = pointer;
  while (true) {
    const location = locations.get(candidate);
    if (location) return location;
    if (!candidate) return { line: 1, column: 1 };
    candidate = candidate.slice(0, candidate.lastIndexOf("/"));
  }
}
