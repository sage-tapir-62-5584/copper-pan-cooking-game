# The Copper Pan

A cozy grill-house cooking game for the desktop browser, drawn entirely
with Canvas 2D shapes — deep teal walls, copper pans, and food you can
almost smell: sesame buns with a shine, cheese that drips, a patty with
real grill marks.

## How to play

Tickets land on the hanging **order board**, each asking for one dish.
Build the dish on the assembly **plate**, layer by layer, exactly as the
ticket lists it, then ring the bell to serve.

- **Ingredient bins** (bottom row) route food to where it belongs:
  buns and cheese go straight to the plate; patties, bacon and eggs go
  to the **grill**; tomatoes, lettuce and onions go to the **chopping
  board**.
- The grill cooks in real time — a progress ring fills, the food is
  done, and if you leave it, it **burns**. Start grill items early and
  plan your route while they cook.
- Chopping takes repeated clicks (three for tomato and lettuce, two for
  onion); the last chop sends the food to the plate.
- Click a finished grill item to move it to the plate. When the plate
  matches a ticket exactly, the SERVE button lights up: serving pays
  the price plus a tip for the patience left, and consecutive serves
  build a **combo multiplier**.
- A ticket whose patience bar runs out walks away and costs a star.
  Lose all three stars, or run out the two-minute day, and service ends.
- Wrong stack? Scrap the plate and start again. Burnt food ruins any
  dish it joins.

As the day heats up, tickets arrive faster, patience runs thinner, and
the recipe book opens up: the Classic Burger and Garden Salad first,
then the Garden Burger, Bacon Melt, Breakfast Plate, Double Stack and
Sunrise Burger.

## Controls

- **Mouse:** click bins, grill slots, the chopping board, SERVE, SCRAP.
- **1–8:** pick an ingredient bin.
- **Space:** serve the plate. **Backspace:** scrap it. **P:** pause.
- **Enter:** open the day / play again.

## Running it

The game is plain static files with no build step and no network needs.
Serve the `game/` folder with any static file server, for example:

```
python3 -m http.server 8080 --directory game
```

then open http://localhost:8080 in desktop Chrome. Everything it loads is a file
under `game/`; the sounds are synthesised with WebAudio, so there are
no audio files either.

## File layout

```
main.ts                  hand-in program: copies game/ + screenshots/
                         to the output dir and writes dossier.json
vendor/makefun-game.ts   the make.fun dossier library, copied unchanged
game/
  index.html             the page: one canvas, one module script
  src/config.js          palette, ingredients, recipes, balance, layout
  src/random.js          seeded RNG (mulberry32) for staged scenes
  src/audio.js           WebAudio-synthesised sizzle, chop, ding, coins
  src/world.js           the day's state and rules: tickets, grill,
                         chopping, plate matching, serving, combos
  src/render.js          all canvas drawing, including the food art
  src/input.js           mouse + keyboard, hit-tested on the layout
  src/shots.js           deterministic staging for the screenshots
  src/main.js            boot, frame loop, and the ?shot= screenshot mode
screenshots/             four real renders of the game (cover first)
```

## Screenshots

The screenshots are real frames of this game's own renderer. Opening
`game/index.html?shot=rush&seed=1` (also `title`, `action`, `serve`)
stages a deterministic mid-service scene and draws one frame; the files
in `screenshots/` were captured from those URLs in headless Chromium.

## Handing it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

writes `out/game`, `out/screenshots` and `out/dossier.json`.

## License

MIT — see `LICENSE`.
