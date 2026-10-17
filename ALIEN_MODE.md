# Alien chase (all levels)
- A flying saucer (game/assets/models/ufo.glb, Flying saucer by Poly by Google) follows the player in every level (Earth, Mars, Moon, Deep Space). It hovers behind the vehicle and falls back / closes in with your speed, and creeps closer as you progress and crash (warnings at 35% and 70%). Spooky synthesized hum while chasing, zap sound when it catches you.
- Hit anything (wall, bad landing, laser, barrier, asteroid, fall...) and the saucer swoops over you with a tractor beam: "ALIEN CAUGHT YOU!" then retry from checkpoint.
- Code: game/js/render/alien.js, game/css/alien.css. Hooks: index.html (script/css), game/js/game/loop.js (alienUpdate call).
- Run with any static server, e.g. `python3 -m http.server` in this folder.
- HUD radar (top-left): ALIEN meter + distance, turns red and pulses when it is close.
- Alien trails 30 m behind (creeps to ~20 m late in a level). If you stop (speed < 2.5 m/s for 1.2 s; in Deep Space: holding brake) it rushes in and attacks with zaps + screen shake until you move again, then falls back.
- UFO zaps (when you stop/idle) count as hits: 5 UFO hits = you die (counter hidden, resets on new race/retry). Constant: ALIEN_MAX_HITS in alien.js.
- Shield cars (meteorGuard) take reduced UFO damage: each hit adds 1 - meteorGuard; die at 5 total (Mars Hover ~15 hits, Jeep ~7, Ambulance ~7, Aero Hover ~6, others 5).

## Level 27 alien hunt (v35)
- Alien scouts use the Mixamo Walking.fbx (alien_walk.fbx) and Death From The Front.fbx (alien_death.fbx) animations; the death animation plays when an alien is killed.
- All alien/boss lasers are red (HUNT_RED in game/js/game/hunt.js).
- Medium difficulty: each scout dies in 3 hits (HUNT_HP in hunt.js).
- v37 tense mood: dark fog + red alert pulse when aliens aim at you, heartbeat + lock-on beeps, low-health red vignette, kill-streak/score HUD with bonus points (hunt.js huntMood, hunt.css). Aliens flank and shoot slightly faster (still 3 hits).
- v38: 16 translucent ice walls/crystal clusters added as extra cover (block lasers and line of sight).
- v39: alien walk uses the astronaut Mixamo walk retargeted to the alien skeleton (the uploaded Walking/Death FBX have no leg keys); death is a procedural fall; no base healing and cover blocks player shots in Level 27.
- v40: DOME SHIELD + 3 HEALTH BARS. Standing inside the base dome (radius ~5.9 m around BASE_AT) makes you untouchable: laser bolts burst on the glass (hunt.js huntBolts), aliens cannot walk inside (huntSlide) and you can still shoot out. HUD shows "DOME SHIELD". You have 3 health bars (HUNT_LIVES, HUD "BARS" row): each time health hits 0 you lose a bar and respawn with your kills kept; losing the 3rd bar restarts Level 27 from the beginning.
- v41: Boss arrival freeze fixed (fog colour bug threw an error every frame). Boss now says "I WILL NOT LEAVE YOU, <profile name>!" (name from the sign-in profile, fallback "Astronaut"). After the 12 kills you run to the hover, board it, and a cinematic launch (engine flames, lift-off, climb, flash, "ESCAPED INTO SPACE") ends the level. The old 4-gate hover chase is no longer used.
