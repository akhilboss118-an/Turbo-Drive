/**
 * Turbo Drive - Online Duel Race WebSocket & REST Server in Node.js
 * Mirrors server/duel.py logic for local hosting without Python.
 */
const { WebSocketServer } = require('ws');

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 5;
const COUNTDOWN_MS = 3300;      // lead time between "start" and GO
const DISCONNECT_LIMIT = 15.0;  // seconds a player may be gone before other wins
const LOBBY_IDLE_LIMIT = 15 * 60; // lobby rooms with no activity expire
const ROOM_MAX_AGE = 60 * 60;   // hard cap for any room
const MIN_LEVEL = 1;
const MAX_LEVEL = 19;          // level 20 needs the Mars Hover, so not in duels
const MAX_MSG = 4096;

const now = () => Date.now() / 1000;
const now_ms = () => Date.now();

class Player {
  constructor(role, pid, nick, car, ws) {
    this.role = role;
    this.pid = pid;
    this.nick = nick;
    this.car = car;
    this.ws = ws;
    this.ready = false;
    this.rematch = false;
    this.connected = true;
    this.disc_at = 0.0;
    this.last_seen = now();
    this.finish_time = null;
    this.finished = false;
  }

  public() {
    return {
      role: this.role,
      nick: this.nick,
      car: this.car,
      ready: this.ready,
      rematch: this.rematch,
      connected: this.connected,
      finished: this.finished,
      time: this.finish_time
    };
  }
}

class Room {
  constructor(code) {
    this.code = code;
    this.created = now();
    this.activity = now();
    this.state = 'lobby'; // lobby | countdown | racing | finished
    this.level = 1;
    this.go_at = 0;
    this.winner = null;
    this.reason = null;
    this.players = {}; // role -> Player
  }

  other(role) {
    return this.players[role === 'host' ? 'guest' : 'host'] || null;
  }

  public() {
    return {
      code: this.code,
      state: this.state,
      level: this.level,
      go_at: this.go_at,
      winner: this.winner,
      reason: this.reason,
      players: Object.values(this.players).map(p => p.public())
    };
  }
}

const ROOMS = new Map();

function send(p, msg) {
  if (!p || !p.ws || !p.connected || p.ws.readyState !== 1) return;
  try {
    p.ws.send(JSON.stringify(msg));
  } catch (e) {
    p.connected = false;
    if (!p.disc_at) p.disc_at = now();
  }
}

function broadcast(room, msg) {
  for (const p of Object.values(room.players)) {
    send(p, msg);
  }
}

function push_room(room) {
  broadcast(room, { t: 'room', room: room.public() });
}

function new_code() {
  for (let i = 0; i < 200; i++) {
    let c = '';
    for (let j = 0; j < CODE_LEN; j++) {
      c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!ROOMS.has(c)) return c;
  }
  throw new Error('no free room code');
}

function clean_nick(v) {
  if (typeof v !== 'string') return null;
  v = v.trim().replace(/\s+/g, ' ').slice(0, 16);
  return v || null;
}

function clean_car(v) {
  if (!v || typeof v !== 'object') {
    return { id: 'gt', name: 'Red Bug', model: 'car5', glow: null };
  }
  return {
    id: String(v.id || 'gt').slice(0, 12),
    name: String(v.name || 'Car').slice(0, 24),
    model: String(v.model || 'car5').slice(0, 8),
    glow: v.glow ? String(v.glow).slice(0, 9) : null
  };
}

function new_pid() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < 16; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

function finish_room(room, winner, reason) {
  if (room.state === 'finished') return;
  room.state = 'finished';
  room.winner = winner;
  room.reason = reason;
  room.activity = now();
  for (const p of Object.values(room.players)) {
    p.ready = false;
    p.rematch = false;
  }
  broadcast(room, { t: 'result', winner, reason, room: room.public() });
}

function start_countdown(room) {
  room.state = 'countdown';
  room.go_at = now_ms() + COUNTDOWN_MS;
  room.winner = null;
  room.reason = null;
  room.activity = now();
  for (const p of Object.values(room.players)) {
    p.ready = false;
    p.rematch = false;
    p.finished = false;
    p.finish_time = null;
  }
  broadcast(room, {
    t: 'start',
    go_at: room.go_at,
    server_now: now_ms(),
    level: room.level,
    room: room.public()
  });
}

