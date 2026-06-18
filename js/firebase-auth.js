// ============================================================
// Firebase Auth & Firestore Leaderboard Module
// Turbo Drive - Google Sign-In + Cloud Score Sync
// Dynamically loads Firebase CDN (non-blocking)
// Uses Google Identity Services (GSI) for Capacitor WebView
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAKKZskPxa5XCMtkA0Ou-0a-G3MY4vCn5g",
  authDomain: "turbi-racer.firebaseapp.com",
  projectId: "turbi-racer",
  storageBucket: "turbi-racer.firebasestorage.app",
  messagingSenderId: "508238787402",
  appId: "1:508238787402:web:8e92b3641c8aa2e508c7b3"
};

let auth = null;
let db = null;
let firebaseReady = false;
let __firebaseUser = null;
window.__firebaseUser = null;
window.__lastFetchedScore = 0;

const isTauri = typeof window !== 'undefined' && (window.__TAURI__ || window.__TAURI_INTERNALS__);
const isCapacitor = typeof window !== 'undefined' && (window.Capacitor && window.Capacitor.isNativePlatform());

// -------------------------------------------------------
// UI Helpers
// -------------------------------------------------------
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideLoginError() {
  const el = document.getElementById('login-error');
  if (el) { el.style.display = 'none'; }
}
function setSignInLoading(loading) {
  const btn = document.getElementById('google-signin-btn');
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'SIGNING IN...' : 'SIGN IN WITH GOOGLE';
  btn.style.opacity = loading ? '0.6' : '1';
}

// -------------------------------------------------------
// Sign In
// -------------------------------------------------------
async function signInWithGoogle() {
  if (!firebaseReady && !isCapacitor) { showLoginError('Firebase not loaded. Check connection.'); return null; }
  hideLoginError();
  setSignInLoading(true);

  if (isTauri) {
    try {
      const { invoke } = window.__TAURI__?.core || {};
      if (!invoke) throw new Error('Tauri invoke not available');
      const resultStr = await invoke('google_sign_in', { apiKey: firebaseConfig.apiKey });
      const data = JSON.parse(resultStr);
      if (!data.idToken) throw new Error('No ID token returned');
      const credential = firebase.auth.GoogleAuthProvider.credential(data.idToken);
      const fbResult = await auth.signInWithCredential(credential);
      window.__firebaseUser = fbResult.user;
      setSignInLoading(false);
      return fbResult.user;
    } catch (err) {
      setSignInLoading(false);
      showLoginError('Google sign-in failed: ' + (err.message || err));
      return null;
    }
  }

  // Capacitor: use native Firebase Auth plugin
  if (isCapacitor) {
    try {
      if (!firebaseReady) { setSignInLoading(false); showLoginError('Firebase not ready'); return null; }
      var plugin = Capacitor.Plugins.FirebaseAuthentication;
      if (!plugin) { setSignInLoading(false); showLoginError('Firebase Auth plugin not available'); return null; }
      var result = await plugin.signInWithGoogle();
      if (result && result.credential && result.credential.idToken) {
        var credential = firebase.auth.GoogleAuthProvider.credential(result.credential.idToken);
        var fbResult = await auth.signInWithCredential(credential);
        window.__firebaseUser = fbResult.user;
        setSignInLoading(false);
        return fbResult.user;
      }
      setSignInLoading(false);
      showLoginError('Google sign-in failed: no credential');
      return null;
    } catch (err) {
      setSignInLoading(false);
      showLoginError('Google sign-in failed: ' + (err.message || err));
      return null;
    }
  }

  // Web: use popup
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return auth.signInWithPopup(provider)
    .then(result => {
      window.__firebaseUser = result.user;
      setSignInLoading(false);
      return result.user;
    })
    .catch(err => {
      setSignInLoading(false);
      if (err.code === 'auth/popup-blocked') {
        showLoginError('Popup was blocked. Try again or use Guest.');
        return null;
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no error needed
      } else {
        console.warn('[FB] Sign-in error:', err.code, err.message);
        const code = err.code || '';
        let msg = err.message || 'Unknown error';
        if (code === 'auth/unauthorized-domain' || code === 'auth/admin-restricted-operation') {
          msg = 'Google Sign-In not enabled in Firebase Console. Go to Authentication > Sign-in method > Google > Enable, and add "localhost" to Authorized domains.';
        } else if (code === 'auth/operation-not-allowed') {
          msg = 'Google Sign-In is disabled in Firebase Console.';
        } else if (code === 'auth/network-request-failed') {
          msg = 'Network error. Check your internet connection.';
        }
        showLoginError(msg);
      }
      return null;
    });
}
window.signInWithGoogle = signInWithGoogle;

// -------------------------------------------------------
// Sign Out
// -------------------------------------------------------
function signOut() {
  if (!auth) return Promise.resolve(false);
  return auth.signOut();
}
window.signOut = signOut;

