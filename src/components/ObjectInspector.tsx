import { useMemo, type ReactNode } from "react";
import type { SelectionIdentity } from "../domain/selection";
import type { Component, StellarSystem } from "../domain/types";
import type { NarrativeBrowserItem } from "../narrative/browser";
import type {
  CharacterTravelStop,
  NarrativeChapterDetail,
  NarrativeChapterRelationship,
  NarrativeActivity,
  NarrativeEntity,
  NarrativeRecord,
  NarrativeWorld,
} from "../narrative/model";
import {
  characterAncestors,
  compareNarrativeChapters,
  formatNarrativeDate,
  narrativeEntitiesBeforeExistence,
  narrativeSoftCeilingLabel,
} from "../narrative/model";
import {
  resolveHeaderIllustration,
  type HeaderIllustration,
} from "../narrative/header-illustration";
import { disambiguatedEntityLabel } from "../narrative/entity-label";
import type {
  CharacterInspectorSectionState,
  NarrativeChapterSummary,
} from "../narrative/progress";
import {
  CHAPTER_TITLE_SEPARATOR,
  chapterDisplayTitle,
  chapterReferenceLabel,
  defaultCharacterInspectorSectionState,
  visibleChapterTitle,
} from "../narrative/progress";
import { SystemDetails } from "./SystemDetails";
import { ObjectItemBullet } from "./ObjectBrowserIcons";
import { NarrativeText } from "./NarrativeText";
import type { SystemViewEntry } from "../system-view";
import { ENABLE_ENTER_SYSTEM } from "../features";
import { ChapterStepper } from "./ChapterStepper";

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
  return formatNarrativeDate(value);
}

/**
 * Entities a card can link to: those shown at the soft ceiling plus those
 * read but not existing yet (rule (g)), whose cards still open.
 */
function cardLinkEntities(world: NarrativeWorld): Map<string, NarrativeEntity> {
  return new Map(
    [...world.entities, ...narrativeEntitiesBeforeExistence(world)].map(
      (entity) => [entity.id, entity],
    ),
  );
}

/**
 * Current state as of the soft ceiling (§2.5, rules (b) and (g)): the state
 * with an "as of Chapter X" / "as of Y" line, or "No known state" with it.
 * A world without ceilings (hand-built) shows the bare state, if any.
 */
