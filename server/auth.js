const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { getDb } = require('./db');

async function findOrCreateUser(provider, providerId, name, email, avatar) {
  const db = await getDb();
  const existing = db.exec(
    `SELECT * FROM users WHERE provider = '${provider.replace(/'/g, "''")}' AND provider_id = '${providerId.replace(/'/g, "''")}'`
  );
  if (existing.length && existing[0].values.length) {
    const row = existing[0].values[0];
    return { id: row[0], provider: row[1], provider_id: row[2], name: row[3], email: row[4], avatar: row[5], created_at: row[6] };
  }
  db.run(
    `INSERT INTO users (provider, provider_id, name, email, avatar) VALUES (?, ?, ?, ?, ?)`,
    [provider, providerId, name, email || null, avatar || null]
  );
  const result = db.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0];
  const newUser = db.exec(`SELECT * FROM users WHERE id = ${id}`);
  const row = newUser[0].values[0];
  return { id: row[0], provider: row[1], provider_id: row[2], name: row[3], email: row[4], avatar: row[5], created_at: row[6] };
}

async function getUserById(id) {
  const db = await getDb();
  const result = db.exec(`SELECT * FROM users WHERE id = ${Number(id)}`);
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  return { id: row[0], provider: row[1], provider_id: row[2], name: row[3], email: row[4], avatar: row[5], created_at: row[6] };
}

function setupPassport() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser(
          'google',
          profile.id,
          profile.displayName,
          profile.emails?.[0]?.value,
          profile.photos?.[0]?.value
        );
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }));
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_ID !== 'your-facebook-app-id') {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/api/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'email', 'photos']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser(
          'facebook',
          profile.id,
          profile.displayName,
          profile.emails?.[0]?.value,
          profile.photos?.[0]?.value
        );
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }));
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id);
      done(null, user || false);
    } catch (err) {
      done(err, false);
    }
  });
}

module.exports = { setupPassport, passport };
