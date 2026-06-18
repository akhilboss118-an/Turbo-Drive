const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');

let db;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA journal_mode=WAL');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(provider, provider_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      distance REAL NOT NULL DEFAULT 0,
      scenery TEXT NOT NULL DEFAULT 'highway',
      difficulty TEXT NOT NULL DEFAULT 'normal',
      game_mode TEXT NOT NULL DEFAULT 'endless',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_scores_scenario ON scores(scenery, difficulty, score DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id)');
  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function prepare(sql) {
  return db.prepare(sql);
}

module.exports = { getDb, saveDb, prepare };
