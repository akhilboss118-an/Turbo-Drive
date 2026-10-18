/* eslint-disable */
'use strict';
/**
 * Turbo Drive - Firebase Web Client Integration
 * Connects Firebase Auth (Google & Anonymous Guest) and Cloud Firestore
 * with AuthService and local game persistence.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

async function bootstrapFirebase() {
  try {
    let config = null;
    try {
      const res = await fetch('/api/firebase/config');
      if (res.ok) {
        config = await res.json();
      }
    } catch (_) {}

    if (!config || !config.apiKey) {
      // Runtime fallback
      config = {
        projectId: "turbi-racer",
        appId: "1:508238787402:web:8e92b3641c8aa2e508c7b3",
        databaseURL: "https://turbi-racer-default-rtdb.firebaseio.com",
        storageBucket: "turbi-racer.firebasestorage.app",
        apiKey: typeof atob === 'function' ? atob("QUl6YVN5QUtLWnNrUHhhNVhDTXRrQTBPdS0wYS1HM01ZNHZDbjVn") : "",
        authDomain: "turbi-racer.firebaseapp.com",
        messagingSenderId: "508238787402",
        measurementId: "G-1TJDYP955H"
      };
    }

    const app = initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);

    if (window.AuthService) {
      window.AuthService.useFirebase({
        auth,
        GoogleAuthProvider,
        signInWithPopup,
        signInAnonymously,
        onAuthStateChanged,
        signOut
      });

      // Cloud save hook triggered on progress change (debounced 1.5s in AuthService)
      window.AuthService.hooks.saveProgress = async (uid, data) => {
        try {
          await setDoc(doc(db, 'users', uid), data, { merge: true });
          // Also sync to backend FastAPI endpoint
          if (auth.currentUser) {
            try {
              const token = await auth.currentUser.getIdToken();
              fetch('/api/firebase/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(data)
              }).catch(() => {});
            } catch (_) {}
          }
        } catch (err) {
          console.warn('[Firebase] Cloud save error:', err);
        }
      };

      // When signed in, restore latest cloud progress and merge with local saves
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
              const remote = snap.data();
              if (remote && remote.progress) {
                const local = JSON.parse(localStorage.getItem('skyleap') || '{}');
                const merged = Object.assign({}, local, remote.progress);
                if (typeof remote.progress.coins === 'number') {
                  merged.coins = Math.max(local.coins || 0, remote.progress.coins);
                }
                if (typeof remote.progress.unlocked === 'number') {
                  merged.unlocked = Math.max(local.unlocked || 1, remote.progress.unlocked);
                }
                if (Array.isArray(remote.progress.owned)) {
                  merged.owned = Array.from(new Set([...(local.owned || ['gt']), ...remote.progress.owned]));
                }
                localStorage.setItem('skyleap', JSON.stringify(merged));
                if (typeof coins !== 'undefined' && merged.coins !== undefined) coins = merged.coins;
                if (typeof unlocked !== 'undefined' && merged.unlocked !== undefined) unlocked = merged.unlocked;
                if (typeof owned !== 'undefined' && merged.owned) owned = merged.owned;
                if (typeof refreshMenu === 'function') refreshMenu();
              }
            }
          } catch (err) {
            console.warn('[Firebase] Cloud restore error:', err);
          }
        }
      });

      console.info('[Firebase] Connected to project: turbi-racer');
    }
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
  }
}

bootstrapFirebase();
