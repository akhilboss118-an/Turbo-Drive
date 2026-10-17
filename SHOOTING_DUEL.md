# Duel: Race + 1v1 / 1v1v1 Shooting (v45)
Menu > Duel > pick **Race** or **Shooting** > Create/Join room with a 5-letter code.
Shooting: host picks 1v1 or 1v1v1 (3-player free-for-all). Everyone can kill everyone; first to 40 kills wins. A/D move, W/Space jump, mouse aim + click (or F) to shoot. Touch: on-screen buttons, auto-aim.
Server (needed for Shooting): `cd server && pip install -r requirements.txt && uvicorn shoot_server:app --host 0.0.0.0 --port 8001`
Point the game at it with `?shoot=http://YOUR_HOST:8001` or edit TD_SHOOT_SERVER in game/js/core/server-config.js.
