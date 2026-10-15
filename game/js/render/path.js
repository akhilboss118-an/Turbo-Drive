/* eslint-disable */
'use strict';
/* Curved-road mapping. The physics runs in 2D along s (= x); for levels with turn/bank segments the renderer maps
   (s, y, lateral) onto the 3D centreline. On straight levels track.path is null and every call is the identity. */
const _pf = {}, _Q = new THREE.Quaternion(), _M = new THREE.Matrix4(), _d = new THREE.Vector3(), _u = new THREE.Vector3(), _r = new THREE.Vector3();
const _AZ = new THREE.Vector3(0, 0, 1), _AX = new THREE.Vector3(1, 0, 0), _AY = new THREE.Vector3(0, 1, 0);
// reference road height at s (also inside gaps), used as the pivot when the road is banked
function refH(s) {
  const P = track.pieces; let prev = null;
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    if (s >= p.x0 && s <= p.x1) return p.fn(s);
    if (p.x1 < s) prev = p; else { return prev ? prev.fn(prev.x1) + (p.fn(p.x0) - prev.fn(prev.x1)) * (s - prev.x1) / (p.x0 - prev.x1) : p.fn(p.x0); }
  }
  return prev ? prev.fn(prev.x1) : 0;
}
// track space (s, y, lat) -> world. href = road height under that point (pivot of the banking).
function toWorld(s, y, lat, out, href) {
  out = out || new THREE.Vector3();
  const pa = track.path; if (!pa) return out.set(s, y, lat);
  const f = pa.at(s, _pf), cb = Math.cos(f.bank), sb = Math.sin(f.bank), cp = Math.cos(f.psi), sp = Math.sin(f.psi);
  const h = href === undefined ? refH(s) : href, dy = y - h;
  // right vector r = (sin psi, 0, cos psi); banked up = up*cb - r*sb; banked lateral = r*cb + up*sb
  const rr = dy * -sb + lat * cb;
  return out.set(f.x + sp * rr, h + dy * cb + lat * sb, f.z + cp * rr);
}
// orientation of the road frame at s (x = travel direction, y = road normal, z = right). Identity on straight levels.
function frameQuat(s, out) {
  out = out || new THREE.Quaternion();
  const pa = track.path; if (!pa) return out.set(0, 0, 0, 1);
  const f = pa.at(s, _pf), cb = Math.cos(f.bank), sb = Math.sin(f.bank), cp = Math.cos(f.psi), sp = Math.sin(f.psi);
  _d.set(cp, 0, -sp); _r.set(sp, 0, cp);
  _u.set(0, cb, 0).addScaledVector(_r, -sb);
  const rb = _r.clone().multiplyScalar(cb).addScaledVector(_AY, sb);
  _M.makeBasis(_d, _u, rb); return out.setFromRotationMatrix(_M);
}
// put an object at (s, y, lat) with the road's frame (gates, posts, hazards...)
function placeOnRoad(obj, s, y, lat, href) {
  toWorld(s, y, lat || 0, obj.position, href);
  if (track.path) frameQuat(s, obj.quaternion);
  return obj;
}
// rotate a track-space velocity (along, up, lateral) into world axes
function toWorldVel(s, vx, vy, vz, out) {
  const pa = track.path; if (!pa) return out.set(vx, vy, vz);
  const f = pa.at(s, _pf), cp = Math.cos(f.psi), sp = Math.sin(f.psi);
  return out.set(cp * vx + sp * vz, vy, -sp * vx + cp * vz);
}
// make a particle system accept track-space coordinates
const _pw = new THREE.Vector3(), _vw = new THREE.Vector3();
function wrapEmit(sys) {
  const raw = sys.emit;
  sys.emit = function (x, y, z, vx, vy, vz, a, b, c, d, e) {
    if (!track.path) return raw(x, y, z, vx, vy, vz, a, b, c, d, e);
    toWorld(x, y, z, _pw); toWorldVel(x, vx, vy, vz, _vw);
    return raw(_pw.x, _pw.y, _pw.z, _vw.x, _vw.y, _vw.z, a, b, c, d, e);
  };
}
const carW = new THREE.Vector3(), carQ = new THREE.Quaternion(), _qz = new THREE.Quaternion();
const rotQ = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a);
