# Turbo Drive - 3D Online Shooting Duel (first to 40 kills)

1. Install Python 3.9+ then:  cd server && pip install -r requirements.txt
2. Start:  uvicorn shoot_server:app --host 0.0.0.0 --port 8001
   (or run start.sh / start.bat from this folder)
3. Open http://localhost:8001 in two browser windows/devices -> Duel -> Shooting.
   - Find Match = random opponent (first to 40 kills).
   - Private Room = you get a 5-letter code; your friend picks Join Room and types it. The host picks 10 / 20 / 40 kills, then presses Start Duel.
   Friends on your network: http://YOUR_LAN_IP:8001. Over the internet: host the server and share its URL.

Rules: each kill = 100 HP of damage. Killed players respawn after 1.5s with 2s spawn protection.
First player to 40 kills wins. Server-authoritative (see server/shoot_server.py, KILLS_TO_WIN).
Controls: A/D move, W/Space jump, mouse aim + click (or F) shoot. Touch: on-screen buttons.
