# Connecting Firebase (Auth + profile data)

The game ships with a sign-in screen (Google / Guest) and a profile icon. They talk to one adapter, `game/js/core/auth.js` (`AuthService`).
Until Firebase is connected it runs in **demo mode** (fake Google account, session kept in localStorage) so you can test the whole flow.

## 1. Firebase console
1. Create a project, add a **Web app**, copy the config.
2. Authentication > Sign-in method: enable **Google** and **Anonymous** (Anonymous powers "Play as Guest").
3. Authentication > Settings > Authorized domains: add the domain you host the game on.
4. (Optional) Firestore: create a database for saving progress.

## 2. Wire it up (add to index.html, after the other scripts)
```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
  import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
  const app = initializeApp({ apiKey: '...', authDomain: '...', projectId: '...', appId: '...' });
  AuthService.useFirebase({ auth: getAuth(app), GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut });
</script>
```
That is all for login: sign-in, sign-out, session restore and the profile card start using real Firebase users.
Note: sign-in with `file://` does not work, serve the game over http(s) (`npx serve`, Firebase Hosting, etc).

## 3. Saving progress (optional)
```js
// import { getFirestore, doc, setDoc, getDoc } ...
AuthService.hooks.saveProgress = (uid, data) => setDoc(doc(db, 'users', uid), data, { merge: true });
```
It is called (debounced 1.5 s) every time the game saves. Document shape (`AuthService.profileDoc()`):
```
users/{uid} {
  displayName, email, photoURL, isGuest, provider: 'google' | 'guest', createdAt, lastLoginAt,
  progress: { coins, stars, unlocked, owned[], vehicle, bests{}, starsBy{}, upg{}, cos{}, trophy }
}
```
Loading: read `users/{uid}` after sign-in and write the values into localStorage key `skyleap` before the menu opens (or reload).
Suggested Firestore rule: `allow read, write: if request.auth != null && request.auth.uid == userId;`

## UI pieces
- `#login` screen: `login-google-btn`, `login-guest-btn`  (game/js/ui/account.js)
- Profile icon `profile-icon-btn` (top bar) opens `profile-modal`: rename, stats, Sign in with Google (guests), Sign out