// -------------------------------------------------------
// Auth State Listener
// -------------------------------------------------------
function initAuthUI(user) {
  if (document.readyState !== 'loading' || document.body) {
    applyAuthState(user);
  } else {
    document.addEventListener('DOMContentLoaded', () => applyAuthState(user));
  }
}
function applyAuthState(user) {
  // If user already chose guest mode, don't re-show the login overlay
  if (!user && (_guestMode || window._guestMode)) return;

  const overlay = document.getElementById('login-overlay');
  const userInfo = document.getElementById('fb-user-info');
  const googleBtn = document.getElementById('google-signin-btn');

  if (user) {
    __firebaseUser = user;
    window.__firebaseUser = user;

    if (overlay) {
      overlay.classList.remove('show');
      overlay.style.display = 'none';
    }

    if (userInfo) {
      userInfo.style.display = 'flex';
      document.getElementById('fb-user-pic').src = user.photoURL || '';
      document.getElementById('fb-user-name').textContent = user.displayName || 'Player';
      document.getElementById('fb-user-email').textContent = user.email || '';
    }
    if (googleBtn) googleBtn.style.display = 'none';

    const gv = window.__gameVars || {};
    const displayName = user.displayName || user.email || 'PLAYER';
    if (!gv.username) {
      gv.username = displayName.toUpperCase();
      window.__gameVars = gv;
    }

    const nameEl = document.getElementById('user-name-display');
    if (nameEl) {
      nameEl.textContent = gv.username;
      document.getElementById('user-tag').classList.remove('hidden');
    }

    const usScreen = document.getElementById('username-screen');
    if (usScreen) {
      usScreen.classList.remove('show');
      usScreen.style.display = 'none';
    }

    const menu = document.getElementById('menu');
    if (menu && typeof showMenuContent === 'function') {
      menu.classList.remove('hidden');
      showMenuContent();
    }

    fetchPlayerHighScore(user.uid);
    window.dispatchEvent(new CustomEvent('fb-auth', { detail: { user, signedIn: true } }));
  } else {
    __firebaseUser = null;
    window.__firebaseUser = null;

    if (userInfo) userInfo.style.display = 'none';
    if (googleBtn) googleBtn.style.display = '';

    if (overlay) {
      overlay.classList.add('show');
      overlay.style.display = 'flex';
    }

    window.dispatchEvent(new CustomEvent('fb-auth', { detail: { user: null, signedIn: false } }));
  }
}

// -------------------------------------------------------
// Fetch Player High Score from Firestore
// -------------------------------------------------------
function fetchPlayerHighScore(uid) {
  if (!db) return;
  if (!uid) uid = window.__firebaseUser ? window.__firebaseUser.uid : null;
  if (!uid) return;
  db.collection('leaderboards').doc(uid).get()
    .then(doc => {
      window.__lastFetchedScore = doc.exists ? (doc.data().highScore || 0) : 0;
    })
    .catch(() => { window.__lastFetchedScore = 0; });
}
window.fetchPlayerHighScore = fetchPlayerHighScore;

// -------------------------------------------------------
// Save Score to Firestore
// -------------------------------------------------------
function savePlayerHighScore(currentScore, distanceString, vehicleUsed, customPhotoURL) {
  if (!db) return Promise.resolve(false);
  const user = window.__firebaseUser;
  if (!user) return Promise.resolve(false);

  const uid = user.uid;
  const name = user.displayName || user.email || 'Unknown';
  const photoURL = customPhotoURL || user.photoURL || '';

  return db.collection('leaderboards').doc(uid).get()
    .then(doc => {
      const existing = doc.exists ? (doc.data().highScore || 0) : 0;
      if (currentScore <= existing) {
        console.log('[FB] Score not higher than existing (' + existing + '), skip save');
        return false;
      }
      return db.collection('leaderboards').doc(uid).set({
        name: name,
        highScore: Math.floor(currentScore),
        distance: distanceString || '0.0',
        vehicle: vehicleUsed || 'car',
        photoURL: photoURL,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        console.log('[FB] Score saved:', Math.floor(currentScore));
        window.__lastFetchedScore = Math.floor(currentScore);
        return true;
      });
    })
    .catch(err => {
      console.warn('[FB] Save error:', err.message);
      return false;
    });
}
window.savePlayerHighScore = savePlayerHighScore;

