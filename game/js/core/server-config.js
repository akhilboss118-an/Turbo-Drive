/* eslint-disable */
/* Where the duel server lives.
   - In the web build served by the live backend, it is simply this page's own origin.
   - In the Android (Capacitor) app and the standalone ZIP (localhost / file://), it must point at the live server:
     edit TD_LIVE_SERVER below (or open the page with ?server=https://your-server). */
(function () {
  var TD_LIVE_SERVER = 'https://turbo-drive-duel.onrender.com';
  var loc = window.location, h = loc.hostname, web = /^https?:$/.test(loc.protocol);
  var local = !web || h === 'localhost' || h === '127.0.0.1' || h === '' || !!window.Capacitor;
  var q = null; try { q = new URLSearchParams(loc.search).get('server'); } catch (e) {}
  var TD_SHOOT_SERVER = 'https://turbo-drive-duel.onrender.com';
  var qs = null; try { qs = new URLSearchParams(loc.search).get('shoot'); } catch (e) {}
  window.TD_SHOOT_SERVER = (qs || (local ? TD_SHOOT_SERVER : loc.origin)).replace(/\/+$/, '');
  window.TD_SERVER = (q || (local ? TD_LIVE_SERVER : loc.origin)).replace(/\/+$/, '');
})();
