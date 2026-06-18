require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { passport, setupPassport } = require('./auth');
const { getDb, saveDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5500';

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

setupPassport();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, avatar: user.avatar, provider: user.provider },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/?login=failed` }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${CLIENT_URL}/?login=success&token=${token}`);
  }
);

app.get('/api/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: false })
);

app.get('/api/auth/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${CLIENT_URL}/?login=failed` }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${CLIENT_URL}/?login=success&token=${token}`);
  }
);

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const db = await getDb();
    const { scenery = 'highway', difficulty = 'normal', limit = 50 } = req.query;
    const lim = Math.min(Number(limit) || 50, 200);
    const result = db.exec(`
      SELECT s.score, s.distance, s.scenery, s.difficulty, s.game_mode, s.created_at,
             u.name, u.avatar, u.provider
      FROM scores s
      JOIN users u ON u.id = s.user_id
      WHERE s.scenery = '${scenery.replace(/'/g, "''")}' AND s.difficulty = '${difficulty.replace(/'/g, "''")}'
      ORDER BY s.score DESC
      LIMIT ${lim}
    `);
    const rows = (result[0]?.values || []).map(row => ({
      score: row[0], distance: row[1], scenery: row[2], difficulty: row[3],
      game_mode: row[4], created_at: row[5], name: row[6], avatar: row[7], provider: row[8]
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { score, distance, scenery, difficulty, game_mode } = req.body;
    if (!score || score <= 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const existing = db.exec(`
      SELECT id, score FROM scores
      WHERE user_id = ${req.user.id} AND scenery = '${(scenery || 'highway').replace(/'/g, "''")}'
      AND difficulty = '${(difficulty || 'normal').replace(/'/g, "''")}'
      AND game_mode = '${(game_mode || 'endless').replace(/'/g, "''")}'
      ORDER BY score DESC LIMIT 1
    `);
    if (existing.length && existing[0].values.length) {
      const currentBest = existing[0].values[0][1];
      if (currentBest >= Math.floor(score)) {
        return res.json({ saved: false, reason: 'existing_better' });
      }
    }
    db.run(
      `INSERT INTO scores (user_id, score, distance, scenery, difficulty, game_mode) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, Math.floor(score), distance || 0, scenery || 'highway', difficulty || 'normal', game_mode || 'endless']
    );
    saveDb();
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Turbo Drive server running on port ${PORT}`);
  console.log(`Auth callback URL: http://localhost:${PORT}/api/auth/google/callback`);
  console.log(`CORS origin: ${CLIENT_URL}`);
});
