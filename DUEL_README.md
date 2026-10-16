# Turbo Drive - Duel Race (online)

HOW IT WORKS
1. Main menu -> "Duel Race". Type a nickname (no login).
2. Create Room -> you get a 5-character code (Copy / Share). Friend taps Join Room and types it.
3. Lobby: both see nicknames + cars. Host picks the level (unlocked ones, not level 20). Both tap Ready.
4. Both screens run the same 3-2-1 countdown and start together. Each drives their own car on their own copy of the track.
5. HUD shows a progress bar with both nicknames + a semi-transparent ghost of the opponent's real car (10 updates/sec).
6. First to cross the finish wins. Loser sees "Opponent finished" and can keep driving. Result screen: Winner / You lost, both times, Rematch, Leave.
7. Drop for more than 15 s = other player wins. Leaving mid-race = loss. No coins/stars/unlocks in duels.

SERVER
Duels need the server (server/duel.py, FastAPI WebSocket at /api/ws/duel). Single-player stays offline.
Edit game/js/core/server-config.js -> TD_LIVE_SERVER = your live server URL (needed for the Android app / ZIP opened locally).
Then: npm run build   (copies to www)  ->  npx cap sync android  ->  build the APK in Android Studio.
NOTE: turbo-drive.apk was NOT rebuilt here (no Android SDK in this environment). Build it with the steps above.

RACE MODE (3 LAPS) - added
- In the lobby the host picks Mode: "Duel" (old behaviour, any unlocked level) or "Race - 3 Laps".
- Race mode has 3 tracks (existing levels, no new maps): Level 1 Sunset Run (hills/jumps), Level 5 Spiral Descent (spiral), Level 7 Sky Climb (hairpins). Host picks with the arrows in the lobby.
- A TRACK MAP (drawn from the real loaded track: top-down plan + elevation profile, start/checkpoints/finish) shows in the lobby, and a live mini-map with both players' dots shows during the race.
- Crossing the finish gate on lap 1 or 2 sends your car back to the start line (speed kept) and starts the next lap; checkpoints reset each lap.
- First player to finish lap 3 wins. HUD shows "LAP x/3"; the progress bar and the opponent bar track total race progress (all 3 laps).
- Changed files: server/duel.py, game/js/duel/duel.js, game/js/game/game.js, game/js/game/loop.js, index.html, game/css/duel.css, sw.js (cache v7).
