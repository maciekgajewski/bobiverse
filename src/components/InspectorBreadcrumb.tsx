import type { SelectionIdentity } from "../domain/selection";
import {
  MAX_VISIBLE_CRUMBS,
  type InspectorCrumb,
} from "../narrative/breadcrumb";

export function InspectorBreadcrumb({
  trail,
  onSelect,
}: {
  trail: readonly InspectorCrumb[];
  onSelect: (selection: SelectionIdentity) => void;
}) {
  if (trail.length === 0) return null;
  const hidden = trail.slice(0, Math.max(0, trail.length - MAX_VISIBLE_CRUMBS));
  const shown = trail.slice(hidden.length);
  return (
    <nav className="inspector-breadcrumb" aria-label="Object trail">
      <ol>
        {hidden.length > 0 && (
          <li className="crumb-collapsed">
            <span title={hidden.map((crumb) => crumb.label).join(" › ")}>
              <span aria-hidden="true">…</span>
              <span className="visually-hidden">
                {hidden.map((crumb) => crumb.label).join(", ")}
              </span>
            </span>
          </li>
        )}
        {shown.map((crumb, index) => {
          const target = crumb.target;
          return (
            <li key={crumb.key}>
              {(index > 0 || hidden.length > 0) && (
                <span className="crumb-separator" aria-hidden="true">
                  ›
                </span>
              )}
              {target ? (
                <button
                  type="button"
                  className="link-button crumb-link"
                  onClick={() => onSelect(target)}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="crumb-current" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
