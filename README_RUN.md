# Turbo Drive – Upgraded (no Python needed)

Requirements: Node.js 18+ (npm/npx). Nothing to install.

    npm start        # serves the game at http://localhost:3000
    # or, without npm scripts:
    npx serve -l 3000 .

Open http://localhost:3000 and play. (Opening index.html by double-click also mostly works, but a local server is recommended.)

## Mobile landscape build + new car
- **New car "Red Bug"** (from `low_poly_car_5.glb`) is the **starter car** (free). Police Car (600 coins), Ambulance (1000) and Jeep (2000) are bought with coins in the Garage. Abilities: Red Bug = normal car, Police = fast, Ambulance = faster/bigger nitro, Jeep = a bit of everything (see `CAR_STATS`). Saves from older versions are reset to Red Bug only (coins are kept). Converted to `game/js/data/car5.js`; stats in `CAR_STATS.gt` (`game/js/physics.js`), entry in `game/js/core/config.js`.
- **Landscape only**: in portrait a "Rotate your phone" screen covers the game and the run auto-pauses (`game/js/core/orientation.js`). The game asks for fullscreen + landscape lock on the first touch. `manifest.webmanifest` sets `"orientation":"landscape"` for "Add to Home Screen".
- **On-screen buttons** (touch devices): Tilt Left / Tilt Right (bottom-left), Brake, Gas, Nitro (bottom-right). Keyboard still works on desktop.
- Model credit: "Low poly car 5" by assetfactory (Sketchfab, SKETCHFAB Standard license).

## Levels 9 & 10: low gravity + flip buttons
- **Level 9 "Phobos Leap"** and **Level 10 "Olympus Float"** (Mars stage) are new tracks with Mars gravity (38% of normal, `gravity` in `LEVELS[9/10]`, `buildLevel9/10` in `game/js/physics.js`). Cars float much higher and longer; the old Mars re-skins of Earth 1 and 2 were replaced by these. Levels 1-8 and 11-16 are unchanged.
- **Flip buttons** (low-gravity levels only): on-screen LEFT FLIP (backflip) and RIGHT FLIP (frontflip), keyboard **Z** / **C**. Hold to spin in the air, release to stop the spin cleanly. Flips are an optional bonus (flip bonus shown in the HUD); reaching the finish wins.
- Fixed: a completed flip no longer counts as a "bad landing" (landing angle is now wrapped to +-180 deg in `physics.js`).
- `node tools/lowg_bot.js 9` / `10` runs a bot (plain, nitro, flips) with all 4 cars over the new tracks.

## What's new
- **Level 5 "Spiral Descent"** (desert sunrise): a banked ~2.8-turn spiral down a mesa, a laser run-out and a canyon jump. Adds curved/banked road support (`turn` / `bank` on a track piece in `physics.js`, mapped to 3D in `game/js/render/path.js`), a curve-following chase camera (`chaseCamera` in `game/js/game/game.js`) and the desert scenery kit (`game/js/render/desert.js`). The spiral hoops and canyon hoops pay 5 coins each. Levels 1-4 are unchanged.
- **Level 6 "Mega Ramp"** (ice and aurora, side camera): three stair-step jumps (2 / 3 / 4 m), a 220 m run-up with three **boost pads** (s = 420, 480, 540) and one giant 9 m ramp over a chasm. Adds the boost pad element (`track.boosts` in `physics.js`, drawn by `buildBoostPads` in `game/js/render/obstacles.js`: a short strip of extra push, a little nitro back, and a speed surge that bleeds off like nitro), the ice kit (`game/js/render/ice.js`: frozen lake, glacier cliffs, aurora ribbons, MEGA gantry) and a flip bonus on the mega jump (`megaJump` in `LEVELS[6]`: 2 flips pay x1.5, 3+ flips pay x2 on top of the normal flip points). 6 hoops (one per stair, three on the mega arc) pay 5 coins each. Star times 50 s / 75 s are still placeholders.
  - Numbers the bot corrected from the design doc: the car loses ~8 m/s climbing the mega ramp (lip speed ~25 m/s plain, ~30 with nitro, not 34), so the chasm is 20 m (670-690, was 38 m) and the landing ramp starts at 7 m and eases to 0 over 690-778 (was 2 m over 708-778; the low, flat landing made every long jump a crash-level impact). Plain runs land 25-36 m past the lip, nitro runs 39-49 m.
