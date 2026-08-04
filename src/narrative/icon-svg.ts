const allowedTags = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
]);

/** Returns a concise validation failure, or null for a safe monochrome icon mask. */
export function iconSvgViolation(source: string): string | null {
  if (!/^\s*<svg\b[\s\S]*<\/svg>\s*$/i.test(source))
    return "must contain one complete SVG root element";
  if (/<!DOCTYPE\b|<!ENTITY\b/i.test(source))
    return "must not contain a document type or entity declaration";
  for (const match of source.matchAll(/<\/?([A-Za-z][\w:-]*)\b/g)) {
    if (!allowedTags.has(match[1]!.toLocaleLowerCase("en")))
      return `contains forbidden element <${match[1]}>`;
  }
  const forbiddenAttribute = /\b(?:href|style|on[a-z]+)\s*=|\burl\s*\(/i.exec(
    source,
  );
  if (forbiddenAttribute)
    return `contains forbidden active, external, or inline-style content: ${forbiddenAttribute[0]}`;
  if (!/\bviewBox\s*=\s*(["'])0 0 48 48\1/.test(source))
    return "must use the shared viewBox 0 0 48 48";
  if (/#[0-9a-f]{3,8}\b/i.test(source))
    return "must not embed presentation colours";

  const paintOccurrences = [...source.matchAll(/\b(?:fill|stroke)\s*=/gi)];
  const paintAttributes = [
    ...source.matchAll(/\b(?:fill|stroke)\s*=\s*(["'])(.*?)\1/gi),
  ];
  if (paintAttributes.length !== paintOccurrences.length)
    return "must use quoted monochrome paint attributes";
  for (const match of paintAttributes) {
    const value = match[2]!.toLocaleLowerCase("en");
    if (value !== "black" && value !== "none")
      return "paint must be monochrome black or none";
  }
  return null;
}
