"""Turbo Drive - online duel race rooms (two players, WebSocket relay).

Rooms live in memory (single backend process). The server relays progress,
runs the synchronized start and decides the winner from who reports finishing first.
"""
import asyncio
import json
import logging
import random
import time
from typing import Dict, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("duel")
router = APIRouter()

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LEN = 5
COUNTDOWN_MS = 3300          # lead time between "start" and GO
DISCONNECT_LIMIT = 15.0      # seconds a player may be gone before the other wins
LOBBY_IDLE_LIMIT = 15 * 60   # lobby rooms with no activity expire
ROOM_MAX_AGE = 60 * 60       # hard cap for any room
MIN_LEVEL, MAX_LEVEL = 1, 19  # level 20 needs the Mars Hover, so it is not in duels
MAX_MSG = 4096
LOOP_LEVEL = 21              # Infinite Loop circuit (race only)
RACE_LEVELS = (LOOP_LEVEL, 1, 5, 7)   # race mode tracks: Infinite Loop (5 laps), Sunset Run, Spiral Descent, Sky Climb (3 laps)
RACE_LAPS = 3
LOOP_LAPS = 5


def race_laps(level: int) -> int:
    return LOOP_LAPS if level == LOOP_LEVEL else RACE_LAPS


def now() -> float:
    return time.time()


def now_ms() -> int:
    return int(time.time() * 1000)


class Player:
    def __init__(self, role: str, pid: str, nick: str, car: dict, ws: WebSocket):
        self.role = role
        self.pid = pid
        self.nick = nick
        self.car = car
        self.ws: Optional[WebSocket] = ws
        self.ready = False
        self.rematch = False
        self.connected = True
        self.disc_at = 0.0
        self.last_seen = now()
        self.finish_time: Optional[float] = None
        self.finished = False

    def public(self) -> dict:
        return {
            "role": self.role, "nick": self.nick, "car": self.car, "ready": self.ready,
            "rematch": self.rematch, "connected": self.connected,
            "finished": self.finished, "time": self.finish_time,
        }


class Room:
    def __init__(self, code: str):
        self.code = code
        self.created = now()
        self.activity = now()
        self.state = "lobby"  # lobby | countdown | racing | finished
        self.level = LOOP_LEVEL
        self.mode = "race"  # duel | race (laps on one track; Infinite Loop = 5 laps)
        self.duel_level = 1
        self.race_level = LOOP_LEVEL
        self.go_at = 0
        self.winner: Optional[str] = None
        self.reason: Optional[str] = None
        self.players: Dict[str, Player] = {}  # role -> Player

    def other(self, role: str) -> Optional[Player]:
        return self.players.get("guest" if role == "host" else "host")

    def public(self) -> dict:
        return {
            "code": self.code, "state": self.state, "level": self.level, "go_at": self.go_at,
            "mode": self.mode, "laps": race_laps(self.level) if self.mode == "race" else 1,
            "winner": self.winner, "reason": self.reason,
            "players": [p.public() for p in self.players.values()],
        }


ROOMS: Dict[str, Room] = {}


async def send(p: Optional[Player], msg: dict):
    if not p or not p.ws or not p.connected:
        return
    try:
        await p.ws.send_text(json.dumps(msg))
    except Exception:
        p.connected = False
        if not p.disc_at:
            p.disc_at = now()


async def broadcast(room: Room, msg: dict):
    for p in list(room.players.values()):
        await send(p, msg)


async def push_room(room: Room):
    await broadcast(room, {"t": "room", "room": room.public()})


def new_code() -> str:
    for _ in range(200):
        c = "".join(random.choice(CODE_ALPHABET) for _ in range(CODE_LEN))
        if c not in ROOMS:
            return c
    raise RuntimeError("no free room code")


def clean_nick(v) -> Optional[str]:
    if not isinstance(v, str):
        return None
    v = " ".join(v.split())[:16]
    return v or None


def clean_car(v) -> dict:
    if not isinstance(v, dict):
        return {"id": "gt", "name": "Red Bug", "model": "car5", "glow": None}
    return {
        "id": str(v.get("id", "gt"))[:12], "name": str(v.get("name", "Car"))[:24],
        "model": str(v.get("model", "car5"))[:8],
        "glow": (str(v["glow"])[:9] if v.get("glow") else None),
    }


def new_pid() -> str:
    return "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(16))


async def finish_room(room: Room, winner: str, reason: str):
    if room.state == "finished":
        return
    room.state = "finished"
    room.winner = winner
    room.reason = reason
    room.activity = now()
    for p in room.players.values():
        p.ready = False
        p.rematch = False
    await broadcast(room, {"t": "result", "winner": winner, "reason": reason, "room": room.public()})