- **Level 7 "Sky Climb"** (jungle at dusk, chase camera): rolling valley with two warm-up jumps, three switchback hairpins (+180 / -180 / +180 deg, banked 8 deg) climbing a mountain in four climbs (13% grade), a 100 m summit run-up, then a launch across a valley to the finish. Built from `LEVEL_07_SKY_CLIMB.md`. Jungle kit in `game/js/render/jungle.js` (rock pillars holding the road up, instanced canopy, wide stone ledges with glowing rails on the hairpins, vine gantries "CLIMB" and "SUMMIT", mist, fireflies, far mountains); track in `buildLevel7` in `game/js/physics.js`. 6 hoops (3 hairpin apexes + 3 on the summit arc) pay 5 coins each, and a boost pad ("recharge strip") sits at the end of each hairpin ledge (s = 482, 617, 752). Coin multiplier x6. Star times 50 s / 70 s (bot finishes in 34-42 s; still placeholders).
  - Numbers the bot corrected from the design doc: the summit jump as drawn (6 m kicker, 40 m gap, ramp 28 m below the lip) crashed every car ("nose-dived" at s ~ 1020: the flight path hit the ramp ~45 deg steeper than the ramp, and the lip speed fell from 31 to 27 m/s on the kicker). Now: kicker rise 2 m (lip 34 m, speed kept at ~86% of top speed), gap 28 m (957-985), landing ramp straight from 26 m down to 0 over 985-1065. That survives all 14 test runs (night / ambulance / jeep, with and without nitro, with and without air control): lip speeds 27-39 m/s, landings 988-1023, none crashing. Summit hoops re-placed from those trajectories: (968, 35.1), (976, 33.9), (984, 31.0).
  - Heads-up: the climbs do not stall the car (throttle-only minimum speed on the climbs is 25-28 m/s, so a hairpin ledge actually speeds it back up), so the climb is more rhythm than tension. If playtesting says "just slow", steepen the climbs or shorten the ledges. Nitro saves ~4 s on the full climb, not the ~10 s in the doc. Run `node tools/level7_bot.js` to re-check after any change to the track.
  - The hairpins turn the camera by up to ~85 deg/s at 29 m/s (that is the car's own turn rate on a 24 m-radius bend); on tight bends the chase camera rises 3 m and pulls back 3 m so more of the switchback is visible.
- Per-car stats (top of game/js/physics.js: CAR_STATS): Police Car = light & flippy, Ambulance = huge nitro tank, Jeep = heavy & stable but loses speed on landings.
- Upgrade shop (Garage > Tune), per car: Engine (5 tiers), Nitro Tank (5), Landing Grip (4), Air Control (4). Multipliers: UPGRADES / UPGRADE_FX in physics.js.
- Cosmetics (Garage > Style), per car: Neon Underglow, Trails, Wheel Sparks.
- Progress is saved in your browser (localStorage).

## Level 5 fixes (camera + laser)
- Chase camera (`chaseCamera` in `game/js/game/game.js`): camera and look-at point are now smoothed separately, the camera leans toward the outside of the bend, roll is limited to 4 deg and the push-in on gas is much milder. The spiral still turns at about 30 deg/s because that is how fast the car itself turns.
- Laser gate at s = 1018 (`buildHazards` in `game/js/render/obstacles.js`): in the desert level it is now a tall striped gantry with a "LASER GATE" sign, thicker unfogged beams with a glow, and emitters that show green (safe), amber (about to fire) and red (on). The warning toast appears 110 m ahead instead of 75 m. Collision is unchanged. Other levels' lasers are unchanged.

## Tweak balance
Edit game/js/physics.js (CAR_STATS, UPGRADES costs, UPGRADE_FX) and game/js/core/config.js (COSMETICS prices), then refresh.

## Optional: full-stack version
`full-stack-optional/` has the original React + FastAPI project (Google login + online leaderboard). It needs Python and MongoDB; ignore it if you only want to play.

## Stages (Earth + Mars)
- Main menu > **Stages** opens the stage select: **Earth** (levels 1-8) and **Mars** (levels 9-16). Mars unlocks after you finish Earth level 8 ("Go to Mars" on the results screen).
- Mars reuses the 8 Earth tracks, hazards and physics with a red-dust re-skin (sky, fog, road, scenery tint, Phobos/Deimos moons) and 1.5x coin rewards. Config: `WORLDS`, `MARS_NAMES` and the Mars generator in `game/js/core/config.js`; scenery tint in `marsTint()` (`game/js/render/level.js`); stage menu in `game/js/ui/ui.js` (`buildStages`) and `game/css/stages.css`.

## Levels 11 & 12: low gravity + METEOR STORM
- **Level 11 "Meteor Alley"** and **Level 12 "Ares Storm"** (Mars stage) are new low-gravity tracks (same Mars gravity as 9 and 10, `buildLevel11/12` in `game/js/physics.js`, `gravity` in `LEVELS[11/12]`). Flip buttons (Z / C) work there too.
- **New hazard: continuous falling meteor rocks.** A storm front chases the car (`game/js/core/storm.js`, drawn by `game/js/render/meteors.js`). Red warning rings show where each rock will land. A rock that hits you costs speed (-15% on the ground, -5% in the air), some nitro and gives you 1.6 s of protection; it never crashes you.
- **Escape = NITRO + speed.** If you drive at plain gas speed the storm catches up and rocks hit you again and again; hit Nitro (Shift / N / E, or the on-screen button) to pull away. The HUD box under the timer shows how far behind the storm is (green > amber > red "IN THE STORM - NITRO!"). Boost pads on the long flats help too.
- Rocks are harmless (cosmetic only) around every jump (calm zones), so a hit can never ruin a launch or a landing.
- Tuning: `meteors: { v, gapMax, rate }` in `LEVELS[11/12]` (v = storm speed in m/s, rate = rocks per second). More in `game/js/core/storm.js` (`DEFAULT`).
- `node tools/lowg_bot.js 11` / `12` checks the tracks; `node tools/meteor_bot.js 11` / `12` runs the storm with all 4 cars (plain gas vs. smart nitro) and counts hits.

## New car: Mars Hover (meteor runner)
- "blnk-100 concept hovering car" by DEDROX (Sketchfab, CC-BY-4.0), converted from the .glb to `game/js/data/hover.js` and drawn in `game/js/render/vehicle.js` (floats 0.3 m above the road and bobs). Garage price 2500 coins.
- Stats (`CAR_STATS.hover`): bigger/stronger nitro, floaty air control, soft landings, and a **meteor shield** (`meteorGuard` 0.65): meteor hits cost 65% less speed and nitro. Shown as the "Meteor shield" bar in the Garage.

## Levels 13 & 14: low gravity + METEOR STORM, and harder meteors everywhere
- **Level 13 "Meteor Spiral"** and **Level 14 "Polar Meteor Ramp"** now have Mars gravity (38%) and the meteor storm, like 11 and 12. They keep the Valles Spiral / Polar Mega Ramp tracks (lasers included); the Earth-gravity hoops were removed. Flip buttons (Z / C) work there too. Both use the SIDE camera like the other levels (level 13's spiral is drawn as a straight descent: `sideCam` in `LEVELS[13]`).
- **Faster, harder meteors (levels 11-14):** rocks fall faster (`FALL_T` 1.05 -> 0.8 s, shorter warning), the storm front is faster and denser (`meteors: { v, gapMax, rate }` in `LEVELS[11..14]`), a hit now costs ~34% speed on the ground (was 15%) and ~15% in the air (was 5%), drains 22% of the nitro tank (was 8%, `fuelLoss`), and protection after a hit is 1.3 s (was 1.6 s). The Mars Hover shield still cuts the damage by 65%.
- `node tools/lowg_bot.js 13|14` and `node tools/meteor_bot.js 11|12|13|14` check the tracks and storm.

## Levels 15 & 16: MARS COLD (new tracks, side camera)
- **Level 15 "Frostbite Spiral"** and **Level 16 "Absolute Zero"** replace the old Mars re-skins of Sky Climb / Lava Gauntlet. Both are low-gravity (38%) side-camera tracks with ramps, big launches, boost pads and **spiral climbs**: three terraced coils up a tower (two towers on 16), then a spiral descent. Glowing ice-spiral towers stand behind the climbs (`buildSpiralTowers` in `game/js/render/ice.js`); the road itself stays a 2D side-view track so the camera matches every other level.
- **Cold makes the cars lose control** (`coldK` in `Car.step`, `game/js/physics.js`): the engine stutters, the tyres slide (random push along the road) and the chassis wobbles on the ground and in the air.
- **Freeze timer** (HUD box under the timer, `game/js/render/cold.js`, `cold: { k, time, cp, pad, retry }` in `LEVELS[15/16]`): when it hits 0 the engine stops (no gas, no nitro) and you crash with "Engine frozen" if you cannot coast home. **Each checkpoint adds 6 s and each boost pad 2 s** (a restart from a checkpoint thaws you to at least 20 s). Frost creeps over the screen as time runs out.
- **Mars Hover is the cold runner**: `coldGuard` 0.85 (cuts the slide/wobble by 85% and the freeze drain by ~38%) and `coldBoost` 0.5 (stronger acceleration and top speed in the cold). Shown as "Cold grip" in the Garage. The bot finishes level 15 with ~41 s left on the timer with the Hover versus ~10-20 s with the other cars.
- `node tools/cold_bot.js 15|16` runs all five cars with the freeze timer.

## Stage 3: THE MOON (levels 17 & 18) + improved Stages screen
- **Stages screen redesigned**: three stage cards (Earth, Mars, Moon) with their own planet art, gravity badge, feature tags, difficulty bars, progress bar, star count, "YOU ARE HERE" / "COMPLETE" ribbons, a "next up" level name and a clear unlock requirement on locked stages. The level screen shows the stage blurb and gravity, with a Moon theme. Config: `WORLDS` in `game/js/core/config.js`; UI in `game/js/ui/ui.js` (`buildStages`, `drawPlanet`); styles in `game/css/stages.css`.
- **Moon unlocks after you finish Mars level 16** ("Go to Moon" on the results screen). Moon coins pay x2 (Mars x1.5).
- **Level 17 "Tranquility Hop"** and **Level 18 "Tycho Crater Run"**: Moon gravity (17% of Earth, `Phys.MOON_G`), so jumps are huge (100-180 m gaps), flips are very long and flip buttons (Z / C) work. Level 17 = five big leaps, a platform hop and a crater roll. Level 18 = deep craters (new `ease.crater` track piece), stepping stones, a giant launch and the **micro-meteor storm** from Mars 11-14 (outrun it with nitro). Tracks: `buildLevel17/18` in `game/js/physics.js`.
- **Moon look** (`game/js/render/moon.js`): cratered regolith floor, basalt cliffs, boulders, lunar lander, black star sky with Earth and a hard sun, far crater rims, "MOON/LEAP" and "TYCHO/GIANT" signs.
- `node tools/lowg_bot.js 17` / `18` runs the bot with all 5 cars (plain / nitro / flips): all finish.

## Stage transition
- Travelling to a different stage (Go to Mars / Go to Moon on the results screen, or picking a level in another stage) plays a ~3 s rocket-launch screen with the stage names, then starts the level. Code: `stageTravel` in `game/js/ui/ui.js`, markup `#warp` in `index.html`, styles `game/css/warp.css`. Skipped when "reduce motion" is on.

## Tycho Crater Run: laser gates + closing airlock doors
- Level 18 now has 4 laser gates and 4 **AIRLOCK DOORS** (`HAZARDS[18]` in `game/js/core/config.js`), all on flat stretches away from take-offs and landings. Lasers: cross when they turn off (emitters green = safe, amber = about to fire, red = on).
- **Closing doors** (new hazard `door`, `doorK` / `DOOR_T` / `DOOR_H` in `game/js/render/obstacles.js`): two steel panels slide shut across the road every 3 s. The lintel lights go green (open), amber (about to close), red (closed). Hitting a closed door crashes you ("Crushed by a closing door"); doors are 8.2 m tall, so you cannot jump them. Wait or time your nitro to cross while they are open.

## Stage 3 update: Levels 19 & 20 + ending cutscene
- **Level 19 "Mare Ascent"**: ramp stairs, a spiral tower climb (3 coils to 27 m), a huge tower launch, a spiral descent, a crater and a giant final ramp. Lasers and airlock doors on the flats.
- **Level 20 "Moon Collapse"** (hardest): the Moon is falling apart (screen tremors, glowing cracks, boulders drifting off the ground, heavy meteor storm). Two spiral towers (27 m and 36 m), chained ramps, craters, giant launches and hazards, ending at the Hover launch pad.
- **Level 20 requires the Mars Hover**: you must own it (Garage, 2500 coins) AND have it selected. Otherwise a message tells you what to do and the level will not start.
- **Ending cutscene** (`game/js/game/cutscene.js`, three.js, ~33 s): countdown, the Hover ignites and lifts off, the Moon crumbles away below, it flies off toward Earth, then the credits roll. Skip button available; "Watch ending" button on the results screen replays it.
- Tracks: `buildLevel19/20` in `game/js/physics.js`. Bot check: `node tools/lowg_bot.js 19` / `20` (all 5 cars finish).
- Gold Hover Trophy: finishing Level 20 with 3 stars once awards 3000 coins and a gold badge (results screen + Garage hover card).
- Collapse Chasm (Level 20): a black void wall with a glowing edge (`game/js/render/chasm.js`) chases you at 18 m/s after a 4 s grace (starts 70 m behind, speeds up if you fall far ahead). Touching it crashes you (retry from checkpoint resets it to 70 m). A HUD bar shows the gap; use NITRO to stay ahead. Tune in the CHASM constant.
- Falling road: just ahead of the Level 20 chasm wall the road shows glowing cracks and slabs break off and tumble into the void (`updateRoadBreak` in `chasm.js`).

## Latest update: offline + mobile landscape
- Removed the "Unlock all" button from the Stages screen.
- Offline: the game is now an installable PWA (`sw.js`, `manifest.webmanifest`, icons). Open it ONCE over https (or localhost) while online, then "Add to Home Screen"; after that every file is cached and it runs with no internet. Progress (levels, coins, cars) is saved on the phone in localStorage and the browser is asked to keep it permanently (`game/js/core/pwa.js`).
- On-screen buttons show only on touch devices in landscape; hidden in portrait (the "Rotate your phone" screen shows) and on desktop (keyboard).
- The optional full-stack folder was removed from this zip.
- When you change game files, bump `CACHE` in `sw.js` (e.g. turbo-drive-v2) so phones fetch the update.

## Haptics
Phones vibrate on nitro, landings (soft/hard) and crashes (Settings > shake toggle turns it off). Works in Android Chrome / the installed app; iOS Safari does not allow web vibration.

## Intro splash
Every launch starts with "A LITTLE HEARTS PRODUCTION" (logo + title fade/zoom in) and a typewriter "Developed by AkhilBoss"; all fade out at 6 s, then the loading screen and main menu. Files: game/js/core/intro.js, game/css/intro.css, game/assets/logo.png.
