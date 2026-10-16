/* eslint-disable */
'use strict';
/* Sign-in screen (Google / Guest) shown before the main menu + profile icon and profile card */
(function () {
  const A = AuthService, esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const initial = (u) => (u.isGuest ? '' : (u.name || '?').trim().charAt(0).toUpperCase());
  function avatar(u, cls) {
    if (u.photoURL) return '<img class="' + cls + '" alt="" src="' + esc(u.photoURL) + '" referrerpolicy="no-referrer">';
    return '<span class="' + cls + (u.isGuest ? ' guest' : '') + '">' + (u.isGuest ? '<svg class="ico"><use href="#i-user"/></svg>' : esc(initial(u))) + '</span>';
  }
  function renderSlot() {
    const u = A.user, s = $('authSlot'); if (!s) return;
    s.innerHTML = u ? '<button class="profBtn' + (u.isGuest ? ' isGuest' : '') + '" id="btnProfile" data-testid="profile-icon-btn" aria-label="Profile: ' + esc(u.name) + '">' + avatar(u, 'av') + '<span class="pn" data-testid="profile-icon-name">' + esc(u.name) + '</span></button>' : '';
    const b = $('btnProfile'); if (b) b.addEventListener('click', (e) => { e.preventDefault(); Snd.init(); openProfile(); });
  }
  function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
  function renderProfile() {
    const u = A.user; if (!u) return; const box = $('profBody');
    box.innerHTML =
      '<div class="pfTop">' + avatar(u, 'pfAv') + '<div class="pfWho"><span class="pfBadge ' + (u.isGuest ? 'g' : 'ok') + '" data-testid="profile-account-type">' + (u.isGuest ? 'Guest' : 'Google') + '</span>' +
      '<input id="pfName" class="pfName" data-testid="profile-name-input" maxlength="16" value="' + esc(u.name) + '" autocomplete="off" spellcheck="false" aria-label="Display name">' +
      '<div class="pfMail" data-testid="profile-email">' + (u.email ? esc(u.email) : 'Not signed in with an account') + '</div></div></div>' +
      '<div class="pfGrid">' +
      '<div data-testid="profile-stat-coins"><b>' + coins + '</b><small>Coins</small></div>' +
      '<div data-testid="profile-stat-stars"><b>' + totalStars() + '/' + CAMPAIGN_LEVELS * 3 + '</b><small>Stars</small></div>' +
      '<div data-testid="profile-stat-levels"><b>' + unlocked + '/' + CAMPAIGN_LEVELS + '</b><small>Levels open</small></div>' +
      '<div data-testid="profile-stat-cars"><b>' + owned.length + '/' + VEHICLES.length + '</b><small>Cars owned</small></div></div>' +
      '<div class="pfMeta"><span>ID <code data-testid="profile-uid">' + esc(u.uid.slice(0, 14)) + '</code></span><span>Joined ' + fmtDate(u.createdAt) + '</span></div>' +
      (u.isGuest ? '<p class="pfNote" data-testid="profile-guest-note">Guest progress lives on this device only. Sign in with Google to keep it safe.</p><button class="lgBtn google" id="btnPfGoogle" data-testid="profile-google-btn">' + GOOGLE_SVG + '<span>Sign in with Google</span></button>' : '') +
      '<button class="lgBtn out" id="btnPfOut" data-testid="profile-signout-btn"><span>Sign out</span></button>';
    $('pfName').addEventListener('change', (e) => { const n = e.target.value.trim().slice(0, 16); if (n) { A.updateProfile({ name: n }); try { const d = $('duelNick'); if (d) d.value = n; } catch (x) {} } renderSlot(); });
    const g = $('btnPfGoogle'); if (g) g.addEventListener('click', async () => { Snd.click(); g.disabled = true; try { await A.signInWithGoogle(); toast('SIGNED IN', 'Your guest progress is now linked to your account', 'good'); } catch (e) { toast('SIGN-IN FAILED', (e && e.message) || 'Try again', 'warn'); } renderSlot(); renderProfile(); });
    $('btnPfOut').addEventListener('click', async () => { Snd.click(); await A.signOut(); });
  }
  function openProfile() { renderProfile(); $('profile').classList.remove('hidden'); Snd.click(); }
  function closeProfile() { $('profile').classList.add('hidden'); }
  const GOOGLE_SVG = '<svg class="gG" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  $('lgGoogleIc').innerHTML = GOOGLE_SVG;
  function busy(on) { for (const id of ['btnLgGoogle', 'btnLgGuest']) $(id).disabled = on; $('lgErr').textContent = ''; }
  async function run(fn) { Snd.init(); Snd.click(); busy(true); try { await fn(); } catch (e) { $('lgErr').textContent = (e && e.code === 'auth/popup-closed-by-user') ? 'Sign-in cancelled.' : ((e && e.message) || 'Sign-in failed, please try again.'); } busy(false); }
  $('btnLgGoogle').addEventListener('click', (e) => { e.preventDefault(); run(() => A.signInWithGoogle()); });
  $('btnLgGuest').addEventListener('click', (e) => { e.preventDefault(); run(() => A.signInAsGuest()); });
  $('btnPfClose').addEventListener('click', (e) => { e.preventDefault(); Snd.click(); closeProfile(); });
  $('profile').addEventListener('click', (e) => { if (e.target.id === 'profile') closeProfile(); });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape' && !$('profile').classList.contains('hidden')) closeProfile(); });
  $('lgMode').classList.toggle('hidden', A.mode !== 'mock');
  A.onChange((u) => {
    closeProfile(); renderSlot(); $('lgMode').classList.toggle('hidden', A.mode !== 'mock');
    if (u && state === 'login') { refreshMenu(); setState('menu'); Snd.win && Snd.win(); }
    else if (!u && state !== 'login') { clearInput(); setState('login'); }
  });
  renderSlot();
  window.openProfile = openProfile;
})();