async def start_countdown(room: Room):
    room.state = "countdown"
    room.go_at = now_ms() + COUNTDOWN_MS
    room.winner = None
    room.reason = None
    room.activity = now()
    for p in room.players.values():
        p.ready = False
        p.rematch = False
        p.finished = False
        p.finish_time = None
    await broadcast(room, {"t": "start", "go_at": room.go_at, "server_now": now_ms(), "level": room.level, "room": room.public()})


async def remove_player(room: Room, role: str, notify_reason: str = "left"):
    p = room.players.pop(role, None)
    if p and p.ws:
        try:
            await p.ws.close()
        except Exception:
            pass
    if role == "host" or not room.players:
        for q in list(room.players.values()):
            await send(q, {"t": "room_closed", "reason": notify_reason})
        ROOMS.pop(room.code, None)
        return
    room.state = "lobby" if room.state in ("lobby", "countdown") else room.state
    for q in room.players.values():
        q.ready = False
    await broadcast(room, {"t": "opp_left", "reason": notify_reason})
    await push_room(room)


async def handle(room: Room, me: Player, d: dict):
    t = d.get("t")
    me.last_seen = now()
    other = room.other(me.role)
    if t == "ping":
        await send(me, {"t": "pong", "c": d.get("c"), "s": now_ms()})
    elif t == "pos":
        if room.state in ("countdown", "racing", "finished") and other:
            await send(other, {"t": "opp", "x": d.get("x"), "y": d.get("y"), "th": d.get("th"), "vx": d.get("vx"),
                               "vy": d.get("vy"), "rs": d.get("rs"), "cp": d.get("cp"), "lp": d.get("lp"), "sp": d.get("sp"), "q": d.get("q")})
    elif t == "mode" and room.state == "lobby" and me.role == "host":
        mode = d.get("mode")
        if mode in ("duel", "race") and mode != room.mode:
            if mode == "race":
                room.duel_level = room.level
                room.level = room.race_level
            else:
                room.level = room.duel_level
            room.mode = mode
            for p in room.players.values():
                p.ready = False
            room.activity = now()
            await push_room(room)
    elif t == "level" and room.state == "lobby" and me.role == "host":
        lv = d.get("level")
        ok = lv in RACE_LEVELS if room.mode == "race" else (isinstance(lv, int) and MIN_LEVEL <= lv <= MAX_LEVEL)
        if isinstance(lv, int) and ok:
            room.level = lv
            if room.mode == "race":
                room.race_level = lv
            for p in room.players.values():
                p.ready = False
            room.activity = now()
            await push_room(room)
    elif t == "car" and room.state == "lobby":
        me.car = clean_car(d.get("car"))
        await push_room(room)
    elif t == "ready" and room.state == "lobby":
        me.ready = bool(d.get("ready"))
        room.activity = now()
        await push_room(room)
        guest, host = room.players.get("guest"), room.players.get("host")
        if guest and host and guest.ready and host.ready and guest.connected and host.connected:
            await start_countdown(room)
    elif t == "finish":
        if room.state in ("racing", "countdown") and now_ms() >= room.go_at and not me.finished:
            tm = d.get("time")
            tm = float(tm) if isinstance(tm, (int, float)) and 0 < tm < 3600 else (now_ms() - room.go_at) / 1000.0
            me.finished = True
            me.finish_time = round(tm, 2)
            room.state = "racing"
            await send(other, {"t": "opp_finished", "time": me.finish_time})
            await finish_room(room, me.role, "finish")
        elif room.state == "finished" and not me.finished and room.winner and room.reason in ("finish", "disconnect", "left"):
            tm = d.get("time")
            if isinstance(tm, (int, float)) and 0 < tm < 3600:
                me.finished = True
                me.finish_time = round(float(tm), 2)
                await broadcast(room, {"t": "result_update", "room": room.public()})
    elif t == "rematch" and room.state == "finished":
        if not other:
            await send(me, {"t": "error", "code": "NO_OPPONENT", "msg": "Your opponent has left the room."})
            return
        me.rematch = bool(d.get("on", True))
        await push_room(room)
        if other.rematch and me.rematch and other.connected:
            room.state = "lobby"
            await start_countdown(room)
    elif t == "leave":
        if room.state in ("countdown", "racing") and other:
            await finish_room(room, other.role, "left")
        await remove_player(room, me.role)


