import type { ReactNode } from "react";
import type { SelectionIdentity } from "../domain/selection";
import type { StellarSystem } from "../domain/types";
import type { NarrativeBrowserItem } from "../narrative/browser";
import type {
  NarrativeChapterDetail,
  NarrativeChapterRelationship,
  NarrativeEntity,
  NarrativeRecord,
  NarrativeWorld,
} from "../narrative/model";
import { SystemDetails } from "./SystemDetails";
import { ObjectItemBullet } from "./ObjectBrowserIcons";

const typeLabels: Record<NarrativeEntity["entity_type"], string> = {
  character: "Character",
  event: "Event",
  location: "Location",
  organization: "Organization",
  species: "Species",
  technology: "Technology",
  vessel: "Vessel",
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function displayDate(value: string): string {
  return value.split(".", 1)[0]!;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function EntityLink({
  id,
  entities,
  onSelect,
}: {
  id: string;
  entities: ReadonlyMap<string, NarrativeEntity>;
  onSelect: (selection: SelectionIdentity) => void;
}) {
  const target = entities.get(id);
  if (!target) return null;
  return (
    <button
      type="button"
      className="link-button"
      onClick={() => onSelect({ kind: "narrative", id })}
    >
      {String(target.name)}
    </button>
  );
}

function mappedAstronomyId(
  entity: NarrativeEntity,
  entities: ReadonlyMap<string, NarrativeEntity>,
): string | null {
  const visited = new Set<string>();
  let current: NarrativeEntity | undefined = entity;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const astronomyId = stringValue(current.astronomy_object_id);
    if (current.kind === "star_system" && astronomyId) return astronomyId;
    const parentId = stringValue(current.parent_location_id);
    current = parentId ? entities.get(parentId) : undefined;
  }
  return null;
}

function Picture({
  pictureId,
  assets,
  alt,
}: {
  pictureId: string | null;
  assets: NarrativeRecord;
  alt: string;
}) {
  if (!pictureId || !Array.isArray(assets.assets)) return null;
  const asset = assets.assets.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as NarrativeRecord).id === pictureId,
  ) as NarrativeRecord | undefined;
  const path = asset ? stringValue(asset.path) : null;
  if (!path) return null;
  return <img className="inspector-picture" src={`/${path}`} alt={alt} />;
}

