/* eslint-disable */
'use strict';
/* Studio splash: logo + title fade/zoom in, "Developed by AkhilBoss" typewriter, everything fades out at 6 s, then the loading screen and menu. */
(function () {
  const el = document.getElementById('intro'), out = document.getElementById('introType');
  const TEXT = 'Developed by AkhilBoss';
  let resolve; window.introDone = new Promise((r) => { resolve = r; });
  if (!el) { resolve(); return; }
  setTimeout(() => {
    let i = 0;
    const tick = () => { out.textContent = TEXT.slice(0, ++i); if (i < TEXT.length) setTimeout(tick, 75); };
    tick();
  }, 2300);
  setTimeout(() => el.classList.add('out'), 6000);
  setTimeout(() => { el.remove(); resolve(); }, 6850);
})();
