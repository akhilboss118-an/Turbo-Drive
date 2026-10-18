# Connecting Firebase (Auth + Firestore + Backend)

Turbo Drive connects to Firebase across both the client web frontend and the FastAPI backend for real-time authentication, cloud progress synchronization, and multiplayer records.

- **Firebase Project:** `turbi-racer`
- **Firestore Instance:** `projects/turbi-racer/databases/(default)` (Standard Native Mode)
- **Web App ID:** `1:508238787402:web:8e92b3641c8aa2e508c7b3`
- **Android App ID:** `1:508238787402:android:9fb81ae8145d849b08c7b3` (`com.littlehearts.turbodrive`)

---

## 1. Client Architecture (`game/js/core/firebase-init.js`)

The web client uses the Firebase v10 Modular Web SDK loaded asynchronously:
- **Authentication:** Google OAuth Popup + Anonymous Guest Auth.
- **Auto-Sync:** Every in-game save (`save()` in `config.js`) debounces 1.5s and calls `AuthService.hooks.saveProgress(uid, profileDoc)`.
- **Cloud Restore:** On sign-in, existing Firestore progress is merged with the local save state so players never lose their cars, stars, coins, or upgrades.

### Authorized Domains in Firebase Console
Ensure the following domains are added under **Authentication > Settings > Authorized Domains**:
- `turbo-drive-duel.onrender.com`
- `localhost`
- `127.0.0.1`

---

## 2. Backend FastAPI Integration (`server/firebase_backend.py`)

The backend runs `firebase-admin` to verify client tokens and interact securely with Firestore.

### Endpoints
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/firebase/status` | Health & connection status of Firebase Admin SDK | No |
| `GET` | `/api/firebase/leaderboard?sort_by=stars&limit=20` | Live global leaderboard from Firestore | No |
| `POST` | `/api/firebase/sync` | Syncs progress payload directly to Firestore | `Bearer <Firebase ID Token>` |
| `GET` | `/api/firebase/profile` | Fetches authenticated player's cloud data | `Bearer <Firebase ID Token>` |
| `POST` | `/api/firebase/duel-result` | Records multiplayer race or shooting duel outcome | `Bearer <Firebase ID Token>` |

### Render / Production Deployment
On Render (or cloud environments), set the following environment variables:
- `FIREBASE_PROJECT_ID`: `turbi-racer`
- `FIREBASE_CREDENTIALS_JSON` *(Optional but recommended for full backend admin access)*: The raw JSON string of a service account key generated from **Firebase Console > Project Settings > Service Accounts > Generate New Private Key**.

> [!NOTE]
> If `FIREBASE_CREDENTIALS_JSON` is not provided, the backend operates in graceful standby mode: the server boots without crashing, static files and duels remain operational, and `/api/firebase/leaderboard` returns fallback data.

---

## 3. Firestore Security Rules (`firestore.rules`)

Deployed rules enforce:
1. **User Ownership:** Only the authenticated owner can read/write their document at `users/{userId}`.
2. **Schema Validation:** Enforces string bounds on `displayName` (<= 50 chars), valid provider types (`google`, `guest`), and progress map integrity.
3. **Duel History:** `duel_matches` documents can only be created by authenticated players and cannot be modified or deleted.
4. **Leaderboard:** `leaderboards` collection is public read-only and can only be updated by the server.

To redeploy rules:
```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project turbi-racer
```
