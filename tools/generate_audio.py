"""Generate the Turbo Drive audio pack into game/audio/ (pip install requests).

  ELEVENLABS_API_KEY=sk_...  python tools/generate_audio.py   # direct ElevenLabs (needs an account in good standing)
  FAL_KEY=...                python tools/generate_audio.py   # same ElevenLabs model via fal.ai
"""
import os
import time
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "game", "audio")

# (folder, file name, prompt, seconds, loop)
SOUNDS = [
    ("sfx", "engine_idle", "Steady sports car engine idling, low rumbling V8 idle, constant rpm, close mic, no music", 4, True),
    ("sfx", "engine_rev", "Sports car engine at high rpm under full acceleration, constant aggressive roaring engine drone, steady pitch, close mic", 4, True),
    ("sfx", "nitro_boost", "Turbo nitro boost burst, pressurized gas whoosh with rising engine roar and turbo whistle, arcade racing game", 2, False),
    ("sfx", "tire_screech", "Car tires screeching on asphalt, short skid", 1.5, False),
    ("sfx", "crash", "Car crash impact, metal crunch, glass shatter and debris, video game", 2, False),
    ("sfx", "whoosh", "Fast car pass-by whoosh, quick air swoosh", 1.2, False),
    ("sfx", "land", "Heavy car landing on the road after a jump, suspension thud and tire bump", 1, False),
    ("sfx", "space_ambience", "Deep space ambience, dark airy cosmic drone with subtle shimmering textures, calm, no music, seamless", 20, True),
    ("sfx", "scifi_hum", "Sci-fi spaceship engine hum, low electronic drone with soft pulsing, steady", 10, True),
    ("sfx", "coin", "Bright arcade coin pickup chime, short sparkly ding", 0.6, False),
    ("sfx", "countdown_beep", "Single short electronic race countdown beep, arcade", 0.5, False),
    ("sfx", "countdown_go", "Race start GO signal, higher pitched long electronic beep with a punchy synth hit, arcade", 1.2, False),
    ("sfx", "checkpoint", "Positive arcade checkpoint chime, two rising synth notes", 1, False),
    ("sfx", "flip", "Quick arcade bonus whoosh with rising sparkle, stunt trick reward", 0.8, False),
    ("sfx", "win", "Short victory fanfare jingle, upbeat synth arcade racing game, triumphant", 3.5, False),
    ("sfx", "lose", "Short game over sting, descending sad synth tones, arcade", 2.5, False),
    ("sfx", "ui_click", "Clean soft UI button click, modern game menu", 0.5, False),
    ("sfx", "ui_hover", "Subtle soft UI hover tick, light airy blip, game menu", 0.5, False),
    ("music", "menu_theme", "Calm spacey ambient synthwave loop, warm analog synth pads and slow gentle arpeggio, starry dreamy atmosphere, steady seamless background bed", 22, True),
    ("music", "race_theme", "High-energy synthwave racing loop, punchy electronic drum beat, pulsing driving bassline, bright arpeggiated synth, steady tempo, seamless background bed", 22, True),
]


def eleven(body):
    r = requests.post("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
                      headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]},
                      json={**body, "model_id": "eleven_text_to_sound_v2"}, timeout=120)
    if not r.ok:
        raise RuntimeError(f"{r.status_code} {r.text[:300]}")
    return r.content


def fal(body):
    h = {"Authorization": f"Key {os.environ['FAL_KEY']}"}
    r = requests.post("https://queue.fal.run/fal-ai/elevenlabs/sound-effects/v2", headers=h,
                      json={**body, "output_format": "mp3_44100_128"}, timeout=60)
    if not r.ok:
        raise RuntimeError(f"{r.status_code} {r.text[:300]}")
    sub = r.json()
    for _ in range(300):
        st = requests.get(sub["status_url"], headers=h, timeout=30).json().get("status")
        if st == "COMPLETED":
            url = requests.get(sub["response_url"], headers=h, timeout=60).json()["audio"]["url"]
            return requests.get(url, timeout=60).content
        if st in ("FAILED", "ERROR", "CANCELLED"):
            raise RuntimeError(st)
        time.sleep(2)
    raise RuntimeError("timeout")


def make(item):
    folder, name, prompt, secs, loop = item
    path = os.path.join(ROOT, folder, name + ".mp3")
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return name, "exists"
    body = {"text": prompt, "duration_seconds": secs, "loop": loop, "prompt_influence": 0.5}
    try:
        data = eleven(body) if os.environ.get("ELEVENLABS_API_KEY") else fal(body)
    except Exception as e:
        return name, f"FAILED: {e}"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return name, "ok"


if __name__ == "__main__":
    if not (os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("FAL_KEY")):
        raise SystemExit("Set ELEVENLABS_API_KEY or FAL_KEY first.")
    with ThreadPoolExecutor(4) as ex:
        for name, status in ex.map(make, SOUNDS):
            print(f"{name:16s} {status}")
