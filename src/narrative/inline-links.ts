/**
 * Inline entity links in narrative prose (ADR-0029, BOB-20261115-4CNJ7E).
 *
 * A link is `[[kind:slug]]` or `[[kind:slug|label]]`. Outside links, `\[[`,
 * `\]]` and `\\` write a literal `[[`, `]]` and `\`. This module is the one
 * parser shared by the validator, the inspector renderer and the
 * sentence-preservation normaliser. It has no dependencies, so the browser,
 * Node tooling and tests all load the same code.
 */

/** Entity kinds a link may target: exactly the `mention_target_id` union. */
export const inlineLinkKinds = [
  "character",
  "event",
  "location",
  "organization",
  "species",
  "technology",
  "vessel",
] as const;

/** Source fields that may contain links (ADR-0029 §2), besides chapter `summary`. */
export const inlineLinkEntityFields = [
  "description",
  "state",
  "current_state",
] as const;

export interface InlineTextSegment {
  kind: "text";
  /** Display text, with escapes already removed. */
  text: string;
}

export interface InlineLinkSegment {
  kind: "link";
  /** The target entity ID, verbatim. */
  target: string;
  /** The explicit label, or null for `[[id]]` (the target's name is shown). */
  label: string | null;
  /** Zero-based character offset of the opening `[[` in the source text. */
  offset: number;
  /** Zero-based position of this link among the text's links. */
  index: number;
}

export type InlineSegment = InlineTextSegment | InlineLinkSegment;

export interface InlineLinkSyntaxError {
  /** Zero-based character offset in the source text. */
  offset: number;
  message: string;
}

export type InlineLinkParseResult =
  | { ok: true; segments: InlineSegment[] }
  | { ok: false; error: InlineLinkSyntaxError };

const entityIdPattern = /^[a-z][a-z0-9_]*:[a-z0-9][a-z0-9-]*$/;
const linkTargetPattern = new RegExp(
  `^(?:${inlineLinkKinds.join("|")}):[a-z0-9][a-z0-9-]*$`,
);
const lineBreak = /[\r\n\u2028\u2029]/;

function targetError(target: string): string | null {
  if (target.length === 0) return "link target is empty";
  if (/\s/.test(target))
    return `link target must not contain whitespace: "${target}"`;
  if (!entityIdPattern.test(target))
    return `link target is not a valid entity ID: "${target}"`;
  if (!linkTargetPattern.test(target))
    return `link target kind cannot be linked (allowed: ${inlineLinkKinds.join(", ")}): ${target}`;
  return null;
}

function labelError(label: string): string | null {
  if (label.trim().length === 0) return "link label is empty";
  if (label !== label.trim())
    return "link label must not start or end with whitespace";
  if (/[[\]|\\]/.test(label))
    return 'link label must not contain "[", "]", "|" or "\\"';
  return null;
}

/** Parses prose into text and link segments, or reports the first syntax error. */
export function parseInlineLinks(text: string): InlineLinkParseResult {
  const segments: InlineSegment[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) segments.push({ kind: "text", text: buffer });
    buffer = "";
  };
  const fail = (offset: number, message: string): InlineLinkParseResult => ({
    ok: false,
    error: { offset, message },
  });
  let index = 0;
  while (index < text.length) {
    if (text[index] === "\\") {
      if (text.startsWith("\\[[", index)) {
        buffer += "[[";
        index += 3;
      } else if (text.startsWith("\\]]", index)) {
        buffer += "]]";
        index += 3;
      } else if (text.startsWith("\\\\", index)) {
        buffer += "\\";
        index += 2;
      } else {
        return fail(
          index,
          'a backslash must be followed by "[[", "]]" or "\\" (write a literal backslash as "\\\\")',
        );
      }
      continue;
    }
    if (text.startsWith("]]", index))
      return fail(index, 'stray "]]" outside a link (escape it as "\\]]")');
    if (!text.startsWith("[[", index)) {
      buffer += text[index];
      index += 1;
      continue;
    }
    const start = index;
    const close = text.indexOf("]]", start + 2);
    const nested = text.indexOf("[[", start + 2);
    if (nested !== -1 && (close === -1 || nested < close))
      return fail(nested, 'a link cannot contain "[[" (links do not nest)');
    if (close === -1)
      return fail(start, 'unclosed link: "[[" has no matching "]]"');
    const body = text.slice(start + 2, close);
    const breakAt = body.search(lineBreak);
    if (breakAt !== -1)
      return fail(start + 2 + breakAt, "a link cannot contain a line break");
    const parts = body.split("|");
    if (parts.length > 2)
      return fail(
        start + 2 + parts[0]!.length + 1 + parts[1]!.length,
        'a link has more than one "|"',
      );
    const target = parts[0]!;
    const targetProblem = targetError(target);
    if (targetProblem) return fail(start + 2, targetProblem);
    let label: string | null = null;
    if (parts.length === 2) {
      label = parts[1]!;
      const labelProblem = labelError(label);
      if (labelProblem) return fail(start + 3 + target.length, labelProblem);
    }
    flush();
    segments.push({
      kind: "link",
      target,
      label,
      offset: start,
      index: segments.filter((segment) => segment.kind === "link").length,
    });
    index = close + 2;
  }
  flush();
  return { ok: true, segments };
}

/** True when the text uses any link markup or escape (`[[`, `]]` or `\\`). */
export function containsInlineLinkMarkup(text: string): boolean {
  return text.includes("[[") || text.includes("]]") || text.includes("\\\\");
}

/** The link segments of already-parsed prose. */
export function inlineLinks(
  segments: readonly InlineSegment[],
): InlineLinkSegment[] {
  return segments.filter(
    (segment): segment is InlineLinkSegment => segment.kind === "link",
  );
}

/**
 * Display plain text for prose: `[[id|label]]` becomes `label`, `[[id]]` becomes
 * `defaultLabel(id, linkIndex)`, and escapes are removed. Text that does not
 * parse is returned unchanged, so callers never lose content; the validator
 * rejects such text before it reaches readers.
 */
export function inlineLinksToPlainText(
  text: string,
  defaultLabel: (target: string, linkIndex: number) => string,
): string {
  const parsed = parseInlineLinks(text);
  if (!parsed.ok) return text;
  return parsed.segments
    .map((segment) =>
      segment.kind === "text"
        ? segment.text
        : (segment.label ?? defaultLabel(segment.target, segment.index)),
    )
    .join("");
}
