# Infinite Loop circuit (Duel > Race mode, 5 laps)

- New track "LEVEL 21 INFINITE LOOP" (closed circuit traced from your map, bridge crossing, ~1980 m per lap). Duel-only, not in single-player.
- Duel > Create Room > Mode "Race": Infinite Loop is the default track and has **5 laps** (the other race tracks keep 3). Host can switch tracks with the arrows.
- Obstacles that slow you down: oil slicks, sand patches, mud pits (speed pulled down while you are on them) and traffic cones (knocked over, -38% speed). Warning signs before each; toasts on lap 1. Boost pads give speed/nitro back.
- Files: game/js/loop-track.js (path + layout), game/js/render/circuit.js (scenery + obstacles), physics.js (buildLevel21, slow zones), server/duel.py (laps per track).
- IMPORTANT: redeploy the updated server/duel.py to your duel server (TD_LIVE_SERVER in game/js/core/server-config.js), otherwise the old server only knows 3-lap tracks 1/5/7.
- Then: npm run build (copies to www), cap sync android.
