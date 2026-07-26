import type { SelectionIdentity } from "../domain/selection";
import type {
  BrowserGroupId,
  BrowserGroupState,
  BrowserMode,
  NarrativeBrowserGroup,
} from "../narrative/browser";
import {
  CollapseIcon,
  ObjectGroupIcon,
  ObjectItemBullet,
} from "./ObjectBrowserIcons";

function recencyLabel(
  group: NarrativeBrowserGroup,
  index: number,
  mode: BrowserMode,
): string | null {
  const item = group.items[index]!;
  if (item.active) return "Active";
  if (!item.lastActivity) return null;
  return mode === "chapter"
    ? `Last active · Chapter ${item.lastActivity.source_chapter}`
    : item.lastActivity.effective_date
      ? `Last active · ${item.lastActivity.effective_date.split(".", 1)[0]}`
      : null;
}

export function ObjectBrowser({
  groups,
  mode,
  query,
  idPrefix,
  expanded,
  selection,
  onQuery,
  onToggle,
  onSelect,
}: {
  groups: NarrativeBrowserGroup[];
  mode: BrowserMode;
  query: string;
  idPrefix: string;
  expanded: BrowserGroupState;
  selection: SelectionIdentity | null;
  onQuery: (query: string) => void;
  onToggle: (group: BrowserGroupId) => void;
  onSelect: (selection: SelectionIdentity) => void;
}) {
  const resultCount = groups.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  const searching = query.trim().length > 0;
  return (
    <div className="object-browser">
      <label className="browser-search">
        <span>Search visible objects</span>
        <input
          type="search"
          value={query}
          placeholder="Name or known alias"
          onChange={(event) => onQuery(event.currentTarget.value)}
        />
      </label>
      <p className="search-status" aria-live="polite">
        {searching
          ? `${resultCount} narrative ${resultCount === 1 ? "match" : "matches"}`
          : "Showing reader-visible projected objects"}
      </p>
      {searching && groups.length === 0 && (
        <p className="empty-browser-result">
          No eligible narrative object matches this name.
        </p>
      )}
      <div className="browser-groups">
        {groups.map((group) => {
          const isExpanded = searching || expanded[group.id];
          const contentId = `${idPrefix}-browser-group-${group.id}`;
          return (
            <section className="browser-group" key={group.id}>
              <h3>
                <button
                  type="button"
                  aria-label={`${group.label}, ${group.eligibleCount} visible${
                    group.activeCount > 0 ? `, ${group.activeCount} active` : ""
                  }`}
                  aria-expanded={isExpanded}
                  aria-controls={contentId}
                  aria-disabled={searching}
                  onClick={() => {
                    if (!searching) onToggle(group.id);
                  }}
                >
                  <CollapseIcon expanded={isExpanded} />
                  <span className="group-label">
                    <ObjectGroupIcon type={group.id} />
                    <span>{group.label}</span>
                  </span>
                  <span className="group-count">
                    {group.eligibleCount} visible
                    {group.activeCount > 0
                      ? ` · ${group.activeCount} active`
                      : ""}
                  </span>
                </button>
              </h3>
              {isExpanded && (
                <ul id={contentId}>
                  {group.items.map((item, index) => {
                    const selected =
                      selection?.kind === "narrative" &&
                      selection.id === item.entity.id;
                    const recency = recencyLabel(group, index, mode);
                    return (
                      <li key={item.entity.id}>
                        <button
                          type="button"
                          className={selected ? "selected" : ""}
                          aria-pressed={selected}
                          onClick={() =>
                            onSelect({
                              kind: "narrative",
                              id: item.entity.id,
                            })
                          }
                        >
                          <ObjectItemBullet active={item.active} />
                          <span className="object-item-copy">
                            <span>{item.name}</span>
                            {recency && (
                              <small className={item.active ? "active" : ""}>
                                {recency}
                              </small>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
