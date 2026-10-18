"""Turbo Drive 3D online shooting duel: quick-match queue + server-authoritative health over WebSocket."""
import base64
import hashlib
import hmac
import json
import math
import os
import random
import time

from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect

MAX_HP = 100
HIT_DMG = 7
MIN_HIT_GAP = 0.09
START_GRACE = 3.0
MAX_RANGE = 130.0
KILLS_TO_WIN = 40
DEATH_TIME = 1.5
SPAWN_PROTECT = 2.0
router = APIRouter()
QUEUE = []
ROOMS = {}
CODES = {}
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
LIMITS = (10, 20, 40)
QUIP_COUNT = 6
_seq = 0


def clean_nick(v):
    v = " ".join(str(v or "").split())[:16]
    return v or "Player"


def num(v, d=0.0):
    try:
        f = float(v)
        return f if math.isfinite(f) else d
    except (TypeError, ValueError):
        return d


class Player:
    def __init__(self, ws, nick):
        self.ws = ws
        self.nick = nick
        self.role = ""
        self.room = None
        self.hp = MAX_HP
        self.rematch = False
        self.pos = (0.0, 0.0)
        self.last_hit = 0.0
        self.kills = 0
        self.shots = 0
        self.hits = 0
        self.dead_until = 0.0
        self.safe_until = 0.0
        self.last_quip = 0.0

    async def send(self, msg):
        if self.ws is None:
            return
        try:
            await self.ws.send_text(json.dumps(msg))
        except Exception:
            self.ws = None


class Room:
    def __init__(self, a, b=None, code=""):
        global _seq
        _seq += 1
        self.id = _seq
        self.code = code
        self.kills_to_win = KILLS_TO_WIN
        self.players = {"host": a, "guest": b}
        a.role, a.room = "host", self
        if b is not None:
            b.role, b.room = "guest", self
        self.status = "lobby"
        self.winner = None
        self.t0 = 0.0
        self.duration = 0.0

    def pub(self):
        return {
            "id": self.id,
            "status": self.status,
            "winner": self.winner,
            "maxhp": MAX_HP,
            "kills_to_win": self.kills_to_win,
            "code": self.code,
            "duration": round(self.duration, 1),
            "private": bool(self.code),
            "players": [
                {"role": r, "nick": p.nick, "hp": p.hp, "kills": p.kills, "shots": p.shots, "hits": p.hits, "rematch": p.rematch, "connected": p.ws is not None}
                for r, p in self.players.items() if p is not None
            ],
        }

    def other(self, role):
        return self.players.get("guest" if role == "host" else "host")

    def members(self):
        return [p for p in self.players.values() if p is not None]

    async def broadcast(self, msg):
        for p in self.members():
            await p.send(msg)

    async def send_lobby(self):
        for r, p in self.players.items():
            if p is not None:
                await p.send({"t": "lobby", "role": r, "room": self.pub()})

    async def begin(self):
        self.status = "playing"
        self.winner = None
        self.t0 = time.time()
        for p in self.members():
            p.hp = MAX_HP
            p.rematch = False
            p.last_hit = 0.0
            p.kills = 0
            p.shots = 0
            p.hits = 0
            p.dead_until = 0.0
            p.safe_until = 0.0
        for r, p in self.players.items():
            if p is not None:
                await p.send({"t": "start", "role": r, "room": self.pub()})

    async def finish(self, winner, reason):
        if self.status != "playing":
            return
        self.status = "over"
        self.winner = winner
        self.duration = time.time() - self.t0
        for p in self.members():
            p.rematch = False
        await self.broadcast({"t": "over", "winner": winner, "reason": reason, "room": self.pub()})


async def drop(p):
    if p in QUEUE:
        QUEUE.remove(p)
    r = p.room
    p.ws = None
    if r is None:
        return
    left = r.other(p.role)
    if r.status == "lobby" and r.code:
        if p.role == "host":
            if left and left.ws:
                await left.send({"t": "closed"})
                left.room = None
            ROOMS.pop(r.id, None)
            CODES.pop(r.code, None)
        else:
            r.players["guest"] = None
            p.room = None
            await r.send_lobby()
        return
    if r.status == "playing":
        await r.finish(left.role if left and left.ws else None, "disconnect")
    elif left and left.ws:
        await left.send({"t": "opp_left", "room": r.pub()})
    if all(q.ws is None for q in r.members()):
        ROOMS.pop(r.id, None)
        if r.code:
            CODES.pop(r.code, None)


def new_code():
    while True:
        c = "".join(random.choice(CODE_CHARS) for _ in range(5))
        if c not in CODES:
            return c


async def try_match(p):
    QUEUE[:] = [q for q in QUEUE if q.ws is not None and q is not p]
    if QUEUE:
        a = QUEUE.pop(0)
        room = Room(a, p)
        ROOMS[room.id] = room
        await room.begin()
    else:
        QUEUE.append(p)
        await p.send({"t": "queued", "waiting": len(QUEUE)})


