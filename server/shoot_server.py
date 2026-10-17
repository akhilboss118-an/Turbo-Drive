"""Turbo Drive 1v1 shooting duel: room + relay WebSocket server (first to KILL_TARGET kills wins)."""
import json
import random
import string
import time

from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect

KILL_TARGET = 40
ROOM_TTL = 60 * 60
router = APIRouter()
ROOMS = {}


ROLES = ["host", "guest", "guest2"]


def new_code():
    while True:
        c = "".join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(5))
        if c not in ROOMS:
            return c


class Room:
    def __init__(self, code):
        self.code = code
        self.status = "lobby"
        self.players = {}
        self.cap = 2
        self.created = time.time()
        self.winner = None

    def pub(self):
        return {
            "code": self.code,
            "status": self.status,
            "target": KILL_TARGET,
            "cap": self.cap,
            "winner": self.winner,
            "players": [
                {"role": r, "nick": p["nick"], "ready": p["ready"], "kills": p["kills"],
                 "rematch": p["rematch"], "connected": p["ws"] is not None}
                for r, p in self.players.items()
            ],
        }

    def others(self, role):
        return [r for r in self.players if r != role]

    async def send(self, role, msg):
        p = self.players.get(role)
        if p and p["ws"] is not None:
            try:
                await p["ws"].send_text(json.dumps(msg))
            except Exception:
                p["ws"] = None

    async def broadcast(self, msg):
        for r in list(self.players):
            await self.send(r, msg)

    async def finish(self, winner, reason):
        self.status = "over"
        self.winner = winner
        for p in self.players.values():
            p["ready"] = False
            p["rematch"] = False
        await self.broadcast({"t": "over", "winner": winner, "reason": reason, "room": self.pub()})

    async def begin(self):
        self.status = "playing"
        self.winner = None
        for p in self.players.values():
            p["kills"] = 0
            p["ready"] = False
            p["rematch"] = False
        await self.broadcast({"t": "start", "room": self.pub(), "target": KILL_TARGET})


def clean_nick(v):
    v = " ".join(str(v or "").split())[:16]
    return v or "Player"


async def drop(room, role):
    p = room.players.get(role)
    if not p:
        return
    if room.status == "playing":
        room.players.pop(role, None)
        left = list(room.players)
        if len(left) < 2:
            await room.finish(left[0] if left else None, "disconnect")
        else:
            await room.broadcast({"t": "opp_left", "r": role, "room": room.pub()})
        return
    if room.status == "over":
        room.players.pop(role, None)
        if not room.players:
            ROOMS.pop(room.code, None)
        else:
            await room.broadcast({"t": "room", "room": room.pub()})
            await room.broadcast({"t": "opp_left"})
        return
    if role == "host":
        await room.broadcast({"t": "room_closed", "reason": "host_left"})
        ROOMS.pop(room.code, None)
    else:
        room.players.pop(role, None)
        room.status = "lobby"
        for p in room.players.values():
            p["ready"] = False
            p["rematch"] = False
        await room.broadcast({"t": "room", "room": room.pub()})


@router.websocket("/ws/shoot")
async def ws_shoot(ws: WebSocket):
    await ws.accept()
    room = None
    role = None
    for k in [k for k, r in ROOMS.items() if time.time() - r.created > ROOM_TTL]:
        ROOMS.pop(k, None)
    try:
        while True:
            try:
                m = json.loads(await ws.receive_text())
            except ValueError:
                continue
            t = m.get("t")
            if t == "ping":
                await ws.send_text(json.dumps({"t": "pong", "c": m.get("c")}))
            elif t == "create" and room is None:
                room = Room(new_code())
                role = "host"
                room.players["host"] = {"ws": ws, "nick": clean_nick(m.get("nick")), "ready": False, "kills": 0, "rematch": False}
                ROOMS[room.code] = room
                await ws.send_text(json.dumps({"t": "joined", "role": role, "code": room.code, "room": room.pub()}))
            elif t == "join" and room is None:
                code = str(m.get("code", "")).upper().strip()
                r = ROOMS.get(code)
                if not r:
                    await ws.send_text(json.dumps({"t": "error", "code": "ROOM_NOT_FOUND", "msg": "Room not found. Check the code."}))
                elif len(r.players) >= r.cap or r.status != "lobby":
                    await ws.send_text(json.dumps({"t": "error", "code": "ROOM_FULL", "msg": "That room is full."}))
                else:
                    room = r
                    role = next(x for x in ROLES if x not in r.players)
                    room.players[role] = {"ws": ws, "nick": clean_nick(m.get("nick")), "ready": False, "kills": 0, "rematch": False}
                    await ws.send_text(json.dumps({"t": "joined", "role": role, "code": room.code, "room": room.pub()}))
                    await room.broadcast({"t": "room", "room": room.pub()})
            elif room is None:
                continue
            elif t == "ready" and room.status == "lobby":
                room.players[role]["ready"] = bool(m.get("ready"))
                await room.broadcast({"t": "room", "room": room.pub()})
                if len(room.players) == room.cap and all(p["ready"] for p in room.players.values()):
                    await room.begin()
            elif t == "cap" and room.status == "lobby" and role == "host":
                cap = 3 if m.get("cap") == 3 else 2
                if len(room.players) <= cap:
                    room.cap = cap
                    for p in room.players.values():
                        p["ready"] = False
                    await room.broadcast({"t": "room", "room": room.pub()})
            elif t == "st" and room.status == "playing":
                for o in room.others(role):
                    await room.send(o, {"t": "opp", "r": role, "x": m.get("x"), "y": m.get("y"), "vx": m.get("vx"), "vy": m.get("vy"),
                                              "f": m.get("f"), "a": m.get("a"), "hp": m.get("hp"), "al": m.get("al")})
            elif t == "shot" and room.status == "playing":
                for o in room.others(role):
                    await room.send(o, {"t": "oshot", "r": role, "id": m.get("id"), "x": m.get("x"), "y": m.get("y"), "a": m.get("a")})
            elif t == "dead" and room.status == "playing":
                killer = m.get("by")
                if killer in room.players and killer != role:
                    room.players[killer]["kills"] += 1
                    k = room.players[killer]["kills"]
                    await room.broadcast({"t": "score", "killer": killer, "victim": role, "room": room.pub()})
                    if k >= KILL_TARGET:
                        await room.finish(killer, "kills")
            elif t == "rematch" and room.status == "over":
                room.players[role]["rematch"] = bool(m.get("on"))
                await room.broadcast({"t": "room", "room": room.pub()})
                if len(room.players) == room.cap and all(p["rematch"] for p in room.players.values()):
                    await room.begin()
            elif t == "leave":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if room is not None and role in room.players and room.players[role]["ws"] is ws:
            await drop(room, role)


@router.get("/shoot/health")
async def shoot_health():
    return {"ok": True, "rooms": len(ROOMS), "target": KILL_TARGET}


app = FastAPI()
try:
    from starlette.middleware.cors import CORSMiddleware
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
except Exception:
    pass
app.include_router(router, prefix="/api")