// -------------------------------------------------------
// Fetch Top 10 Leaderboard from Firestore
// -------------------------------------------------------
function fetchTopTenLeaderboard() {
  if (!db) return Promise.resolve([]);
  return db.collection('leaderboards')
    .orderBy('highScore', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
      const results = [];
      let rank = 1;
      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          rank: rank++,
          uid: doc.id,
          name: data.name || 'Unknown',
          score: data.highScore || 0,
          distance: data.distance || '0.0',
          vehicle: data.vehicle || '',
          photoURL: data.photoURL || ''
        });
      });
      return results;
    })
    .catch(err => {
      console.warn('[FB] Leaderboard fetch error:', err.message);
      return [];
    });
}
window.fetchTopTenLeaderboard = fetchTopTenLeaderboard;

// -------------------------------------------------------
// Render Cloud Leaderboard HTML
// -------------------------------------------------------
function renderCloudLeaderboard() {
  const container = document.getElementById('lb-cloud-data');
  if (!container) return;
  if (!firebaseReady) {
    container.innerHTML = '<div style="color:#555;font-size:0.6rem;padding:10px;text-align:center;border:1px dashed rgba(0,212,255,0.08);border-radius:6px">⛅ Cloud sync unavailable (offline)</div>';
    return;
  }
  const uid = window.__firebaseUser ? window.__firebaseUser.uid : null;
  container.innerHTML = '<div style="color:#555;font-size:0.6rem;padding:10px;text-align:center;border:1px dashed rgba(0,212,255,0.08);border-radius:6px">⟳ Loading...</div>';
  fetchTopTenLeaderboard().then(entries => {
    if (!entries.length) {
      container.innerHTML = '<div style="color:#555;font-size:0.65rem;padding:16px;text-align:center;border:1px dashed rgba(0,212,255,0.08);border-radius:6px">🌍 No cloud scores yet</div>';
      return;
    }
    let html = '<div id="lb-global-list">';
    html += '<div class="lb-header-row"><span class="lb-rank">#</span><span class="lb-name">NAME</span><span class="lb-score">SCORE</span><span class="lb-dist">DIST</span></div>';
    entries.forEach((e,i) => {
      const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const cls = i === 0 ? 'lb-gold' : i === 1 ? 'lb-silver' : i === 2 ? 'lb-bronze' : '';
      const hlClass = (e.uid === uid && !cls) ? 'lb-current' : '';
      const pic = e.photoURL ? `<img src="${e.photoURL}" style="width:13px;height:13px;border-radius:50%;vertical-align:middle;margin-right:5px">` : '';
      html += `<div class="lb-row ${cls} ${hlClass}" style="animation-delay:${i*0.04}s"><span class="lb-rank"><span class="lb-rank-icon">${rankIcon||'&nbsp;'}</span>${e.rank}</span><span class="lb-name">${pic}${e.name}</span><span class="lb-score">${e.score.toLocaleString()}</span><span class="lb-dist">${e.distance}K</span></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  });
}
window.renderCloudLeaderboard = renderCloudLeaderboard;

// -------------------------------------------------------
// Track guest mode — prevents applyAuthState from re-showing overlay
// -------------------------------------------------------
var _guestMode = false;
window._guestMode = false;

// -------------------------------------------------------
// Skip Login (Play as Guest)
// -------------------------------------------------------
function skipLogin() {
  _guestMode = true;
  window._guestMode = true;
  var overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.style.display = 'none';
  }
  var loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('hide');
    setTimeout(function() { loadingEl.style.display = 'none' }, 500);
  }
  if (typeof initUsername === 'function') {
    initUsername();
  }
}
window.skipLogin = skipLogin;

// -------------------------------------------------------
// Dynamically load Firebase CDN (non-blocking)
// -------------------------------------------------------
function loadFirebaseCDN() {
  return new Promise(function(resolve, reject) {
    var urls = [
      'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js'
    ];
    var loaded = 0;
    urls.forEach(function(src) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function() {
        loaded++;
        if (loaded === urls.length) resolve();
      };
      s.onerror = function() { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
    setTimeout(function() { reject(new Error('Firebase CDN load timeout')); }, 15000);
  });
}

// -------------------------------------------------------
// Initialize Firebase after CDN loaded
// -------------------------------------------------------
loadFirebaseCDN().then(function() {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  db = firebase.firestore();
  firebaseReady = true;

  auth.onAuthStateChanged(function(user) {
    window.__firebaseUser = user;
    initAuthUI(user);
  });

  console.log('[FB] Firebase initialized');
}).catch(function(err) {
  console.warn('[FB] Firebase unavailable:', err.message);
});

// -------------------------------------------------------
// Wire up UI buttons
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  var googleBtn = document.getElementById('google-signin-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', signInWithGoogle);
  }
  var skipBtn = document.getElementById('skip-login-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', skipLogin);
  }
  var signOutBtn = document.getElementById('fb-signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function() {
      signOut().then(function() {
        var overlay = document.getElementById('login-overlay');
        if (overlay) {
          overlay.classList.add('show');
          overlay.style.display = 'flex';
        }
      });
    });
  }
});

console.log('[FB] Firebase Auth module loaded');
