# Turbo Drive – Audio

All sounds live in `game/audio/` and are played by `game/js/core/audio.js`.
If a file is missing (or you open index.html straight from disk), the game falls back to its built-in synth sounds, so it always plays.

## Generate the pack (ElevenLabs Sound Effects v2)
    pip install requests
    ELEVENLABS_API_KEY=sk_...  python tools/generate_audio.py     # direct ElevenLabs
    FAL_KEY=...                python tools/generate_audio.py     # same model through fal.ai
Prompts, lengths and loop settings are all in `tools/generate_audio.py`. Files that already exist are skipped, so you can delete one and re-run to regenerate just that one.
Then run `npm start` and refresh. Audio starts on your first click or key press (browsers block it before that).

## Files and when they play
| File | When |
|---|---|
| sfx/engine_idle.mp3 (loop) | Engine at low speed. Volume and pitch follow car speed |
| sfx/engine_rev.mp3 (loop) | Engine under throttle. Crossfades in as speed rises, pitch up to about 1.5x |
| sfx/nitro_boost.mp3 | Nitro kicks in |
| sfx/tire_screech.mp3 | Braking hard at speed (also the launch burnout) |
| sfx/crash.mp3 | Crash |
| sfx/lose.mp3 | Crash sting, about 0.45 s after the impact |
| sfx/whoosh.mp3 | Driving over a boost pad |
| sfx/land.mp3 | Landing a jump (louder and lower on a HARD LANDING) |
| sfx/coin.mp3 | Coin / reward pop (pitch rises with combo) |
| sfx/flip.mp3 | Each live flip in the air |
| sfx/checkpoint.mp3 | Checkpoint, buying upgrades, picking a car |
| sfx/countdown_beep.mp3 | 3, 2, 1 |
| sfx/countdown_go.mp3 | GO! |
| sfx/win.mp3 | Finish line, buying a car or style |
| sfx/ui_click.mp3 | Every menu button |
| sfx/ui_hover.mp3 | Mouse hover on buttons (desktop) |
| music/menu_theme.mp3 (loop) | Menu, levels, garage, settings, results |
| music/race_theme.mp3 (loop) | Countdown and race (quieter when paused or crashed) |
| sfx/space_ambience.mp3 (loop) | Quietly under the menu, and in Level 3 "Space Bridge" |
| sfx/scifi_hum.mp3 (loop) | Level 3 "Space Bridge" only |

Mute: Settings > Sound (On/Off) now mutes music too. Levels in `audio.js`: `VOL` (music/ambience), and the second argument of each `play(...)` call.
