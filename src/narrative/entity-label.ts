// Shared visible name for an inspector relationship link. When the target
// location has the same name as the entity being inspected, append the
// location kind so the link is not mistaken for a self-reference. Adjacent
// breadcrumb crumbs use the same form when they share a name.

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

/** Qualify any crumb whose name matches an adjacent crumb, including the
 *  current (last) crumb. Unique names and a single-crumb trail stay bare. */
export function disambiguatedAdjacentLabels(
  items: readonly {
    name?: unknown;
    entity_type?: unknown;
    kind?: unknown;
  }[],
): string[] {
  return items.map((item, index) => {
    const name = String(item.name ?? "");
    const previous = items[index - 1];
    const next = items[index + 1];
    const adjacentSame =
      (previous !== undefined && String(previous.name ?? "") === name) ||
      (next !== undefined && String(next.name ?? "") === name);
    return adjacentSame ? disambiguatedEntityLabel(item, name) : name;
  });
}
