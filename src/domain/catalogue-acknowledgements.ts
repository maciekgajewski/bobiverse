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

const TRAILING_ACKNOWLEDGEMENT_PUNCTUATION = /[\s.,;:]+$/;

/** Strip only ending sentence punctuation so a longer variant can be compared. */
export function acknowledgementCore(text: string): string {
  return text.replace(TRAILING_ACKNOWLEDGEMENT_PUNCTUATION, "").trim();
}

/**
 * If `prefix` is a punctuation-tolerant prefix of `text`, return the leftover
 * credit (an empty string when they are equivalent). Otherwise return null.
 */
export function acknowledgementExtension(
  prefix: string,
  text: string,
): string | null {
  const core = acknowledgementCore(prefix);
  if (!core) return null;
  const source = text.startsWith(core) ? text : acknowledgementCore(text);
  if (!source.startsWith(core)) return null;
  const rest = source
    .slice(core.length)
    .replace(/^[\s,;.:]+/, "")
    .replace(/^and\s+/i, "")
    .trim();
  if (!rest) return "";
  return rest[0].toUpperCase() + rest.slice(1);
}

function uniqueAcknowledgements(texts: readonly string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of texts) {
    const text = raw.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);

    const prefixIndex = unique.findIndex(
      (item) => acknowledgementExtension(item, text) !== null,
    );
    if (prefixIndex >= 0) {
      const rest = acknowledgementExtension(unique[prefixIndex]!, text)!;
      if (
        rest &&
        !unique.some(
          (item) =>
            item === rest || acknowledgementExtension(item, rest) === "",
        )
      ) {
        unique.push(rest);
        seen.add(rest);
      }
      continue;
    }
    if (unique.some((item) => acknowledgementExtension(text, item) !== null)) {
      continue;
    }
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
