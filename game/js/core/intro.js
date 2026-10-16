/* eslint-disable */
'use strict';
/* Studio splash: logo + title fade/zoom in, "Developed by AkhilBoss" typewriter, then the Alien Invasion cinematic and menu. */
(function () {
  const el = document.getElementById('intro'), out = document.getElementById('introType');
  const TEXT = 'Developed by AkhilBoss';
  let resolve; window.introDone = new Promise((r) => { resolve = r; });
  if (!el) { if (resolve) resolve(); return; }

  let studioSkipped = false;
  let typeTimer = null, fadeTimer = null, finishTimer = null;

  const advanceToAlienIntro = () => {
    if (studioSkipped) return;
    studioSkipped = true;
    clearTimeout(typeTimer); clearTimeout(fadeTimer); clearTimeout(finishTimer);
    el.classList.add('out');
    setTimeout(() => {
      try { el.remove(); } catch (e) {}
      let seen = false;
      try { seen = localStorage.getItem('alienIntroSeen_v26') === '1'; } catch (e) {}
      if (seen) {
        if (resolve) resolve();
        return;
      }
      playAlienIntro(resolve);
    }, 400);
  };

  // Allow clicking anywhere on the studio intro to skip directly to the video
  el.addEventListener('click', advanceToAlienIntro);
  document.addEventListener('keydown', function onIntroKey(e) {
    if (el && el.parentNode && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
      document.removeEventListener('keydown', onIntroKey);
      advanceToAlienIntro();
    }
  });

  typeTimer = setTimeout(() => {
    let i = 0;
    const tick = () => {
      if (studioSkipped || !out) return;
      out.textContent = TEXT.slice(0, ++i);
      if (i < TEXT.length) setTimeout(tick, 60);
    };
    tick();
  }, 1200);

  fadeTimer = setTimeout(() => {
    if (!studioSkipped) el.classList.add('out');
  }, 4200);

  finishTimer = setTimeout(advanceToAlienIntro, 4800);

  function playAlienIntro(done) {
    if (typeof done !== 'function') done = () => {};
    const existing = document.getElementById('alienIntro');
    if (existing) { try { existing.remove(); } catch (e) {} }

    const ov = document.createElement('div');
    ov.id = 'alienIntro';
    ov.setAttribute('data-testid', 'alien-intro');
    ov.innerHTML =
      '<video id="alienVid" data-testid="alien-intro-video" src="game/assets/video/alien-attack.mp4" playsinline preload="auto"></video>' +
      '<button id="alienSkip" data-testid="alien-intro-skip" type="button">SKIP &#9654;</button>' +
      '<button id="alienTap" data-testid="alien-intro-tap" type="button">&#128266; TAP FOR SOUND</button>' +
      '<div id="alienStory" data-testid="alien-intro-story" hidden>' +
        '<div id="alienStoryText" data-testid="alien-intro-story-text"></div>' +
        '<button id="alienStoryContinue" data-testid="alien-intro-continue" type="button">CONTINUE &#9654;</button>' +
      '</div>';
    document.body.appendChild(ov);

    const vid = ov.querySelector('#alienVid');
    const skip = ov.querySelector('#alienSkip');
    const tap = ov.querySelector('#alienTap');
    const story = ov.querySelector('#alienStory');
    const st = ov.querySelector('#alienStoryText');
    const cont = ov.querySelector('#alienStoryContinue');

    let ended = false;
    const markSeen = () => {
      try { localStorage.setItem('alienIntroSeen_v26', '1'); } catch (e) {}
    };

    const leave = () => {
      markSeen();
      ov.classList.add('out');
      setTimeout(() => {
        try { ov.remove(); } catch (e) {}
        done();
      }, 500);
    };

    const MSG = 'I was just vibing to music... then suddenly the Aliens attack the earth.... Help me escape this planet';

    const showStory = () => {
      if (ended) return;
      ended = true;
      try { vid.pause(); } catch (e) {}
      vid.style.display = 'none';
      skip.hidden = true;
      tap.hidden = true;
      story.hidden = false;

      let i = 0;
      let tickTimer = null;
      const tick = () => {
        st.textContent = MSG.slice(0, ++i);
        if (i < MSG.length) {
          tickTimer = setTimeout(tick, MSG[i - 1] === '.' ? 140 : 45);
        } else {
          setTimeout(leave, 3200);
        }
      };
      cont.addEventListener('click', () => {
        clearTimeout(tickTimer);
        leave();
      });
      setTimeout(tick, 300);
    };

    const unmute = () => {
      vid.muted = false;
      tap.hidden = true;
      vid.play().catch(() => {});
    };

    tap.addEventListener('click', (e) => {
      e.stopPropagation();
      unmute();
    });

    ov.addEventListener('click', (e) => {
      if (e.target === skip || e.target === cont) return;
      if (vid.muted) unmute();
    });

    vid.addEventListener('ended', showStory);
    skip.addEventListener('click', showStory);

    // Start video muted to ensure 100% reliable autoplay across all browsers and devices
    vid.muted = true;
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        tap.hidden = false;
      }).catch(() => {
        tap.hidden = false;
        tap.textContent = '&#9654; TAP TO PLAY VIDEO';
      });
    }
  }

  window.playAlienIntro = function (cb) {
    playAlienIntro(cb || (() => {}));
  };
})();
