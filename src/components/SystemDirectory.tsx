import type { StellarSystem } from "../domain/types";

export function SystemDirectory({
  systems,
  selectedId,
  onSelect,
}: {
  systems: StellarSystem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="system-directory" aria-label="Nearby stellar systems">
      {systems.map((system) => (
        <button
          key={system.id}
          className={selectedId === system.id ? "selected" : ""}
          aria-pressed={selectedId === system.id}
          onClick={() => onSelect(system.id)}
        >
          {system.name}
        </button>
      ))}
    </nav>
  );
}
