// Shared visible name for an inspector relationship link. When the target
// location has the same name as the entity being inspected, append the
// location kind so the link is not mistaken for a self-reference.

export function disambiguatedEntityLabel(
  target: {
    name?: unknown;
    entity_type?: unknown;
    kind?: unknown;
  },
  currentName: string | undefined,
): string {
  const name = String(target.name ?? "");
  if (
    currentName &&
    name === currentName &&
    target.entity_type === "location" &&
    typeof target.kind === "string" &&
    target.kind.length > 0
  ) {
    return `${name} (${target.kind.replaceAll("_", " ")})`;
  }
  return name;
}
