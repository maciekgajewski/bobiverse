# Project idea

## Background

"Bobiverse" is a SF book series, a space opera happening in the near future, on Earth and in the immediate stellar neighborhood.

The main characters are "Bobs", a clones of a person named "Robert Johannson". Bobs are REplicates created to serve as a brain
for Von Neumann probe. There also other, non-Bob characters.

Bobs are traveling between stars, exploring. They discover other worlds, other habitable planes, sentient species. They fight with hostile aliens, other hostile probes or even themselves.

Books are divided into short chapters. Each chapter has a one leading character, a Bob (sometimes two Bobs, a "moot" of Bobs), and takes place in a specific star system (sometimes, rarely, en-route). Each chapter is dated. Chapters are not chronological; the narration moves forward, but sometimes time jumps forward or back a bit.

## Project idea

Provide a visual aid for the reader. The main feature would be an interactive, 3D star map.

The vitalization should be a highly-interactive, visually appealing web application, running in a browser.

The main UI component will be a 3D, rotatable, zoomable star map, and a book timeline.

Book timeline will be a list of book chapters, grouped by books. A user of an app will select a chapter, and the map will display the state of the universe in that chapter and highlight events happening in that chapter.

### Other tools

Additional tools should be available
- list of characters (with a search box)
- list of star systems and planets (with a search box)
- a chronicle and path of a character among stars
- a chronicle oif events happening in a star system.
- a genealogical tree of Bobs (each Bob, bar the original one, is a clone of another Bob created sometime during the book)

All these tools should respect viewer currently set chapter, to not reveal any spoilers!

### Visual style

I imagine visuals to be in the style of Stellaris

### Helpful assitants 

There are 3 NPC AI characters that could be used as app assitants, clippy-style:
- GUPPY - an assistant AI, looking like Admiral Ackbar from Star Wars
- Jeeves - a butler serving coffee and other refreshments, looking like John Cleese
- Spike, a cat

## Technical details

- The UI must be usable in-browser.
- The data is generally static and can be included in a static web application; an
  application server and database are not needed initially.
- There is no need for user accounts initially. Browser `localStorage` will remember
  the visitor's last read chapter and preferences.
- The reader-visible world begins with a validated zero-state Solar-System location
  source, then book chapters act as ordered patches: they introduce book-specific
  entities, record visible updates to seeded or previously introduced entities, and
  reference stable IDs. Entity registries and chapter-state datasets are generated from
  those inputs and are never edited manually. A chapter contains:

  - a date
  - a main character(s)
  - location (star system, planet or en-route)
  - list of other characters appearing, providing a data point (time + location) to their history
  - major events
- Real 3D coordinates will come from a reproducible offline astronomy pipeline using
  CNS5 and Astropy. The application stores Sun-centered Galactic Cartesian coordinates
  and renders them at true linear scale.
- LLMs may later assist with per-chapter extraction, but only after a manually authored
  schema is proven and with mandatory human review. Source book text is not published
  or committed.
- Local use requires only a static site served over HTTP. Development runs on the
  headless server at trusted-LAN port 5173.
- Eventual publication can use ordinary static hosting with HTTPS. Publication also
  requires source attribution, original visual assets, accessibility and performance
  review, and an intellectual-property review.

The complete approved decisions are in [technical-design.md](technical-design.md).


## Plan

1. Flesh out the idea, find answer to technical questions
2. Phase 1A: complete interactive map experience using the 20 nearest stellar systems
3. Phase 1B: expand the validated map pipeline toward 100 stellar systems
4. Phase 2: get the first few chapters into JSON, add timeline and visualization
5. Further phases: character list, star/planet list, search, histories, and genealogy