@router.websocket("/ws/shoot")
async def ws_shoot(ws: WebSocket):
    await ws.accept()
    me = None
    try:
        while True:
            try:
                m = json.loads(await ws.receive_text())
            except ValueError:
                continue
            t = m.get("t")
            if t == "ping":
                await ws.send_text(json.dumps({"t": "pong", "c": m.get("c")}))
            elif t == "create" and me is None:
                me = Player(ws, clean_nick(m.get("nick")))
                room = Room(me, None, new_code())
                ROOMS[room.id] = room
                CODES[room.code] = room
                await room.send_lobby()
            elif t == "join" and me is None:
                code = "".join(ch for ch in str(m.get("code") or "").upper() if ch.isalnum())
                room = CODES.get(code)
                if room is None or room.status != "lobby":
                    await ws.send_text(json.dumps({"t": "err", "msg": "Room not found. Check the code."}))
                elif room.players["guest"] is not None:
                    await ws.send_text(json.dumps({"t": "err", "msg": "That room is already full."}))
                else:
                    me = Player(ws, clean_nick(m.get("nick")))
                    me.role, me.room = "guest", room
                    room.players["guest"] = me
                    await room.send_lobby()
            elif t == "quick" and me is None:
                me = Player(ws, clean_nick(m.get("nick")))
                await try_match(me)
            elif me is None:
                continue
            elif t == "cancel" and me.room is None:
                if me in QUEUE:
                    QUEUE.remove(me)
                me = None
            elif me.room is None:
                continue
            elif t == "limit" and me.role == "host" and me.room.status == "lobby" and me.room.code:
                n = int(num(m.get("n"), 0))
                if n in LIMITS:
                    me.room.kills_to_win = n
                    await me.room.send_lobby()
            elif t == "begin" and me.role == "host" and me.room.status == "lobby" and me.room.code:
                if me.room.players["guest"] is not None:
                    await me.room.begin()
            elif t == "st" and me.room.status == "playing":
                me.pos = (num(m.get("x")), num(m.get("z")))
                o = me.room.other(me.role)
                if o:
                    await o.send({"t": "opp", "x": m.get("x"), "y": m.get("y"), "z": m.get("z"), "yw": m.get("yw"),
                                  "an": m.get("an"), "sp": m.get("sp")})
            elif t == "rtc":
                o = me.room.other(me.role)
                if o and isinstance(m.get("d"), dict) and me.room.status in ("playing", "over"):
                    await o.send({"t": "rtc", "d": m["d"]})
            elif t == "quip" and me.room.status in ("playing", "over"):
                i = int(num(m.get("i"), -1))
                o = me.room.other(me.role)
                now = time.time()
                if o and 0 <= i < QUIP_COUNT and now - me.last_quip >= 0.8:
                    me.last_quip = now
                    await o.send({"t": "quip", "i": i})
            elif t == "shot" and me.room.status == "playing":
                me.shots += 1
                o = me.room.other(me.role)
                if o:
                    await o.send({"t": "oshot", "f": m.get("f"), "to": m.get("to")})
            elif t == "hit" and me.room.status == "playing":
                r = me.room
                now = time.time()
                o = r.other(me.role)
                if o is None or now - r.t0 < START_GRACE or now - me.last_hit < MIN_HIT_GAP or now < me.dead_until or now < o.dead_until or now < o.safe_until:
                    continue
                if math.hypot(me.pos[0] - o.pos[0], me.pos[1] - o.pos[1]) > MAX_RANGE:
                    continue
                me.last_hit = now
                me.hits += 1
                o.hp = max(0, o.hp - HIT_DMG)
                if o.hp > 0:
                    await r.broadcast({"t": "hp", "by": me.role, "victim": o.role, "room": r.pub()})
                else:
                    me.kills += 1
                    o.hp = MAX_HP
                    o.dead_until = now + DEATH_TIME
                    o.safe_until = o.dead_until + SPAWN_PROTECT
                    await r.broadcast({"t": "kill", "by": me.role, "victim": o.role, "room": r.pub()})
                    if me.kills >= r.kills_to_win:
                        await r.finish(me.role, "kills")
            elif t == "rematch" and me.room.status == "over":
                me.rematch = bool(m.get("on"))
                r = me.room
                await r.broadcast({"t": "room", "room": r.pub()})
                if all(q.rematch and q.ws is not None for q in r.members()):
                    await r.begin()
            elif t == "leave":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if me is not None:
            await drop(me)


@router.get("/shoot/health")
async def shoot_health():
    return {"ok": True, "queue": len(QUEUE), "rooms": len(ROOMS), "hp": MAX_HP, "dmg": HIT_DMG, "kills_to_win": KILLS_TO_WIN}


@router.get("/shoot/ice")
async def shoot_ice():
    """STUN + optional TURN relay for voice chat. Set TURN_URLS (comma list) plus TURN_SECRET (coturn static-auth-secret, short-lived creds)
    or TURN_USERNAME / TURN_CREDENTIAL (fixed creds)."""
    servers = [{"urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]}]
    urls = [u.strip() for u in os.environ.get("TURN_URLS", "").split(",") if u.strip()]
    if urls:
        secret = os.environ.get("TURN_SECRET", "")
        if secret:
            user = str(int(time.time()) + 6 * 3600)
            cred = base64.b64encode(hmac.new(secret.encode(), user.encode(), hashlib.sha1).digest()).decode()
        else:
            user, cred = os.environ.get("TURN_USERNAME", ""), os.environ.get("TURN_CREDENTIAL", "")
        servers.append({"urls": urls, "username": user, "credential": cred})
    return {"iceServers": servers}


app = FastAPI()
try:
    from starlette.middleware.cors import CORSMiddleware
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
except Exception:
    pass
app.include_router(router, prefix="/api")

try:
    from starlette.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), html=True), name="game")
except Exception:
    pass
