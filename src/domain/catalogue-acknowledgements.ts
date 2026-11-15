import rawNearbySystems from "../data/nearby-systems.json";

/**
 * Distinct catalogue acknowledgements, in first-seen order. Walks the
 * nearby-systems JSON so the About Credits list cannot drift from the data.
 */
export function catalogueAcknowledgements(
  sources?: Record<string, { acknowledgement: string }> | null,
): string[] {
  if (arguments.length > 0) {
    if (!sources) return [];
    return uniqueAcknowledgements(
      Object.values(sources).map((source) => source.acknowledgement),
    );
  }
  return uniqueAcknowledgements(acknowledgementsInData(rawNearbySystems));
}

function uniqueAcknowledgements(texts: readonly string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of texts) {
    const text = raw.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    unique.push(text);
  }
  return unique;
}

/** Walk any JSON value and collect every string filed as `acknowledgement`. */
export function acknowledgementsInData(value: unknown): string[] {
  const found: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      if (key === "acknowledgement" && typeof child === "string") {
        found.push(child);
      } else {
        visit(child);
      }
    }
  };
  visit(value);
  return found;
}