async def tick_rooms():
    t = now()
    for room in list(ROOMS.values()):
        try:
            if room.state == "countdown" and now_ms() >= room.go_at:
                room.state = "racing"
            if t - room.created > ROOM_MAX_AGE or (room.state == "lobby" and t - room.activity > LOBBY_IDLE_LIMIT):
                await broadcast(room, {"t": "room_closed", "reason": "expired"})
                ROOMS.pop(room.code, None)
                continue
            for p in list(room.players.values()):
                if p.connected and t - p.last_seen > DISCONNECT_LIMIT:
                    p.connected = False
                    p.disc_at = p.last_seen
                    await push_room(room)
                if not p.connected and p.disc_at and t - p.disc_at > DISCONNECT_LIMIT:
                    other = room.other(p.role)
                    if room.state in ("countdown", "racing") and other and not p.finished:
                        await finish_room(room, other.role, "disconnect")
                    elif room.state != "finished":
                        await remove_player(room, p.role, "disconnect")
                    elif t - p.disc_at > 120:
                        await remove_player(room, p.role, "disconnect")
        except Exception:
            logger.exception("tick error")


async def janitor():
    while True:
        await asyncio.sleep(1.0)
        await tick_rooms()


def start_janitor():
    asyncio.get_event_loop().create_task(janitor())


@router.get("/duel/room/{code}")
async def room_info(code: str):
    room = ROOMS.get(code.strip().upper())
    if not room:
        return {"exists": False}
    return {"exists": True, "state": room.state, "full": len(room.players) >= 2, "level": room.level, "mode": room.mode}


@router.get("/duel/stats")
async def stats():
    return {"rooms": len(ROOMS)}


async def err(ws: WebSocket, code: str, msg: str):
    await ws.send_text(json.dumps({"t": "error", "code": code, "msg": msg}))


@router.websocket("/ws/duel")
async def duel_ws(ws: WebSocket):
    await ws.accept()
    room: Optional[Room] = None
    me: Optional[Player] = None
    try:
        while True:
            raw = await ws.receive_text()
            if len(raw) > MAX_MSG:
                continue
            try:
                d = json.loads(raw)
            except Exception:
                continue
            if not isinstance(d, dict):
                continue
            t = d.get("t")
            if me is None:
                if t == "ping":
                    await ws.send_text(json.dumps({"t": "pong", "c": d.get("c"), "s": now_ms()}))
                elif t == "create":
                    nick = clean_nick(d.get("nick"))
                    if not nick:
                        await err(ws, "BAD_NICK", "Enter a nickname first.")
                        continue
                    room = Room(new_code())
                    me = Player("host", new_pid(), nick, clean_car(d.get("car")), ws)
                    room.players["host"] = me
                    ROOMS[room.code] = room
                    await send(me, {"t": "joined", "role": "host", "pid": me.pid, "code": room.code, "room": room.public()})
                elif t == "join":
                    nick = clean_nick(d.get("nick"))
                    code = str(d.get("code", "")).strip().upper()
                    if not nick:
                        await err(ws, "BAD_NICK", "Enter a nickname first.")
                        continue
                    r = ROOMS.get(code)
                    if len(code) != CODE_LEN or not r:
                        await err(ws, "ROOM_NOT_FOUND", "No room with that code. Check the 5 characters.")
                        continue
                    if "guest" in r.players or r.state != "lobby":
                        await err(ws, "ROOM_FULL", "That room is full or already racing.")
                        continue
                    room = r
                    me = Player("guest", new_pid(), nick, clean_car(d.get("car")), ws)
                    room.players["guest"] = me
                    room.activity = now()
                    await send(me, {"t": "joined", "role": "guest", "pid": me.pid, "code": room.code, "room": room.public()})
                    await push_room(room)
                elif t == "resume":
                    r = ROOMS.get(str(d.get("code", "")).strip().upper())
                    found = next((p for p in r.players.values() if p.pid == d.get("pid")), None) if r else None
                    if not r or not found:
                        await err(ws, "ROOM_NOT_FOUND", "That room is gone.")
                        continue
                    room, me = r, found
                    me.ws, me.connected, me.disc_at, me.last_seen = ws, True, 0.0, now()
                    await send(me, {"t": "joined", "role": me.role, "pid": me.pid, "code": room.code, "room": room.public(), "resumed": True})
                    if room.state == "finished":
                        await send(me, {"t": "result", "winner": room.winner, "reason": room.reason, "room": room.public()})
                    await push_room(room)
                continue
            await handle(room, me, d)
            if room.code not in ROOMS and me.role not in room.players:
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("ws error")
    finally:
        if me and room and room.code in ROOMS and room.players.get(me.role) is me and me.ws is ws:
            me.connected = False
            me.disc_at = now()
            try:
                await push_room(room)
            except Exception:
                pass
