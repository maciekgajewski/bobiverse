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
- The data is, generally, static. QUESTION: can the web app hols all the data, or is data server needed
- The ir no point for reach user accounts etc. Maybe in the future. But cookies should be used to remember visitor's last read chapter.
- I imagine that the books can be distilled, so that each chapter is a JSON document containing:
  - a date
  - a main character(s)
  - location (star system, planet or en-route)
  - list oif other characters appearing, providing a data point (time + location) to their history
  - major events
- QUESTION - can e get a 3D coordinates of star systems from somewhere? Where to get them from? What coordinate system is used for stars?
- QUESTION - can we automatically use LLM to convert book text into per-chapter JSON


## Plan

1. Flesh out the idea, find answer to technical questions
2. Phase 1: interactive map containing the 100 stars closest to the Sun
3. Phase 3: get the first few chapters into JSON, add timeline and vizualisation
4. Further phases: character list, star/planet list, search etc