function NarrativeDetails({
  item,
  world,
  systems,
  assets,
  headingId,
  onSelect,
}: {
  item: NarrativeBrowserItem;
  world: NarrativeWorld;
  systems: StellarSystem[];
  assets: NarrativeRecord;
  headingId: string;
  onSelect: (selection: SelectionIdentity) => void;
}) {
  const { entity } = item;
  const name = String(entity.name);
  const entities = new Map(
    world.entities.map((candidate) => [candidate.id, candidate]),
  );
  const aliases = stringList(entity.aliases);
  const mappedId =
    entity.entity_type === "location"
      ? mappedAstronomyId(entity, entities)
      : null;
  const astronomySystem =
    systems.find((system) => system.id === mappedId) ?? null;
  const status = [
    "Narrative-known",
    item.active ? "Active" : null,
    entity.map_status === "unmapped" ? "Unmapped" : null,
  ].filter(Boolean);
  const recency = item.lastActivity
    ? `${item.active ? "Active" : "Last active"} in Chapter ${
        item.lastActivity.source_chapter
      }${
        item.lastActivity.effective_date
          ? ` · ${displayDate(item.lastActivity.effective_date)}`
          : " · chronologically unplaced"
      }`
    : null;
  const relationship = (id: unknown) =>
    typeof id === "string" ? (
      <EntityLink id={id} entities={entities} onSelect={onSelect} />
    ) : null;
  return (
    <section
      className="details narrative-details"
      aria-live="polite"
      aria-labelledby={headingId}
    >
      <p className="eyebrow">{typeLabels[entity.entity_type]}</p>
      <h2 id={headingId}>{name}</h2>
      {aliases.length > 0 && <p className="aliases">{aliases.join(" · ")}</p>}
      <p className="object-status">{status.join(" · ")}</p>
      {recency && <p className="recency-context">{recency}</p>}
      <Picture
        pictureId={stringValue(entity.picture_id)}
        assets={assets}
        alt={name}
      />
      <dl>
        {entity.entity_type === "character" && (
          <>
            {relationship(entity.species_id) && (
              <Detail label="Species">{relationship(entity.species_id)}</Detail>
            )}
            {stringValue(entity.gender) && (
              <Detail label="Gender">{String(entity.gender)}</Detail>
            )}
            {stringValue(entity.current_state) && (
              <Detail label="Current state">
                {String(entity.current_state)}
              </Detail>
            )}
            {stringValue(entity.birth_date) && (
              <Detail label="Birth date">
                {displayDate(String(entity.birth_date))}
              </Detail>
            )}
            {stringValue(entity.death_date) && (
              <Detail label="Death date">
                {displayDate(String(entity.death_date))}
              </Detail>
            )}
            {relationship(entity.death_event_id) && (
              <Detail label="Death event">
                {relationship(entity.death_event_id)}
              </Detail>
            )}
            {entity.last_known_location &&
              relationship(entity.last_known_location.location_id) && (
                <Detail label="Last seen">
                  {relationship(entity.last_known_location.location_id)}
                  <span className="relationship-context">
                    Chapter {entity.last_known_location.source_chapter} ·{" "}
                    {displayDate(entity.last_known_location.effective_date)}
                  </span>
                </Detail>
              )}
          </>
        )}
        {entity.entity_type === "event" && (
          <>
            <Detail label="Story date">
              {stringValue(entity.date)
                ? displayDate(String(entity.date))
                : "Chronologically unplaced"}
            </Detail>
            {relationship(entity.location_id) && (
              <Detail label="Location">
                {relationship(entity.location_id)}
              </Detail>
            )}
            {stringList(entity.participant_ids).length > 0 && (
              <Detail label="Participants">
                <span className="relationship-list">
                  {stringList(entity.participant_ids).map((id) => (
                    <EntityLink
                      key={id}
                      id={id}
                      entities={entities}
                      onSelect={onSelect}
                    />
                  ))}
                </span>
              </Detail>
            )}
          </>
        )}
        {entity.entity_type === "location" && (
          <>
            <Detail label="Map context">
              {entity.map_status === "unmapped"
                ? "Explicitly unmapped"
                : mappedId
                  ? "Mapped"
                  : "No mapped stellar-system context"}
            </Detail>
            {stringValue(entity.kind) && (
              <Detail label="Location kind">
                {String(entity.kind).replaceAll("_", " ")}
              </Detail>
            )}
            {relationship(entity.parent_location_id) && (
              <Detail label="Parent">
                {relationship(entity.parent_location_id)}
              </Detail>
            )}
            {relationship(entity.origin_location_id) && (
              <Detail label="Origin">
                {relationship(entity.origin_location_id)}
              </Detail>
            )}
            {relationship(entity.destination_location_id) && (
              <Detail label="Destination">
                {relationship(entity.destination_location_id)}
              </Detail>
            )}
            {stringList(entity.child_ids).length > 0 && (
              <Detail label="Contains">
                <span className="relationship-list">
                  {stringList(entity.child_ids).map((id) => (
                    <EntityLink
                      key={id}
                      id={id}
                      entities={entities}
                      onSelect={onSelect}
                    />
                  ))}
                </span>
              </Detail>
            )}
          </>
        )}
        {entity.entity_type === "species" &&
          relationship(entity.homeworld_id) && (
            <Detail label="Homeworld">
              {relationship(entity.homeworld_id)}
            </Detail>
          )}
        {(entity.entity_type === "organization" ||
          entity.entity_type === "vessel" ||
          entity.entity_type === "location") &&
          stringValue(entity.current_state ?? entity.state) && (
            <Detail label="Current state">
              {String(entity.current_state ?? entity.state)}
            </Detail>
          )}
      </dl>
      {stringValue(entity.description) && (
        <section className="inspector-section">
          <h3>Description</h3>
          <p>{String(entity.description)}</p>
        </section>
      )}
      {astronomySystem && (
        <section className="joined-astronomy">
          <h3>Mapped astronomy</h3>
          <SystemDetails system={astronomySystem} embedded storyKnown />
        </section>
      )}
    </section>
  );
}