function remove_player(room, role, notify_reason = 'left') {
  const p = room.players[role];
  if (p) {
    delete room.players[role];
    if (p.ws) {
      try { p.ws.close(); } catch (e) {}
    }
  }
  if (role === 'host' || Object.keys(room.players).length === 0) {
    for (const q of Object.values(room.players)) {
      send(q, { t: 'room_closed', reason: notify_reason });
    }
    ROOMS.delete(room.code);
    return;
  }
  if (room.state === 'lobby' || room.state === 'countdown') {
    room.state = 'lobby';
  }
  for (const q of Object.values(room.players)) {
    q.ready = false;
  }
  broadcast(room, { t: 'opp_left', reason: notify_reason });
  push_room(room);
}

function handle(room, me, d) {
  const t = d.t;
  me.last_seen = now();
  const other = room.other(me.role);

  if (t === 'ping') {
    send(me, { t: 'pong', c: d.c, s: now_ms() });
  } else if (t === 'pos') {
    if (['countdown', 'racing', 'finished'].includes(room.state) && other) {
      send(other, {
        t: 'opp',
        x: d.x,
        y: d.y,
        th: d.th,
        vx: d.vx,
        vy: d.vy,
        rs: d.rs,
        cp: d.cp,
        sp: d.sp,
        q: d.q
      });
    }
  } else if (t === 'level' && room.state === 'lobby' && me.role === 'host') {
    const lv = d.level;
    if (Number.isInteger(lv) && lv >= MIN_LEVEL && lv <= MAX_LEVEL) {
      room.level = lv;
      for (const p of Object.values(room.players)) {
        p.ready = false;
      }
      room.activity = now();
      push_room(room);
    }
  } else if (t === 'car' && room.state === 'lobby') {
    me.car = clean_car(d.car);
    push_room(room);
  } else if (t === 'ready' && room.state === 'lobby') {
    me.ready = Boolean(d.ready);
    room.activity = now();
    push_room(room);
    const guest = room.players.guest;
    const host = room.players.host;
    if (guest && host && guest.ready && host.ready && guest.connected && host.connected) {
      start_countdown(room);
    }
  } else if (t === 'finish') {
    if (['racing', 'countdown'].includes(room.state) && now_ms() >= room.go_at && !me.finished) {
      let tm = d.time;
      if (typeof tm === 'number' && tm > 0 && tm < 3600) {
        tm = parseFloat(tm);
      } else {
        tm = (now_ms() - room.go_at) / 1000.0;
      }
      me.finished = true;
      me.finish_time = Math.round(tm * 100) / 100;
      room.state = 'racing';
      if (other) {
        send(other, { t: 'opp_finished', time: me.finish_time });
      }
      finish_room(room, me.role, 'finish');
    } else if (room.state === 'finished' && !me.finished && room.winner && ['finish', 'disconnect', 'left'].includes(room.reason)) {
      const tm = d.time;
      if (typeof tm === 'number' && tm > 0 && tm < 3600) {
        me.finished = true;
        me.finish_time = Math.round(tm * 100) / 100;
        broadcast(room, { t: 'result_update', room: room.public() });
      }
    }
  } else if (t === 'rematch' && room.state === 'finished') {
    if (!other) {
      send(me, { t: 'error', code: 'NO_OPPONENT', msg: 'Your opponent has left the room.' });
      return;
    }
    me.rematch = Boolean(d.on ?? true);
    push_room(room);
    if (other.rematch && me.rematch && other.connected) {
      room.state = 'lobby';
      start_countdown(room);
    }
  } else if (t === 'leave') {
    if (['countdown', 'racing'].includes(room.state) && other) {
      finish_room(room, other.role, 'left');
    }
    remove_player(room, me.role);
  }
}

function err(ws, code, msg) {
  try {
    ws.send(JSON.stringify({ t: 'error', code, msg }));
  } catch (e) {}
}

