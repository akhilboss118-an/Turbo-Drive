import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from server.duel import router as duel_router, janitor

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background cleanup task for inactive duel rooms
    task = asyncio.create_task(janitor())
    try:
        yield
    finally:
        task.cancel()

app = FastAPI(title="Turbo Drive Duel", lifespan=lifespan)

# Enable CORS so WebSockets and API work across domains and devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Duel API and WebSocket routes
app.include_router(duel_router, prefix="/api")

# Render health check endpoint
@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "turbo-drive-duel"}

# Register standard MIME types for 3D models and PWA assets
import mimetypes
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("model/gltf+json", ".gltf")
mimetypes.add_type("audio/mpeg", ".mp3")
mimetypes.add_type("application/manifest+json", ".webmanifest")

# Serve the static game client at the root URL
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
