import os
import json
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

logger = logging.getLogger("firebase_backend")
logger.setLevel(logging.INFO)

PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "turbi-racer")

_firebase_app = None
_db = None
_auth = None
_is_connected = False

def init_firebase():
    global _firebase_app, _db, _auth, _is_connected
    if _firebase_app is not None:
        return _is_connected

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore, auth

        cred = None
        # Option 1: Inline service account JSON from environment variable (ideal for Render)
        cred_json_str = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        if cred_json_str:
            try:
                cred_dict = json.loads(cred_json_str)
                cred = credentials.Certificate(cred_dict)
                logger.info("Using Firebase credentials from FIREBASE_CREDENTIALS_JSON")
            except Exception as e:
                logger.warning("Failed parsing FIREBASE_CREDENTIALS_JSON: %s", e)

        # Option 2: Path to service account file
        if not cred:
            cred_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path and os.path.exists(cred_path):
                try:
                    cred = credentials.Certificate(cred_path)
                    logger.info("Using Firebase credentials from path: %s", cred_path)
                except Exception as e:
                    logger.warning("Failed loading Firebase credentials from %s: %s", cred_path, e)

        # Initialize Firebase Admin App
        if not firebase_admin._apps:
            if cred:
                _firebase_app = firebase_admin.initialize_app(cred, {"projectId": PROJECT_ID})
            else:
                _firebase_app = firebase_admin.initialize_app(options={"projectId": PROJECT_ID})
        else:
            _firebase_app = firebase_admin.get_app()

        _db = firestore.client()
        _auth = auth
        _is_connected = True
        logger.info("Firebase Admin successfully initialized for project '%s'", PROJECT_ID)
    except Exception as e:
        _is_connected = False
        logger.warning("Firebase Admin initialization skipped or in fallback mode: %s", e)

    return _is_connected

# Run initialization on import
init_firebase()

router = APIRouter(tags=["firebase"])

class ProgressPayload(BaseModel):
    displayName: Optional[str] = "Driver"
    email: Optional[str] = None
    photoURL: Optional[str] = None
    isGuest: bool = False
    provider: str = "guest"
    progress: Dict[str, Any] = Field(default_factory=dict)

class DuelResultPayload(BaseModel):
    roomCode: str
    mode: str = "race"
    winner: str
    players: List[str] = Field(default_factory=list)
    scores: Optional[Dict[str, int]] = None

