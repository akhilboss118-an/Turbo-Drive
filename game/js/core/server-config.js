/* eslint-disable */
/* Where the duel server lives.
   - In the web build served by the live backend, it is simply this page's own origin.
   - In the Android (Capacitor) app and the standalone ZIP (localhost / file://), it must point at the live server:
     edit TD_LIVE_SERVER below (or open the page with ?server=https://your-server). */
(function () {
  var TD_LIVE_SERVER = 'https://turbo-drive-duel.onrender.com';
  var loc = window.location, web = /^https?:$/.test(loc.protocol);
  var isApp = !web || !!window.Capacitor;
  var q = null; try { q = new URLSearchParams(loc.search).get('server'); } catch (e) {}
  window.TD_SERVER = (q || (isApp ? TD_LIVE_SERVER : loc.origin)).replace(/\/+$/, '');
})();
