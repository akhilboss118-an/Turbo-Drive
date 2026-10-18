/* eslint-disable */
'use strict';
/* Studio splash: logo + title fade/zoom in, "Developed by AkhilBoss" typewriter, everything fades out at 6 s, then the loading screen and menu. */
(function () {
  const el = document.getElementById('intro'), out = document.getElementById('introType');
  const TEXT = 'Developed by AkhilBoss';
  let resolve; window.introDone = new Promise((r) => { resolve = r; });
  if (!el) { resolve(); return; }
  el.addEventListener('pointerdown', () => { if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); }, { passive: true });
  setTimeout(() => {
    let i = 0;
    const tick = () => { out.textContent = TEXT.slice(0, ++i); if (i < TEXT.length) setTimeout(tick, 75); };
    tick();
  }, 2300);
  setTimeout(() => el.classList.add('out'), 6000);
  setTimeout(() => {
    const finish = () => { el.remove(); resolve(); };
    let seen = false;
    try { seen = localStorage.getItem('alienIntroSeen') === '1'; } catch (e) {}
    if (seen) { finish(); return; }
    playAlienIntro(finish);
  }, 6850);

  function playAlienIntro(done) {
    const ov = document.createElement('div');
    ov.id = 'alienIntro'; ov.setAttribute('data-testid', 'alien-intro');
    ov.innerHTML = '<video id="alienVid" data-testid="alien-intro-video" src="game/assets/video/alien-attack.mp4" playsinline preload="auto"></video>' +
      '<button id="alienSkip" data-testid="alien-intro-skip" type="button">SKIP &#9654;</button>' +
      '<button id="alienTap" data-testid="alien-intro-tap" type="button" hidden>TAP TO PLAY WITH SOUND</button>' +
      '<div id="alienStory" data-testid="alien-intro-story" hidden><div id="alienStoryText" data-testid="alien-intro-story-text"></div></div>';
    document.body.appendChild(ov);
    const vid = ov.querySelector('#alienVid'), skip = ov.querySelector('#alienSkip'), tap = ov.querySelector('#alienTap');
    const story = ov.querySelector('#alienStory'), st = ov.querySelector('#alienStoryText');
    let ended = false;
    const mark = () => { try { localStorage.setItem('alienIntroSeen', '1'); } catch (e) {} };
    const leave = () => { mark(); ov.classList.add('out'); setTimeout(() => { ov.remove(); done(); }, 700); };
    const MSG = 'I was just vibing to music... then suddenly the Aliens attack the earth.... Help me escape this planet';
    const showStory = () => {
      if (ended) return; ended = true;
      vid.pause(); vid.style.display = 'none'; skip.hidden = true; tap.hidden = true; story.hidden = false;
      let i = 0;
      const tick = () => {
        st.textContent = MSG.slice(0, ++i);
        if (i < MSG.length) setTimeout(tick, MSG[i - 1] === '.' ? 160 : 55); else setTimeout(leave, 2600);
      };
      setTimeout(tick, 500);
    };
    const start = () => { vid.muted = false; return vid.play(); };
    vid.addEventListener('ended', showStory);
    vid.addEventListener('error', showStory);
    skip.addEventListener('click', () => { if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); showStory(); });
    tap.addEventListener('click', () => { if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); tap.hidden = true; start().catch(() => { vid.muted = true; vid.play().catch(showStory); }); });
    ov.addEventListener('pointerdown', () => { if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); }, { passive: true });
    start().catch(() => { tap.hidden = false; });
  }
})();