function ChapterRelationshipList({
  label,
  relationships,
  onSelect,
  condensed = false,
}: {
  label: string;
  relationships: readonly NarrativeChapterRelationship[];
  onSelect: (selection: SelectionIdentity) => void;
  condensed?: boolean;
}) {
  if (relationships.length === 0) return null;
  return (
    <section className="inspector-section chapter-relationship-section">
      <h3>{label}</h3>
      <ul
        className={`chapter-relationship-list ${condensed ? "condensed" : ""}`}
      >
        {relationships.map((relationship) => (
          <li key={relationship.id}>
            <button
              type="button"
              aria-label={`${label}: ${relationship.name}`}
              onClick={() =>
                onSelect({ kind: "narrative", id: relationship.id })
              }
            >
              <ObjectItemBullet active={false} />
              <span>{relationship.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChapterDetails({
  detail,
  assets,
  headingId,
  onSelect,
}: {
  detail: NarrativeChapterDetail;
  assets: NarrativeRecord;
  headingId: string;
  onSelect: (selection: SelectionIdentity) => void;
}) {
  const trimmedTitle = detail.title.trim();
  const numericOnly = trimmedTitle === detail.localNumber;
  const pictureAlt = `Illustration for Book ${detail.bookNumber}, Chapter ${detail.localNumber}${
    numericOnly ? "" : `, ${trimmedTitle}`
  }`;
  return (
    <article
      className="details chapter-inspector-details"
      data-chapter={detail.chapter}
      aria-live="polite"
      aria-labelledby={headingId}
    >
      <p className="eyebrow">
        Book {detail.bookNumber} · Chapter {detail.localNumber}
      </p>
      <h2 id={headingId}>{detail.title}</h2>
      <p className="chapter-book-title">{detail.bookTitle}</p>
      <Picture pictureId={detail.pictureId} assets={assets} alt={pictureAlt} />
      <section className="inspector-section chapter-synopsis">
        <h3>Synopsis</h3>
        <p>{detail.summary}</p>
      </section>
      <div className="chapter-relationship-frame">
        <ChapterRelationshipList
          label="Location"
          relationships={[detail.location]}
          onSelect={onSelect}
        />
        <ChapterRelationshipList
          label={
            detail.leadCharacters.length === 1
              ? "Lead character"
              : "Lead characters"
          }
          relationships={detail.leadCharacters}
          onSelect={onSelect}
        />
        <ChapterRelationshipList
          label="Events"
          relationships={detail.events}
          onSelect={onSelect}
        />
        <ChapterRelationshipList
          label="Vessels"
          relationships={detail.vessels}
          onSelect={onSelect}
        />
        <ChapterRelationshipList
          label="Technologies"
          relationships={detail.technologies}
          onSelect={onSelect}
        />
        <ChapterRelationshipList
          label="Characters"
          relationships={detail.appearingCharacters}
          onSelect={onSelect}
          condensed
        />
      </div>
    </article>
  );
}

function InspectorHistoryControls({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  return (
    <nav className="inspector-history" aria-label="Inspector history">
      <button
        className="button quiet inspector-history-button"
        type="button"
        aria-label="Back"
        title="Back"
        disabled={!canGoBack}
        onClick={onBack}
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        className="button quiet inspector-history-button"
        type="button"
        aria-label="Forward"
        title="Forward"
        disabled={!canGoForward}
        onClick={onForward}
      >
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}

export function ObjectInspector({
  selection,
  narrativeItem,
  chapterDetail,
  world,
  systems,
  knownAstronomySystemIds,
  assets,
  headingId = "details-heading",
  canGoBack = false,
  canGoForward = false,
  onBack = () => undefined,
  onForward = () => undefined,
  onSelect,
}: {
  selection: SelectionIdentity | null;
  narrativeItem: NarrativeBrowserItem | null;
  chapterDetail?: NarrativeChapterDetail | null;
  world: NarrativeWorld;
  systems: StellarSystem[];
  knownAstronomySystemIds?: ReadonlySet<string>;
  assets: NarrativeRecord;
  headingId?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onSelect: (selection: SelectionIdentity) => void;
}) {
  if (!selection)
    return (
      <section className="details empty-details" aria-live="polite">
        <p>
          Select a map marker or browser item to inspect its reader-safe
          details.
        </p>
      </section>
    );
  const withHistory = (details: ReactNode) => (
    <div className="inspector-detail-stack">
      <InspectorHistoryControls
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={onBack}
        onForward={onForward}
      />
      {details}
    </div>
  );
  if (selection.kind === "chapter" && chapterDetail)
    return withHistory(
      <ChapterDetails
        detail={chapterDetail}
        assets={assets}
        headingId={headingId}
        onSelect={onSelect}
      />,
    );
  if (selection.kind === "narrative" && narrativeItem)
    return withHistory(
      <NarrativeDetails
        item={narrativeItem}
        world={world}
        systems={systems}
        assets={assets}
        headingId={headingId}
        onSelect={onSelect}
      />,
    );
  if (selection.kind === "astronomy") {
    const system =
      systems.find((candidate) => candidate.id === selection.id) ?? null;
    const storyKnown = knownAstronomySystemIds
      ? knownAstronomySystemIds.has(selection.id)
      : world.entities.some(
          (entity) =>
            entity.entity_type === "location" &&
            entity.kind === "star_system" &&
            entity.astronomy_object_id === selection.id,
        );
    return withHistory(
      <SystemDetails
        system={system}
        storyKnown={storyKnown}
        headingId={headingId}
      />,
    );
  }
  return withHistory(
    <section className="details empty-details" aria-live="polite">
      <p>The selected object is not eligible in this view.</p>
    </section>,
  );
}
