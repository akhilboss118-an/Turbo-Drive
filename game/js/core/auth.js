/* eslint-disable */
'use strict';
/* AuthService: one small adapter between the game UI and Firebase Auth.
   Without Firebase it runs in DEMO (mock) mode and stores the session in localStorage, so the whole flow is testable.
   To go live call AuthService.useFirebase({...}) once - see FIREBASE_SETUP.md. */
const AuthService = (function () {
  const KEY = 'turbo_auth';
  const subs = []; let user = null, mode = 'mock', fb = null, ready = true, timer = 0;
  const hooks = { saveProgress: null };   // hooks.saveProgress = (uid, doc) => Promise  -> write users/{uid} in Firestore
  const emit = () => subs.forEach((f) => { try { f(user); } catch (e) {} });
  const persist = () => { try { user ? localStorage.setItem(KEY, JSON.stringify(user)) : localStorage.removeItem(KEY); } catch (e) {} };
  const rnd = (n) => Math.random().toString(36).slice(2, 2 + n);
  const now = () => new Date().toISOString();
  try { user = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const fromFb = (u) => ({
    uid: u.uid, name: u.displayName || (u.isAnonymous ? 'Guest ' + u.uid.slice(0, 4).toUpperCase() : (u.email || 'Player').split('@')[0]),
    email: u.email || '', photoURL: u.photoURL || '', isGuest: !!u.isAnonymous, provider: u.isAnonymous ? 'guest' : 'google',
    createdAt: (u.metadata && u.metadata.creationTime) ? new Date(u.metadata.creationTime).toISOString() : now(), lastLoginAt: now(),
  });
  const set = (u) => { user = u; persist(); emit(); };
  return {
    get user() { return user; }, get mode() { return mode; }, get ready() { return ready; }, hooks,
    onChange(f) { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
    async signInWithGoogle() {
      if (fb) { const r = await fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider()); set(fromFb(r.user)); return user; }
      const keep = user && user.isGuest ? user : null;   // demo mode: upgrading a guest keeps its uid and progress
      set({ uid: keep ? keep.uid : 'demo_' + rnd(10), name: 'Google Player', email: 'player@gmail.com', photoURL: '', isGuest: false, provider: 'google', createdAt: keep ? keep.createdAt : now(), lastLoginAt: now() });
      return user;
    },
    async signInAsGuest() {
      if (fb) { const r = await fb.signInAnonymously(fb.auth); set(fromFb(r.user)); return user; }
      const id = 'guest_' + rnd(10);
      set({ uid: id, name: 'Guest ' + id.slice(6, 10).toUpperCase(), email: '', photoURL: '', isGuest: true, provider: 'guest', createdAt: now(), lastLoginAt: now() });
      return user;
    },
    async signOut() { if (fb) await fb.signOut(fb.auth); set(null); },
    updateProfile(p) { if (!user) return; set(Object.assign({}, user, p)); },
    /* Firestore document shape: users/{uid} */
    profileDoc() {
      if (!user) return null;
      return {
        displayName: user.name, email: user.email, photoURL: user.photoURL, isGuest: user.isGuest, provider: user.provider, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt,
        progress: { coins, stars: totalStars(), unlocked, owned: owned.slice(), vehicle: vehicleId, bests, starsBy, upg, cos, trophy },
      };
    },
    progressChanged() {
      if (!user || !hooks.saveProgress) return; clearTimeout(timer);
      timer = setTimeout(() => { try { hooks.saveProgress(user.uid, this.profileDoc()); } catch (e) {} }, 1500);
    },
    useFirebase(f) {
      fb = f; mode = 'firebase'; ready = false;
      f.onAuthStateChanged(f.auth, (u) => { ready = true; user = u ? fromFb(u) : null; persist(); emit(); });
    },
  };
})();
window.AuthService = AuthService;
