# Space Battle Ending (v43)
UFO health 0 -> VICTORY (explosion + slow-mo ~2s, input/spawns stopped, bullets cleared) -> CREDITS (skippable after 2s) -> CINEMATIC (procedural Earth, skippable) -> END ("Thank you for playing" + Main Menu).
- Code: game/js/game/ending.js, game/css/ending.css; hooks in dogfight.js (dfWin, dfEnding, dfTick, dfCamera), game.js (setState), audio.js (calm pad for ending).
- Victory wins if player and UFO die in the same frame. Pause is disabled during the ending. Main Menu fully resets the fight without reloading the page.
- Progress/coins/stars are saved when the UFO dies (same as the old results screen).
