# Duel: Race + 1v1 / 1v1v1 Shooting (v45)
Menu > Duel > pick **Race** or **Shooting** > Create/Join room with a 5-letter code.
Shooting: host picks 1v1 or 1v1v1 (3-player free-for-all). Everyone can kill everyone; first to 40 kills wins (killed players respawn after 1.5s with 2s spawn protection; server-authoritative). A/D move, W/Space jump, mouse aim + click (or F) to shoot. Touch: on-screen buttons, auto-aim.
Server (needed for Shooting): `cd server && pip install -r requirements.txt && uvicorn shoot_server:app --host 0.0.0.0 --port 8001`
Point the game at it with `?shoot=http://YOUR_HOST:8001` or edit TD_SHOOT_SERVER in game/js/core/server-config.js.

Private rooms (v49): Shooting > Private Room gives a 5-letter code; friend uses Join Room. Host picks 10/20/40 kills in the lobby, then Start Duel. Quick match is always first to 40.

Voice chat (v52): in a Shooting duel the browser asks for microphone access when the match starts. Voice is live peer-to-peer (WebRTC) between the two players, never recorded or stored.
Duel screen panel: mic button (MIC ON / MUTED / NO MIC ACCESS), speaking indicator + volume slider for the opponent, opponent-mute button. Keys: M = mic on/off, V = mute opponent. Declining the mic still lets you hear the opponent.
Needs HTTPS or localhost for mic access. Signalling goes through the existing /api/ws/shoot socket ({t:"rtc"}). Strict networks: see the TURN relay section below.

TURN relay (v53): strict mobile / corporate networks block direct peer-to-peer, so voice needs a TURN relay there.
1. Run coturn: edit server/turn/turnserver.conf (public IP, domain, secret) then `cd server/turn && docker compose up -d` (open UDP/TCP 3478 and UDP 49160-49200).
2. Start the game server with env vars (same secret):
   TURN_URLS="turn:YOUR_DOMAIN:3478?transport=udp,turn:YOUR_DOMAIN:3478?transport=tcp" TURN_SECRET="YOUR_SECRET" uvicorn shoot_server:app --host 0.0.0.0 --port 8001
   (or a fixed login: TURN_USERNAME / TURN_CREDENTIAL instead of TURN_SECRET). With TURN_SECRET the server hands each player short-lived (6h) credentials.
3. Clients fetch /api/shoot/ice automatically; check it with: curl http://YOUR_HOST:8001/api/shoot/ice
Hosted TURN services (Metered, Twilio, Cloudflare) also work: put their URLs + credentials in TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL.

Quick chat (v54): in a Shooting duel, tap one of the quick lines on the left ("Nice shot!", "Good game", "Too easy", "Watch out!", "Oops, sorry", "Rematch?") or press keys 1-6. The line pops up at the top of the opponent's screen for ~3s. Lines are fixed (index-based), rate-limited by the server (1 per 0.8s) and work during the match and on the result screen.
