# Turbo Drive 🏎️🚀🌌

[![Version](https://img.shields.io/badge/version-v5.4.0-brightgreen.svg)](https://github.com/akhilboss118-an/Turbo-Drive/releases/tag/v5.4)
[![Live Game](https://img.shields.io/badge/Render-Live_Game-00e5ff?logo=render)](https://turbo-drive-duel.onrender.com)
[![Android APK](https://img.shields.io/badge/Android-APK_v5.4-3DDC84?logo=android)](https://github.com/akhilboss118-an/Turbo-Drive/releases/tag/v5.4)
[![Backend](https://img.shields.io/badge/Backend-FastAPI_%7C_WebSockets_%7C_WebRTC-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Engine](https://img.shields.io/badge/Engine-Three.js-black?logo=three.js)](https://threejs.org)

**Turbo Drive** is a high-octane 3D stunt racing, planetary exploration, zero-g space dogfight, and real-time multiplayer duel game. Built with pure Three.js, vanilla JavaScript, and modern CSS3, powered by a FastAPI WebSocket & WebRTC multiplayer backend.

---

## 🎮 Play & Download

- **🌐 Play Online (Web / Desktop / Mobile)**: [https://turbo-drive-duel.onrender.com](https://turbo-drive-duel.onrender.com)
- **📱 Download Android APK**: [Turbo Drive v5.4 APK](https://github.com/akhilboss118-an/Turbo-Drive/releases/tag/v5.4) (Download `turbo-drive-v5.4.apk` for direct sideloading)

---

## ✨ Key Features in v5.4

- **📺 Automatic Browser Fullscreen**: Launches directly into immersive true fullscreen mode upon first interaction on desktop, tablet, and mobile browsers. Dedicated fullscreen toggle button in the top bar, Settings, and Pause menu.
- **🥊 3D Online Shooting Duel**: Real-time 3D third-person multiplayer arena on Pluto's surface (Level 27). Dynamic laser tracers, impact sparks, crosshair hit markers, health bars, and server-authoritative damage.
- **🔒 Private Duel Rooms & Custom Goals**: Host generates a 5-character private room code to invite a friend with copy/share buttons. Choose match duration: **10, 20, or 40 kills** to win.
- **💬 Tactical Quick Chat ("Quips")**: Send instant battle quips (<kbd>1</kbd>–<kbd>6</kbd>): *"Nice shot!"*, *"Good game"*, *"Too easy"*, *"Watch out!"*, *"Oops, sorry"*, *"Rematch?"* with transient HUD feed.
- **🎙️ Peer-to-Peer WebRTC Voice Chat**: Live bidirectional in-game audio between duelists. WebRTC signaling rides directly over the duel WebSocket connection. Includes mic toggle (<kbd>M</kbd>), opponent mute (<kbd>V</kbd>), volume slider, and talking visualizers.
- **🏁 Grand Oval 3-Lap Race (Level 29)**: NASCAR-inspired 972-meter closed circuit with banked turns, multi-tiered spectator stands, canopy roof, and lap counter.
- **🛸 Space Battle (Level 28)**: 3D dogfight in orbit around the International Space Station against an alien mothership featuring twin blasters and telegraphed laser barrages.
- **🪐 Deep Space Exploration (Levels 21–24)**: Zero-g interplanetary courses around Jupiter and Saturn rings with floating checkpoint rings and asteroid fields.
- **👽 Alien Chase**: A stalking UFO chases the player across all single-player stages, swooping down with a tractor beam when crashing.
- **🚗 Garage & Customization**: Upgrade speed, acceleration, handling, and nitro across multiple unlockable sports cars, monster trucks, police cruisers, and hovercraft.

---

## 🕹️ Controls & Keybindings

### 🏎️ Vehicle Driving (Race & Stunt Levels)

| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Accelerate / Gas** | <kbd>W</kbd> / <kbd>Up Arrow</kbd> / <kbd>Space</kbd> | Hold **GAS** button |
| **Brake / Reverse** | <kbd>S</kbd> / <kbd>Down Arrow</kbd> | Tap **BRAKE** button |
| **Tilt Left (Nose Up)** | <kbd>A</kbd> / <kbd>Left Arrow</kbd> | Tap **TILT LEFT** button |
| **Tilt Right (Nose Down)** | <kbd>D</kbd> / <kbd>Right Arrow</kbd> | Tap **TILT RIGHT** button |
| **Nitro Boost** | <kbd>Left Shift</kbd> | Tap **NITRO** button |
| **Steer (Space Mode)** | <kbd>A</kbd> / <kbd>D</kbd> / Left / Right | On-screen Left / Right buttons |
| **Toggle Fullscreen** | <kbd>F</kbd> | Tap Fullscreen icon in top bar |
| **Pause Game** | <kbd>Esc</kbd> | Tap Pause icon (<kbd>&#10074;&#10074;</kbd>) |

### 🔫 3D Shooting Duel & On-Foot Controls

| Action | Keyboard & Mouse | Touch / Mobile |
| :--- | :--- | :--- |
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Virtual Left Joystick |
| **Aim / Look** | Move Mouse (Pointer Lock) | Swipe Right Look Zone |
| **Fire Blaster** | Left Click / <kbd>F</kbd> | Tap **FIRE** button |
| **Reload** | <kbd>R</kbd> | Tap **RELOAD** button |
| **Sprint** | <kbd>Left Shift</kbd> | Double-tap joystick |
| **Interact / Build** | <kbd>E</kbd> | Tap **USE** button |
| **Quick Quips** | <kbd>1</kbd> to <kbd>6</kbd> | Tap Quip buttons on HUD |
| **Toggle Microphone** | <kbd>M</kbd> | Tap **MIC** button |
| **Mute Opponent** | <kbd>V</kbd> | Tap Speaker button |

---

## 🚀 Getting Started Locally

### Option A: Python Backend (Recommended - Full Multiplayer & Web Client)

Requirements: Python 3.9+ with `pip`.

```bash
# 1. Clone the repository
git clone https://github.com/akhilboss118-an/Turbo-Drive.git
cd Turbo-Drive

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch the server (serves game client + WebSocket/WebRTC APIs)
python main.py
```
Open **`http://localhost:8000`** in your browser.

*To test local multiplayer across devices on the same Wi-Fi network, open `http://<YOUR_LAN_IP>:8000` on your phone or laptop.*

### Option B: Node.js Dev Server

Requirements: Node.js 18+.

```bash
npm start
```
Serves static game files on **`http://localhost:3000`**.

### Option C: Building the Android APK

Requirements: Android SDK, JDK 17, and Gradle.

```bash
# Prepare web assets and sync Capacitor
npm run cap:sync

# Assemble Android debug APK
cd android
./gradlew assembleDebug
```
The output APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📁 Repository Structure

```text
Turbo-Drive/
├── android/               # Capacitor Android native project & Gradle build
├── docs/                  # Detailed documentation for all game modes & systems
│   ├── development/       # Local development & engine setup guide
│   ├── modes/             # Mode guides (Shooting Duel, Race Duel, Space Battle, Alien Chase)
│   └── systems/           # Subsystem guides (Audio, Firebase Auth, Ending Cutscenes)
├── game/
│   ├── assets/            # 3D models (GLB/FBX), textures, logos, and cutscene video
│   ├── audio/             # Sound effects (SFX) and background music (OST)
│   ├── css/               # Modular CSS sheets (HUD, menus, duels, dogfights)
│   └── js/
│       ├── core/          # Engine core (config, audio, auth, orientation, input, pwa)
│       ├── data/          # 3D vehicle specs, crate data, and track models
│       ├── duel/          # Race duel & 3D shooting duel engines, WebRTC voice chat
│       ├── game/          # Game state loop, on-foot survival, dogfight, cosmetics
│       ├── lib/           # Three.js r128, GLTFLoader, FBXLoader, fflate
│       ├── render/        # Track rendering, biomes (Desert, Moon, Ice, Lava, Space, Jungle)
│       └── ui/            # UI event bindings, shop, garage, accounts, crates
├── scripts/               # Build helpers and prepare-www sync script
├── server/                # Python backend routers (race duel & shooting duel servers)
├── main.py                # Primary FastAPI production server & static file host
├── index.html             # Main application entry point & SVG asset defs
├── manifest.webmanifest   # Progressive Web App (PWA) manifest
├── package.json           # Project manifest and capacitor scripts
├── render.yaml            # Render deployment blueprint
├── requirements.txt       # Python dependencies (fastapi, uvicorn, websockets)
└── sw.js                  # PWA service worker with offline cache
```

---

## 📚 Documentation Index

Detailed architectural and design guides are organized under the [`docs/`](docs/) directory:

| Document | Description |
| :--- | :--- |
| [Shooting Duel Guide](docs/modes/shooting-duel.md) | 3D shooting duel arena, private rooms, kill goals, and WebRTC voice setup |
| [Race Duel Guide](docs/modes/race-duel.md) | 1v1 online race matchmaking, room codes, and latency sync |
| [Infinite Loop Circuit](docs/modes/infinite-loop.md) | 5-lap closed circuit specification and hazard mechanics |
| [Space Battle Guide](docs/modes/space-battle.md) | Level 28 orbital boss dogfight mechanics and phase progression |
| [Deep Space Flight](docs/modes/deep-space.md) | Levels 21–24 zero-g flight physics and ring checkpoints |
| [Alien Chase System](docs/modes/alien-chase.md) | UFO tractor-beam stalker AI and fail-state handling |
| [Audio Architecture](docs/systems/audio.md) | Web Audio synth synthesis and audio asset fallbacks |
| [Cutscene & Ending System](docs/systems/ending.md) | Victory sequence, procedural credits, and cinematic transitions |
| [Firebase Auth Integration](docs/systems/firebase-setup.md) | Setup instructions for Google OAuth and Firestore cloud saves |
| [Local Development Guide](docs/development/local-setup.md) | Comprehensive engineering walkthrough and developer commands |

---

## 📄 License & Credits

Developed with ❤️ by **AkhilBoss** (*A Little Hearts Production*).
All original code and game design licensed under the MIT License.
