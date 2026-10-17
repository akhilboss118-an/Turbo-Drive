"""Turbo Drive 3D online shooting duel: quick-match queue + server-authoritative health over WebSocket."""
import json
import math
import time

from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect

MAX_HP = 100
HIT_DMG = 7
MIN_HIT_GAP = 0.09
START_GRACE = 3.0
MAX_RANGE = 130.0
router = APIRouter()
QUEUE = []
ROOMS = {}
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

    async def send(self, msg):
        if self.ws is None:
            return
        try:
            await self.ws.send_text(json.dumps(msg))
        except Exception:
            self.ws = None


class Room:
    def __init__(self, a, b):
        global _seq
        _seq += 1
        self.id = _seq
        self.players = {"host": a, "guest": b}
        a.role, b.role = "host", "guest"
        a.room = b.room = self
        self.status = "lobby"
        self.winner = None
        self.t0 = 0.0

    def pub(self):
        return {
            "id": self.id,
            "status": self.status,
            "winner": self.winner,
            "maxhp": MAX_HP,
            "players": [
                {"role": r, "nick": p.nick, "hp": p.hp, "rematch": p.rematch, "connected": p.ws is not None}
                for r, p in self.players.items()
            ],
        }

    def other(self, role):
        return self.players.get("guest" if role == "host" else "host")

    async def broadcast(self, msg):
        for p in list(self.players.values()):
            await p.send(msg)

    async def begin(self):
        self.status = "playing"
        self.winner = None
        self.t0 = time.time()
        for p in self.players.values():
            p.hp = MAX_HP
            p.rematch = False
            p.last_hit = 0.0
        for r, p in self.players.items():
            await p.send({"t": "start", "role": r, "room": self.pub()})

    async def finish(self, winner, reason):
        if self.status != "playing":
            return
        self.status = "over"
        self.winner = winner
        for p in self.players.values():
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
    if r.status == "playing":
        await r.finish(left.role if left and left.ws else None, "disconnect")
    elif left and left.ws:
        await left.send({"t": "opp_left", "room": r.pub()})
    if all(q.ws is None for q in r.players.values()):
        ROOMS.pop(r.id, None)


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
            elif t == "st" and me.room.status == "playing":
                me.pos = (num(m.get("x")), num(m.get("z")))
                o = me.room.other(me.role)
                if o:
                    await o.send({"t": "opp", "x": m.get("x"), "y": m.get("y"), "z": m.get("z"), "yw": m.get("yw"),
                                  "an": m.get("an"), "sp": m.get("sp")})
            elif t == "shot" and me.room.status == "playing":
                o = me.room.other(me.role)
                if o:
                    await o.send({"t": "oshot", "f": m.get("f"), "to": m.get("to")})
            elif t == "hit" and me.room.status == "playing":
                r = me.room
                now = time.time()
                o = r.other(me.role)
                if o is None or now - r.t0 < START_GRACE or now - me.last_hit < MIN_HIT_GAP or me.hp <= 0 or o.hp <= 0:
                    continue
                if math.hypot(me.pos[0] - o.pos[0], me.pos[1] - o.pos[1]) > MAX_RANGE:
                    continue
                me.last_hit = now
                o.hp = max(0, o.hp - HIT_DMG)
                await r.broadcast({"t": "hp", "by": me.role, "victim": o.role, "room": r.pub()})
                if o.hp <= 0:
                    await r.finish(me.role, "ko")
            elif t == "rematch" and me.room.status == "over":
                me.rematch = bool(m.get("on"))
                r = me.room
                await r.broadcast({"t": "room", "room": r.pub()})
                if all(q.rematch and q.ws is not None for q in r.players.values()):
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
    return {"ok": True, "queue": len(QUEUE), "rooms": len(ROOMS), "hp": MAX_HP, "dmg": HIT_DMG}


app = FastAPI()
try:
    from starlette.middleware.cors import CORSMiddleware
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
except Exception:
    pass
app.include_router(router, prefix="/api")