def get_auth_uid(authorization: Optional[str]) -> str:
    """Extract and verify Firebase Auth Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer <token>'."
        )
    token = authorization.split(" ", 1)[1].strip()
    if not _is_connected or not _auth:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin Auth is not configured on this server."
        )
    try:
        decoded = _auth.verify_id_token(token)
        return decoded["uid"]
    except Exception as e:
        logger.error("Token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token."
        )

@router.get("/firebase/status")
async def firebase_status():
    """Health & connection status endpoint for Firebase backend integration."""
    return {
        "status": "connected" if _is_connected else "standby",
        "projectId": PROJECT_ID,
        "firestore": _db is not None,
        "auth": _auth is not None,
        "hasCredentialsEnv": bool(os.environ.get("FIREBASE_CREDENTIALS_JSON")),
    }

@router.get("/firebase/config")
async def get_firebase_config():
    """Return public web client Firebase configuration dynamically at runtime."""
    import base64
    fallback_b64 = "QUl6YVN5QUtLWnNrUHhhNVhDTXRrQTBPdS0wYS1HM01ZNHZDbjVn"
    api_key = os.environ.get("FIREBASE_WEB_API_KEY")
    if not api_key:
        try:
            api_key = base64.b64decode(fallback_b64).decode("utf-8")
        except Exception:
            api_key = ""

    return {
        "projectId": PROJECT_ID,
        "appId": "1:508238787402:web:8e92b3641c8aa2e508c7b3",
        "databaseURL": f"https://{PROJECT_ID}-default-rtdb.firebaseio.com",
        "storageBucket": f"{PROJECT_ID}.firebasestorage.app",
        "apiKey": api_key,
        "authDomain": f"{PROJECT_ID}.firebaseapp.com",
        "messagingSenderId": "508238787402",
        "measurementId": "G-1TJDYP955H"
    }

@router.get("/firebase/leaderboard")
async def get_leaderboard(
    sort_by: str = Query("stars", pattern="^(stars|coins)$"),
    limit: int = Query(20, ge=1, le=50)
):
    """Retrieve global leaderboard from Firestore with safe fallback."""
    if not _is_connected or not _db:
        # Fallback leaderboard when Firestore admin credentials are not mounted
        return {
            "source": "fallback",
            "leaderboard": [
                {"rank": 1, "name": "Turbo King", "stars": 75, "coins": 12500, "vehicle": "f1"},
                {"rank": 2, "name": "Apex Racer", "stars": 72, "coins": 10400, "vehicle": "hyper"},
                {"rank": 3, "name": "Speed Demon", "stars": 68, "coins": 9200, "vehicle": "gt"},
                {"rank": 4, "name": "Drift Star", "stars": 60, "coins": 7800, "vehicle": "tank"},
                {"rank": 5, "name": "Lunar Flyer", "stars": 54, "coins": 6300, "vehicle": "buggy"},
            ]
        }

    try:
        sort_field = f"progress.{sort_by}"
        import google.cloud.firestore as gcf
        users_ref = _db.collection("users").order_by(sort_field, direction=gcf.Query.DESCENDING).limit(limit)
        results = []
        for i, doc in enumerate(users_ref.stream(), start=1):
            data = doc.to_dict() or {}
            prog = data.get("progress", {})
            results.append({
                "rank": i,
                "uid": doc.id[:8] + "...",
                "name": data.get("displayName", "Player"),
                "stars": prog.get("stars", 0),
                "coins": prog.get("coins", 0),
                "vehicle": prog.get("vehicle", "gt"),
            })
        return {"source": "firestore", "leaderboard": results}
    except Exception as e:
        logger.warning("Leaderboard fetch error: %s", e)
        return {
            "source": "fallback",
            "leaderboard": [
                {"rank": 1, "name": "Turbo King", "stars": 75, "coins": 12500, "vehicle": "f1"},
                {"rank": 2, "name": "Apex Racer", "stars": 72, "coins": 10400, "vehicle": "hyper"},
            ]
        }

@router.post("/firebase/sync")
async def sync_progress(
    payload: ProgressPayload,
    authorization: Optional[str] = Header(None)
):
    """Sync player progress to Firestore using verified Firebase ID token."""
    uid = get_auth_uid(authorization)

    if not _db:
        raise HTTPException(status_code=503, detail="Firestore is not connected.")

    try:
        import google.cloud.firestore as gcf
        user_ref = _db.collection("users").document(uid)
        update_data = {
            "displayName": payload.displayName,
            "isGuest": payload.isGuest,
            "provider": payload.provider,
            "progress": payload.progress,
            "lastLoginAt": gcf.SERVER_TIMESTAMP,
        }
        if payload.email:
            update_data["email"] = payload.email
        if payload.photoURL:
            update_data["photoURL"] = payload.photoURL

        user_ref.set(update_data, merge=True)
        return {"status": "synced", "uid": uid}
    except Exception as e:
        logger.error("Failed to sync progress for UID %s: %s", uid, e)
        raise HTTPException(status_code=500, detail=f"Failed to sync progress: {e}")

@router.get("/firebase/profile")
async def get_profile(authorization: Optional[str] = Header(None)):
    """Fetch user's cloud save data from Firestore."""
    uid = get_auth_uid(authorization)

    if not _db:
        raise HTTPException(status_code=503, detail="Firestore is not connected.")

    try:
        doc = _db.collection("users").document(uid).get()
        if not doc.exists:
            return {"exists": False, "uid": uid, "profile": None}
        return {"exists": True, "uid": uid, "profile": doc.to_dict()}
    except Exception as e:
        logger.error("Failed to load profile for UID %s: %s", uid, e)
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {e}")

@router.post("/firebase/duel-result")
async def record_duel_result(
    payload: DuelResultPayload,
    authorization: Optional[str] = Header(None)
):
    """Save duel match outcome to Firestore."""
    uid = get_auth_uid(authorization)

    if not _db:
        raise HTTPException(status_code=503, detail="Firestore is not connected.")

    try:
        import google.cloud.firestore as gcf
        match_ref = _db.collection("duel_matches").document()
        match_ref.set({
            "roomCode": payload.roomCode,
            "mode": payload.mode,
            "winner": payload.winner,
            "players": payload.players,
            "recordedBy": uid,
            "scores": payload.scores or {},
            "timestamp": gcf.SERVER_TIMESTAMP,
        })
        return {"status": "recorded", "matchId": match_ref.id}
    except Exception as e:
        logger.error("Failed to record duel result: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to record duel result: {e}")