function CurrentStateDetail({
  state,
  asOf,
  prose,
}: {
  state: string | null;
  asOf: string | null;
  prose: (value: unknown) => ReactNode;
}) {
  if (!asOf)
    return state ? <Detail label="Current state">{prose(state)}</Detail> : null;
  return (
    <Detail label="Current state">
      {state ? (
        prose(state)
      ) : (
        <span className="no-known-state">No known state</span>
      )}
      <span className="relationship-context">as of {asOf}</span>
    </Detail>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DateContextDetails({
  date,
  sourceChapters,
  activity,
  world,
  headingId,
}: {
  date: string;
  sourceChapters: readonly string[];
  activity: readonly NarrativeActivity[];
  world: NarrativeWorld;
  headingId: string;
}) {
  const entities = new Map(world.entities.map((entity) => [entity.id, entity]));
  return (
    <article
      className="details date-context-details"
      aria-live="polite"
      aria-labelledby={headingId}
    >
      <p className="eyebrow">Date context</p>
      <h2 id={headingId}>{formatNarrativeDate(date)}</h2>
      <section className="inspector-section">
        <h3>
          {sourceChapters.length === 1 ? "Source chapter" : "Source chapters"}
        </h3>
        <p>
          {sourceChapters.map((chapter) => `Chapter ${chapter}`).join(" · ")}
        </p>
      </section>
      <section className="inspector-section">
        <h3>Activity at this date</h3>
        {activity.length === 0 ? (
          <p>No additional reader-visible activity is recorded at this date.</p>
        ) : (
          <ul className="date-context-activity">
            {activity.map((item) => (
              <li key={`${item.entity_id}-${item.source_chapter}`}>
                {stringValue(entities.get(item.entity_id)?.name) ??
                  item.entity_id}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function CharacterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = `character-section-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section className="inspector-section character-section">
      <h3>
        <button
          type="button"
          className="inspector-section-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={onToggle}
        >
          {title}
        </button>
      </h3>
      {expanded && <div id={id}>{children}</div>}
    </section>
  );
}

function EntityLink({
  id,
  entities,
  currentName,
  onSelect,
}: {
  id: string;
  entities: ReadonlyMap<string, NarrativeEntity>;
  currentName: string;
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
      {disambiguatedEntityLabel(target, currentName)}
    </button>
  );
}

/**
 * "Chapter 1.18" as a link to that chapter's info card, in the inline entity
 * link style. It links only up to the reader's Read through chapter; a later
 * chapter (which the projection should never surface) stays plain text, so a
 * link can never open or reveal a chapter the reader has not reached.
 */
export function ChapterLink({
  chapter,
  readThroughChapter,
  onChapterSelect,
  chapters = [],
}: {
  chapter: string;
  readThroughChapter: string | null;
  onChapterSelect: (chapter: string) => void;
  /** Chapter summaries for the title; without them the link is number-only. */
  chapters?: readonly NarrativeChapterSummary[];
}) {
  const label = `Chapter ${chapter}`;
  if (
    !readThroughChapter ||
    compareNarrativeChapters(chapter, readThroughChapter) > 0
  )
    return <>{label}</>;
  // A title only ever appears on a linkable (read) chapter; it ellipsizes on
  // one line and the full reference is the tooltip (BOB-20261116-35B47D).
  const title = visibleChapterTitle(chapters, chapter, readThroughChapter);
  return (
    <button
      type="button"
      className={`link-button inline-entity-link chapter-link${title ? " titled" : ""}`}
      aria-label={title ? chapterReferenceLabel(chapter, title) : undefined}
      title={title ? chapterReferenceLabel(chapter, title) : undefined}
      onClick={() => onChapterSelect(chapter)}
    >
      {title ? (
        // The clamp sits on an inner span: WebKit ignores a button's own
        // display for line clamping.
        <span className="chapter-link-clamp">
          {label}
          <span className="chapter-link-title">
            {CHAPTER_TITLE_SEPARATOR}
            {title}
          </span>
        </span>
      ) : (
        label
      )}
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

function HeaderIllustrationView({
  illustration,
}: {
  illustration: HeaderIllustration;
}) {
  if (illustration.kind === "species-icon")
    return (
      <span
        className="inspector-header-illustration species-header-icon"
        data-header-illustration="species-icon"
        role="img"
        aria-label={illustration.label}
        style={{
          backgroundColor: illustration.colour,
          maskImage: `url("${illustration.iconPath}")`,
          WebkitMaskImage: `url("${illustration.iconPath}")`,
        }}
      />
    );
  return (
    <img
      className="inspector-header-illustration"
      data-header-illustration={illustration.origin}
      src={illustration.src}
      alt={illustration.alt}
      width={illustration.width}
      height={illustration.height}
      decoding="async"
    />
  );
}

function NarrativeDetails({
  item,
  world,
  systems,
  assets,
  headingId,
  onSelect,
  onChapterSelect,
  readThroughChapter,
  chapters,
  travelStops,
  sectionState,
  onToggleSection,
  systemEntry,
  onEnterSystem,
  inlineLinkFallbacks,
}: {
  item: NarrativeBrowserItem;
  world: NarrativeWorld;
  systems: StellarSystem[];
  assets: NarrativeRecord;
  headingId: string;
  onSelect: (selection: SelectionIdentity) => void;
  onChapterSelect: (chapter: string) => void;
  readThroughChapter: string | null;
  chapters: readonly NarrativeChapterSummary[];
  travelStops: readonly CharacterTravelStop[];
  sectionState: CharacterInspectorSectionState;
  onToggleSection: (section: keyof CharacterInspectorSectionState) => void;
  systemEntry: SystemViewEntry | null;
  onEnterSystem: (entry: SystemViewEntry) => void;
  inlineLinkFallbacks: ReadonlyMap<string, readonly string[]>;
}) {
  const { entity } = item;
  const name = String(entity.name);
  const entities = cardLinkEntities(world);
  const asOf = narrativeSoftCeilingLabel(world);
  const aliases = stringList(entity.aliases);
  const prose = (value: unknown) => (
    <NarrativeText
      text={String(value)}
      entities={entities}
      onSelect={onSelect}
      fallbackLabels={inlineLinkFallbacks}
    />
  );
  const mappedId =
    entity.entity_type === "location"
      ? mappedAstronomyId(entity, entities)
      : null;
  const astronomySystem =
    systems.find((system) => system.id === mappedId) ?? null;
  const recency = item.lastActivity ? (
    <>
      {item.active ? "Active" : "Last active"} in{" "}
      <ChapterLink
        chapter={item.lastActivity.source_chapter}
        readThroughChapter={readThroughChapter}
        onChapterSelect={onChapterSelect}
        chapters={chapters}
      />
      {item.lastActivity.effective_date
        ? ` · ${displayDate(item.lastActivity.effective_date)}`
        : " · chronologically unplaced"}
    </>
  ) : null;
  const relationship = (id: unknown) =>
    typeof id === "string" ? (
      <EntityLink
        id={id}
        entities={entities}
        currentName={name}
        onSelect={onSelect}
      />
    ) : null;
  const ancestors =
    entity.entity_type === "character"
      ? characterAncestors(world, entity.id)
      : [];
  const illustration = resolveHeaderIllustration(
    entity.id,
    world,
    assets,
    item.speciesPresentation,
  );
  const locationKind =
    entity.entity_type === "location" && stringValue(entity.kind)
      ? String(entity.kind).replaceAll("_", " ")
      : null;
  return (
    <section
      className="details narrative-details"
      aria-live="polite"
      aria-labelledby={headingId}
    >
      <header
        className={`inspector-header${illustration ? " has-illustration" : ""}`}
      >
        <div className="inspector-header-text">
          <p className="eyebrow">{typeLabels[entity.entity_type]}</p>
          <h2 id={headingId}>{name}</h2>
          {locationKind && <p className="entity-kind">{locationKind}</p>}
        </div>
        {illustration && <HeaderIllustrationView illustration={illustration} />}
      </header>
      {ENABLE_ENTER_SYSTEM && systemEntry?.narrativeSystemId === entity.id && (
        <button
          className="button enter-system"
          type="button"
          onClick={() => onEnterSystem(systemEntry)}
        >
          Enter system
        </button>
      )}
      {aliases.length > 0 && <p className="aliases">{aliases.join(" · ")}</p>}
      {/* No status tag row (Maciej, 2026-11-15): the recency line says Active
          or Last active, and a location's Map context says whether it is
          explicitly unmapped. */}
      {recency && <p className="recency-context">{recency}</p>}
      {entity.entity_type === "character" ? (
        <CharacterSection
          title="Overview"
          expanded={sectionState.overview}
          onToggle={() => onToggleSection("overview")}
        >
          <dl>
            {relationship(entity.species_id) && (
              <Detail label="Species">{relationship(entity.species_id)}</Detail>
            )}
            {stringValue(entity.gender) && (
              <Detail label="Gender">{String(entity.gender)}</Detail>
            )}
            <CurrentStateDetail
              state={stringValue(entity.current_state)}
              asOf={asOf}
              prose={prose}
            />
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
          </dl>
          {stringValue(entity.description) && (
            <div className="character-overview-description">
              <h4>Description</h4>
              <p>{prose(entity.description)}</p>
            </div>
          )}
        </CharacterSection>
      ) : (
        <dl>
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
                        currentName={name}
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
              {stringList(entity.colony_of).length > 0 && (
                <Detail label="Established species">
                  <span className="relationship-list">
                    {stringList(entity.colony_of).map((id) => (
                      <EntityLink
                        key={id}
                        id={id}
                        entities={entities}
                        currentName={name}
                        onSelect={onSelect}
                      />
                    ))}
                  </span>
                </Detail>
              )}
              {entity.possible_colony_target === true && (
                <Detail label="Possible colony target">Yes</Detail>
              )}
              {entity.prominent === true && (
                <Detail label="Prominent installation">Yes</Detail>
              )}
              {stringList(entity.child_ids).length > 0 && (
                <Detail label="Contains">
                  <span className="relationship-list">
                    {stringList(entity.child_ids).map((id) => (
                      <EntityLink
                        key={id}
                        id={id}
                        entities={entities}
                        currentName={name}
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
            entity.entity_type === "location") && (
            <CurrentStateDetail
              state={stringValue(entity.current_state ?? entity.state)}
              asOf={asOf}
              prose={prose}
            />
          )}
        </dl>
      )}
      {ancestors.length > 0 && (
        <CharacterSection
          title="Lineage"
          expanded={sectionState.lineage}
          onToggle={() => onToggleSection("lineage")}
        >
          <div className="ancestor-lineage">
            <ul>
              {ancestors.map((ancestor, index) => {
                const birthChapter = stringValue(ancestor.birth_chapter);
                const birthDate = stringValue(ancestor.birth_date);
                return (
                  <li key={ancestor.id}>
                    {index > 0 && (
                      <span className="ancestor-arrow" aria-hidden="true">
                        ↑
                      </span>
                    )}
                    <ObjectItemBullet active={false} />
                    <span className="ancestor-copy">
                      <button
                        type="button"
                        className="link-button ancestor-name"
                        aria-label={`Character: ${String(ancestor.name)}`}
                        onClick={() =>
                          onSelect({ kind: "narrative", id: ancestor.id })
                        }
                      >
                        {String(ancestor.name)}
                      </button>
                      {(birthChapter || birthDate) && (
                        <small>
                          {birthChapter && (
                            <button
                              type="button"
                              className="link-button ancestor-chapter"
                              aria-label={`Birth or cloning chapter for ${String(ancestor.name)}: Chapter ${birthChapter}`}
                              onClick={() => onChapterSelect(birthChapter)}
                            >
                              Chapter {birthChapter}
                            </button>
                          )}
                          {birthChapter && birthDate && " · "}
                          {birthDate && displayDate(birthDate)}
                        </small>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </CharacterSection>
      )}
      {entity.entity_type === "character" && travelStops.length > 0 && (
        <CharacterSection
          title="Travel history"
          expanded={sectionState.travelHistory}
          onToggle={() => onToggleSection("travelHistory")}
        >
          <ul className="travel-history">
            {[...travelStops].reverse().map((stop) => {
              const location = entities.get(stop.location_id);
              return (
                <li key={`${stop.source_chapter}-${stop.appearance_index}`}>
                  {location ? (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        onSelect({ kind: "narrative", id: location.id })
                      }
                    >
                      {String(location.name)}
                    </button>
                  ) : (
                    <span>{stop.location_id}</span>
                  )}
                  <span className="relationship-context">
                    <button
                      type="button"
                      className="link-button"
                      aria-label={`Travel appearance chapter: Chapter ${stop.source_chapter}`}
                      onClick={() => onChapterSelect(stop.source_chapter)}
                    >
                      Chapter {stop.source_chapter}
                    </button>
                    {" · "}
                    {displayDate(stop.effective_date)}
                  </span>
                </li>
              );
            })}
          </ul>
        </CharacterSection>
      )}
      {entity.entity_type !== "character" &&
        stringValue(entity.description) && (
          <section className="inspector-section">
            <h3>Description</h3>
            <p>{prose(entity.description)}</p>
          </section>
        )}
      {astronomySystem && (
        <section className="joined-astronomy">
          <h3>Mapped astronomy</h3>
          <SystemDetails system={astronomySystem} embedded storyKnown />
        </section>
      )}
      {entity.entity_type === "location" && (
        <section className="inspector-section map-context-section">
          <h3>Map context</h3>
          <p>
            {entity.map_status === "unmapped"
              ? "Explicitly unmapped"
              : mappedId
                ? "Mapped"
                : "No mapped stellar-system context"}
          </p>
        </section>
      )}
    </section>
  );
}

function ComponentChooser({
  system,
  selectedComponentId,
  onSelect,
}: {
  system: StellarSystem;
  selectedComponentId: string | null;
  onSelect: (componentId: string) => void;
}) {
  return (
    <section className="inspector-section system-component-controls">
      <h3>Component stars</h3>
      <p>Choose a catalogue component without moving the system view.</p>
      <div className="relationship-list">
        {system.components.map((component) => (
          <button
            key={component.id}
            type="button"
            className="link-button"
            aria-pressed={selectedComponentId === component.id}
            aria-label={`Inspect component: ${component.designation}`}
            onClick={() => onSelect(component.id)}
          >
            {component.designation}
          </button>
        ))}
      </div>
    </section>
  );
}

function ComponentDetails({
  system,
  component,
  headingId,
}: {
  system: StellarSystem;
  component: Component;
  headingId: string;
}) {
  const identifiers = [
    component.identifiers.gaia_dr3_source_id
      ? `Gaia DR3 ${component.identifiers.gaia_dr3_source_id}`
      : null,
    component.identifiers.cns5_id,
    component.identifiers.published_name,
  ].filter((value): value is string => Boolean(value));
  const spectralType =
    component.c20pc_enrichment?.spectral_type_near_infrared ??
    component.c20pc_enrichment?.spectral_type_optical ??
    component.c20pc_enrichment?.spectral_type ??
    component.gaia_enrichment?.spectral_type ??
    null;
  return (
    <section className="details component-details" aria-labelledby={headingId}>
      <p className="eyebrow">Astronomy catalogue component</p>
      <h2 id={headingId}>{component.designation}</h2>
      <p className="object-status">Component of {system.name}</p>
      <dl>
        <Detail label="Catalogue class">
          {component.object_class?.replaceAll("_", " ") ?? "Unclassified"}
        </Detail>
        {spectralType && <Detail label="Spectral type">{spectralType}</Detail>}
        <Detail label="Visual family">
          {component.visual.color_family.replaceAll("-", " ")}
        </Detail>
      </dl>
      {identifiers.length > 0 && (
        <p className="component-list">
          <span>Catalogue IDs</span>
          {identifiers.join("; ")}
        </p>
      )}
      <p className="provenance">
        {component.provenance.catalogues.join(" · ")}
      </p>
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

function ChapterContext({
  detail,
  onSelect,
}: {
  detail: NarrativeChapterDetail;
  onSelect: (selection: SelectionIdentity) => void;
}) {
  return (
    <div className="chapter-context" aria-label="Chapter context">
      <time
        aria-label={`Date: ${formatNarrativeDate(detail.date)}`}
        dateTime={detail.date}
      >
        {formatNarrativeDate(detail.date)}
      </time>
      <button
        type="button"
        aria-label={`Location: ${detail.location.name}`}
        onClick={() => onSelect({ kind: "narrative", id: detail.location.id })}
      >
        <ObjectItemBullet active={false} />
        <span>{detail.location.name}</span>
      </button>
    </div>
  );
}

function ChapterDetails({
  detail,
  world,
  assets,
  headingId,
  onSelect,
  onChapterSelect,
  chapters,
  readThroughChapter,
  inlineLinkFallbacks,
}: {
  detail: NarrativeChapterDetail;
  world: NarrativeWorld;
  assets: NarrativeRecord;
  headingId: string;
  onSelect: (selection: SelectionIdentity) => void;
  onChapterSelect: (chapter: string) => void;
  chapters: readonly NarrativeChapterSummary[];
  readThroughChapter: string | null;
  inlineLinkFallbacks: ReadonlyMap<string, readonly string[]>;
}) {
  const entitiesById = useMemo(() => cardLinkEntities(world), [world]);
  // The card shows the display title ("Bob Version 2.0" for the stored
  // "2 - Bob Version 2.0") in its heading and illustration text; an untitled
  // chapter keeps its stored bare number as the heading. The card only opens
  // for a read chapter (BOB-20261116-35B47D).
  const displayTitle = chapterDisplayTitle(detail);
  const heading = displayTitle ?? detail.title;
  const pictureAlt = `Illustration for Book ${detail.bookNumber}, Chapter ${detail.localNumber}${
    displayTitle ? `, ${displayTitle}` : ""
  }`;
  return (
    <article
      className="details chapter-inspector-details"
      data-chapter={detail.chapter}
      aria-live="polite"
      aria-labelledby={headingId}
    >
      <p className="chapter-book-title">
        Book {detail.bookNumber} · {detail.bookTitle}
      </p>
      <div className="eyebrow chapter-title-label">
        <span className="chapter-seq-eyebrow-word">Chapter</span>
        <ChapterStepper
          chapter={detail.chapter}
          chapters={chapters}
          readThroughChapter={readThroughChapter}
          onChapterSelect={onChapterSelect}
        />
      </div>
      <h2 id={headingId}>{heading}</h2>
      <ChapterContext detail={detail} onSelect={onSelect} />
      <Picture pictureId={detail.pictureId} assets={assets} alt={pictureAlt} />
      <section className="inspector-section chapter-synopsis">
        <h3>Synopsis</h3>
        <p>
          <NarrativeText
            text={detail.summary}
            entities={entitiesById}
            onSelect={onSelect}
            fallbackLabels={inlineLinkFallbacks}
          />
        </p>
      </section>
      <div className="chapter-relationship-frame">
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

export function InspectorHistoryControls({
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

const noInlineLinkFallbacks: ReadonlyMap<string, readonly string[]> = new Map();

export function ObjectInspector({
  selection,
  narrativeItem,
  chapterDetail,
  dateContext = null,
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
  onChapterSelect = () => undefined,
  readThroughChapter = null,
  chapters = [],
  travelStops = [],
  sectionState = defaultCharacterInspectorSectionState(),
  onToggleSection = () => undefined,
  systemEntry = null,
  enteredSystem = null,
  onEnterSystem = () => undefined,
  onComponentSelect = () => undefined,
  showHistoryControls = true,
  inlineLinkFallbacks = noInlineLinkFallbacks,
}: {
  selection: SelectionIdentity | null;
  narrativeItem: NarrativeBrowserItem | null;
  chapterDetail?: NarrativeChapterDetail | null;
  dateContext?: { date: string; sourceChapters: readonly string[] } | null;
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
  onChapterSelect?: (chapter: string) => void;
  /**
   * The reader's Read through chapter: chapter links go no further. Without
   * it chapters in the recency line are plain text.
   */
  readThroughChapter?: string | null;
  /** Catalogue used by the chapter eyebrow stepper to find previous / next. */
  chapters?: readonly NarrativeChapterSummary[];
  travelStops?: readonly CharacterTravelStop[];
  sectionState?: CharacterInspectorSectionState;
  onToggleSection?: (section: keyof CharacterInspectorSectionState) => void;
  systemEntry?: SystemViewEntry | null;
  enteredSystem?: StellarSystem | null;
  onEnterSystem?: (entry: SystemViewEntry) => void;
  onComponentSelect?: (componentId: string) => void;
  /**
   * The compact panel renders the history controls in its header row, next
   * to the close icon, so it turns the in-body copy off.
   */
  showHistoryControls?: boolean;
  /**
   * Default labels for inline entity links whose target the current view does
   * not project (`preparedInlineLinkFallbackLabels`, ADR-0029).
   */
  inlineLinkFallbacks?: ReadonlyMap<string, readonly string[]>;
}) {
  if (dateContext)
    return (
      <DateContextDetails
        date={dateContext.date}
        sourceChapters={dateContext.sourceChapters}
        activity={world.activity.filter(
          (item) => item.effective_date === dateContext.date,
        )}
        world={world}
        headingId={headingId}
      />
    );
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
      {showHistoryControls && (
        <InspectorHistoryControls
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onBack={onBack}
          onForward={onForward}
        />
      )}
      {details}
    </div>
  );
  if (selection.kind === "chapter" && chapterDetail)
    return withHistory(
      <ChapterDetails
        detail={chapterDetail}
        world={world}
        assets={assets}
        headingId={headingId}
        onSelect={onSelect}
        onChapterSelect={onChapterSelect}
        chapters={chapters}
        readThroughChapter={readThroughChapter}
        inlineLinkFallbacks={inlineLinkFallbacks}
      />,
    );
  if (selection.kind === "narrative" && narrativeItem)
    return withHistory(
      <>
        <NarrativeDetails
          item={narrativeItem}
          world={world}
          systems={systems}
          assets={assets}
          headingId={headingId}
          onSelect={onSelect}
          onChapterSelect={onChapterSelect}
          readThroughChapter={readThroughChapter}
          chapters={chapters}
          travelStops={travelStops}
          sectionState={sectionState}
          onToggleSection={onToggleSection}
          systemEntry={systemEntry}
          onEnterSystem={onEnterSystem}
          inlineLinkFallbacks={inlineLinkFallbacks}
        />
        {enteredSystem && (
          <ComponentChooser
            system={enteredSystem}
            selectedComponentId={null}
            onSelect={onComponentSelect}
          />
        )}
      </>,
    );
  if (selection.kind === "component") {
    const system =
      systems.find((candidate) => candidate.id === selection.systemId) ?? null;
    const component = system?.components.find(
      (candidate) => candidate.id === selection.id,
    );
    if (system && component)
      return withHistory(
        <>
          <ComponentDetails
            system={system}
            component={component}
            headingId={headingId}
          />
          {enteredSystem?.id === system.id && (
            <ComponentChooser
              system={system}
              selectedComponentId={component.id}
              onSelect={onComponentSelect}
            />
          )}
        </>,
      );
  }
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
      <>
        <SystemDetails
          system={system}
          storyKnown={storyKnown}
          headingId={headingId}
        />
        {enteredSystem && enteredSystem.id === system?.id && (
          <ComponentChooser
            system={enteredSystem}
            selectedComponentId={null}
            onSelect={onComponentSelect}
          />
        )}
      </>,
    );
  }
  return withHistory(
    <section className="details empty-details" aria-live="polite">
      <p>The selected object is not eligible in this view.</p>
    </section>,
  );
}
