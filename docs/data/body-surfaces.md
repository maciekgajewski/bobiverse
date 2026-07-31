# Body-surface assets

Body surfaces are project-owned, local, equirectangular colour textures for the
guided schematic system view. They are presentation assets, not astronomy data.
Runtime code never fetches a remote replacement.

## Registry contract

Register each texture in `data/narrative/assets.json` with role `body_surface`, a
stable `asset:` ID, a unique safe path below `public/assets/`, a provenance or
generation note, `projection: "equirectangular"`, `color_space: "srgb"`, mipmap and
generic flags, a positive `selection_version`, and compatible body kinds/classes.
`npm run narrative:validate` verifies the role metadata, local regular file, the
current 512-by-256 SVG dimensions and view box, and identical four-pixel edge guards
declared with `data-seam-mode="matched-edge-strips"`. Those guards make the first
and last rendered columns identical; real-browser sphere inspection remains the
authority for subtler near-seam repetition. Illustration IDs cannot be used as
body surfaces, and body-surface IDs cannot be used through `picture_id`.

The initial generic library contains two variants for rocky, icy, dwarf-planet,
gas-giant, and ice-giant classes. Classless eligible planets, dwarf planets, and
moons use the same kind-compatible pool as a safe fallback. A narrative body's
optional `surface_texture_id` selects a compatible generic or dedicated surface;
otherwise stable location-ID hashing chooses from selection version 1.

## Creating and extending surfaces

Create an original 2:1 equirectangular image with a seamless left/right join. Keep
important features away from both poles, inspect the join on a lit rotating sphere,
and ensure the texture remains legible with slow rotation disabled. Use sRGB colour;
the renderer enables mipmaps and a rough non-metallic material. Record how the image
was made and confirm that no book text, third-party protected art, remote URL, or
secret entered the file or provenance note.

Do not add a new asset to selection version 1. Give extensions a later version so
existing generic choices remain stable. Activating a new pool version is an explicit
appearance migration with regression and visual review. Dedicated textures set
`generic: false` and are selected only through reader-projected
`surface_texture_id`.

Manual real-browser acceptance checks every family for seam visibility, polar
pinching, repetition, lighting, colour, mipmap shimmer, and categorical readability
on desktop and phone GPUs.