function handleWebSocketConnection(ws) {
  let room = null;
  let me = null;

  ws.on('message', (message) => {
    const raw = message.toString();
    if (raw.length > MAX_MSG) return;
    let d;
    try {
      d = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!d || typeof d !== 'object') return;
    const t = d.t;

    if (!me) {
      if (t === 'ping') {
        try {
          ws.send(JSON.stringify({ t: 'pong', c: d.c, s: now_ms() }));
        } catch (e) {}
      } else if (t === 'create') {
        const nick = clean_nick(d.nick);
        if (!nick) {
          err(ws, 'BAD_NICK', 'Enter a nickname first.');
          return;
        }
        room = new Room(new_code());
        me = new Player('host', new_pid(), nick, clean_car(d.car), ws);
        room.players.host = me;
        ROOMS.set(room.code, room);
        send(me, {
          t: 'joined',
          role: 'host',
          pid: me.pid,
          code: room.code,
          room: room.public()
        });
      } else if (t === 'join') {
        const nick = clean_nick(d.nick);
        const code = String(d.code || '').trim().toUpperCase();
        if (!nick) {
          err(ws, 'BAD_NICK', 'Enter a nickname first.');
          return;
        }
        const r = ROOMS.get(code);
        if (code.length !== CODE_LEN || !r) {
          err(ws, 'ROOM_NOT_FOUND', 'No room with that code. Check the 5 characters.');
          return;
        }
        if (r.players.guest || r.state !== 'lobby') {
          err(ws, 'ROOM_FULL', 'That room is full or already racing.');
          return;
        }
        room = r;
        me = new Player('guest', new_pid(), nick, clean_car(d.car), ws);
        room.players.guest = me;
        room.activity = now();
        send(me, {
          t: 'joined',
          role: 'guest',
          pid: me.pid,
          code: room.code,
          room: room.public()
        });
        push_room(room);
      } else if (t === 'resume') {
        const code = String(d.code || '').trim().toUpperCase();
        const r = ROOMS.get(code);
        const found = r ? Object.values(r.players).find(p => p.pid === d.pid) : null;
        if (!r || !found) {
          err(ws, 'ROOM_NOT_FOUND', 'That room is gone.');
          return;
        }
        room = r;
        me = found;
        me.ws = ws;
        me.connected = true;
        me.disc_at = 0.0;
        me.last_seen = now();
        send(me, {
          t: 'joined',
          role: me.role,
          pid: me.pid,
          code: room.code,
          room: room.public(),
          resumed: true
        });
        if (room.state === 'finished') {
          send(me, {
            t: 'result',
            winner: room.winner,
            reason: room.reason,
            room: room.public()
          });
        }
        push_room(room);
      }
      return;
    }

    handle(room, me, d);
  });

  const onDisconnect = () => {
    if (me && room && ROOMS.get(room.code) && room.players[me.role] === me && me.ws === ws) {
      me.connected = false;
      me.disc_at = now();
      try {
        push_room(room);
      } catch (e) {}
    }
  };

  ws.on('close', onDisconnect);
  ws.on('error', onDisconnect);
}

// Background janitor
setInterval(() => {
  const t = now();
  for (const room of Array.from(ROOMS.values())) {
    try {
      if (room.state === 'countdown' && now_ms() >= room.go_at) {
        room.state = 'racing';
      }
      if (t - room.created > ROOM_MAX_AGE || (room.state === 'lobby' && t - room.activity > LOBBY_IDLE_LIMIT)) {
        broadcast(room, { t: 'room_closed', reason: 'expired' });
        ROOMS.delete(room.code);
        continue;
      }
      for (const p of Object.values(room.players)) {
        if (p.connected && t - p.last_seen > DISCONNECT_LIMIT) {
          p.connected = false;
          p.disc_at = p.last_seen;
          push_room(room);
        }
        if (!p.connected && p.disc_at && t - p.disc_at > DISCONNECT_LIMIT) {
          const other = room.other(p.role);
          if (['countdown', 'racing'].includes(room.state) && other && !p.finished) {
            finish_room(room, other.role, 'disconnect');
          } else if (room.state !== 'finished') {
            remove_player(room, p.role, 'disconnect');
          } else if (t - p.disc_at > 120) {
            remove_player(room, p.role, 'disconnect');
          }
        }
      }
    } catch (e) {
      console.error('Janitor error:', e);
    }
  }
}, 1000);

function handleHttpRoute(req, res, pathname) {
  if (pathname.startsWith('/api/duel/room/') || pathname.startsWith('/duel/room/')) {
    const parts = pathname.split('/');
    const code = String(parts[parts.length - 1] || '').trim().toUpperCase();
    const room = ROOMS.get(code);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    if (!room) {
      res.end(JSON.stringify({ exists: false }));
    } else {
      res.end(JSON.stringify({
        exists: true,
        state: room.state,
        full: Object.keys(room.players).length >= 2,
        level: room.level
      }));
    }
    return true;
  }

  if (pathname === '/api/duel/stats' || pathname === '/duel/stats') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ rooms: ROOMS.size }));
    return true;
  }

  return false;
}

function attachDuelServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url.split('?')[0];
    if (pathname === '/api/ws/duel' || pathname === '/ws/duel') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    handleWebSocketConnection(ws);
  });
}

module.exports = {
  attachDuelServer,
  handleHttpRoute
};
