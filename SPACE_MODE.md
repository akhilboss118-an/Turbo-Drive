# Deep Space (levels 21-24)
- Finish level 20 -> cinematic Moon launch + warp -> level 21 (Jupiter), then level 22 (Saturn rings) + credits.
- Zero-g flight, no road. Fly through checkpoint rings (missed ring = +3s), dodge asteroid rows, collect gold orbs.
- Controls: on-screen LEFT / RIGHT buttons (touch + mouse), keyboard A/D or arrows. W/Space = gas, S = brake, Shift = nitro.
- Code: game/js/render/space.js (scenery + course), game/js/game/spaceflight.js (flight physics, camera, HUD), game/js/game/cutscene.js (launch cinematic).
- Levels 23 (Uranus, icy cyan, tilted rings) and 24 (Neptune, deep blue storms + dark spot, Triton moon) are faster (course.spd 1.3 / 1.55) with far fewer asteroid rows. Finishing 24 plays the credits: 'YOU HAVE REACHED <PLANET> PLANET'. Courses: SPACE_COURSES in render/space.js.
- Arrival fly-by: finishing a space level plays an 8 s cinematic (orbit, then camera swings to the planet with an 'ARRIVING AT <PLANET>' caption). Code: spaceTick/spaceCamera in spaceflight.js (FLYBY_T, FLYBY_INFO).
- Secret level 25 (Pluto): hidden until level 24 is beaten; Charon moon, heart-shaped glacier, speed 1.7. Ending credits also play after 25 and name the planet reached.

- Pluto finale cinematic (level 25): after the last ring a ~34 s live 3D cinematic plays before the results: the UFO chases the hover, the hover dives into Pluto, hides in an ice canyon under a glacier arch (heart-shaped glacier on the floor), lands with engines off and the UFO loses it, then 'SAFE - YOU ENTERED PLUTO REGION'. Code: game/js/game/plutoscene.js (hooks in cutscene.js, game.js showResults, spaceflight.js). 'Watch ending' on level 25 replays it, then the credits.
