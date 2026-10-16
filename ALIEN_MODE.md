# Alien chase (all levels)
- A flying saucer (game/assets/models/ufo.glb, Flying saucer by Poly by Google) follows the player in every level (Earth, Mars, Moon, Deep Space). It hovers behind the vehicle and falls back / closes in with your speed, and creeps closer as you progress and crash (warnings at 35% and 70%). Spooky synthesized hum while chasing, zap sound when it catches you.
- Hit anything (wall, bad landing, laser, barrier, asteroid, fall...) and the saucer swoops over you with a tractor beam: "ALIEN CAUGHT YOU!" then retry from checkpoint.
- Code: game/js/render/alien.js, game/css/alien.css. Hooks: index.html (script/css), game/js/game/loop.js (alienUpdate call).
- Run with any static server, e.g. `python3 -m http.server` in this folder.
- HUD radar (top-left): ALIEN meter + distance, turns red and pulses when it is close.
- Alien trails 30 m behind (creeps to ~20 m late in a level). If you stop (speed < 2.5 m/s for 1.2 s; in Deep Space: holding brake) it rushes in and attacks with zaps + screen shake until you move again, then falls back.
- UFO zaps (when you stop/idle) count as hits: 5 UFO hits = you die (counter hidden, resets on new race/retry). Constant: ALIEN_MAX_HITS in alien.js.
- Shield cars (meteorGuard) take reduced UFO damage: each hit adds 1 - meteorGuard; die at 5 total (Mars Hover ~15 hits, Jeep ~7, Ambulance ~7, Aero Hover ~6, others 5).
