// Procedural STYLIZED Wat Arun (project-owned, no third-party geometry). Not an accurate replica.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

// FileReader polyfill for GLTFExporter in Node
globalThis.FileReader = class { readAsArrayBuffer(b){ b.arrayBuffer().then(r=>{this.result=r;this.onloadend&&this.onloadend();}); }
  readAsDataURL(b){ b.arrayBuffer().then(r=>{this.result='data:application/octet-stream;base64,'+Buffer.from(r).toString('base64');this.onloadend&&this.onloadend();}); } };

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'wat-arun-stylized.glb');
const C = h => new THREE.Color(h);
// Material table: colours are baked in vertex colours; materials differ in PBR params only.
const MATS = {
  MOSAIC:{r:.55,m:0}, GOLD:{r:.4,m:.3}, ROOF:{r:.6,m:0}, STONE:{r:.85,m:0}, WALL:{r:.7,m:0},
  WATER:{r:.12,m:.1}, GROUND:{r:.95,m:0}, WOOD:{r:.7,m:0}, FOLIAGE:{r:.9,m:0},
};
const MAT_KEYS = Object.keys(MATS);
const PAL = { white:C('#f4ecdd'), warm:C('#e9dcc3'), blue:C('#4f8fa6'), teal:C('#3f9a8e'), terra:C('#c9714a'), rose:C('#d9a39a'), gold:C('#d9aa3c'),
  roof:C('#b4553a'), stone:C('#bfb4a2'), wall:C('#f1e6d0'), water:C('#4a9bb0'), ground:C('#c8c09e'), grass:C('#8fae72'), wood:C('#6b4128'), leaf:C('#5f8f55') };

let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

// ---- geometry helpers: each returns {g, mat} with baked non-indexed geometry
function paint(g, base, { accents = [], rate = 0, jitter = .04, cell = 1.2 } = {}) {
  g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv');
  const p = g.attributes.position, n = p.count / 3, col = new Uint8Array(p.count * 4);
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let t = 0; t < n; t++) {
    v.set(0,0,0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, t*3+k)); v.multiplyScalar(1/3);
    const h = Math.abs(Math.sin(Math.floor(v.x/cell)*12.9898 + Math.floor(v.y/cell)*78.233 + Math.floor(v.z/cell)*37.719) * 43758.5453) % 1;
    if (accents.length && h < rate) c.copy(accents[Math.floor(h/rate*accents.length) % accents.length]);
    else c.copy(base).offsetHSL(0, 0, (h - .5) * jitter * 2);
    for (let k = 0; k < 3; k++) { col[(t*3+k)*4]=c.r*255; col[(t*3+k)*4+1]=c.g*255; col[(t*3+k)*4+2]=c.b*255; col[(t*3+k)*4+3]=255; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4, true)); return g;
}
const place = (g, x=0,y=0,z=0, ry=0) => { g.rotateY(ry); g.translate(x,y,z); return g; };
const frustum = (wb, wt, h, y0, seg=4) => { // square-ish tapered block; widths are side lengths when seg=4
  const k = seg===4 ? Math.SQRT1_2 : .5; const g = new THREE.CylinderGeometry(wt*k, wb*k, h, seg, 1); if (seg===4) g.rotateY(Math.PI/4); g.translate(0, y0+h/2, 0); return g; };
const box = (w,h,d,x,y,z) => { const g = new THREE.BoxGeometry(w,h,d); g.translate(x,y+h/2,z); return g; };
const cone = (r,h,x,y,z,seg) => { const g = new THREE.ConeGeometry(r,h,seg); g.translate(x,y+h/2,z); return g; };

class Part { constructor(){ this.items = []; }
  add(mat, g, base, opt){ this.items.push({ mat, g: paint(g, base, opt) }); return this; } }

// ---- Prang (tiered khmer-style tower). s = scale, D = detail level object
function prang(P, s, D, tiers) {
  const mosaic = { accents:[PAL.blue,PAL.teal,PAL.terra,PAL.rose,PAL.gold], rate:.22, jitter:.05, cell:.9*s };
  // terraces
  let y = 0; const tw = [26,22,18.5].map(w=>w*s);
  tw.forEach((w,i)=>{ const h=.9*s; P.add('STONE', box(w,h,w,0,y,0), PAL.stone, {jitter:.03}); y+=h; });
  // tiers
  let w = 15.5*s; const th = 4.7*s*(tiers>5?1:1.2);
  for (let i=0;i<tiers;i++) {
    const wt = w*0.8; const h = th*(1-i*0.05);
    P.add('MOSAIC', frustum(w, wt, h, y, 4), PAL.white, mosaic);
    if (D.orn) { // band + cornice
      P.add('WALL', box(w*1.04,.28*s,w*1.04,0,y+h-.05*s,0), PAL.warm, {jitter:.02});
      // niche panels on each face
      for (let f=0; f<4; f++) { const a=f*Math.PI/2; const g=box(w*.34,h*.55,.22*s,0,y+h*.18,w*.5*.92); place(g,0,0,0,a); P.add('GOLD', g, PAL.gold, {jitter:.03}); }
      // corner mini-prangs (khmer tier ornaments)
      if (i < tiers-1) for (let q=0;q<4;q++) { const a=q*Math.PI/2+Math.PI/4, rr=w*.5*Math.SQRT2*.80; const x=Math.cos(a)*rr, z=Math.sin(a)*rr;
        P.add('MOSAIC', place(frustum(w*.2,w*.12,h*.55,0,4),x,y+h,z), PAL.white, mosaic);
        P.add('GOLD', cone(w*.07,h*.5,x,y+h+h*.55,z,D.seg), PAL.gold, {jitter:.02}); }
    }
    y += h; w = wt*0.94;
  }
  // crown: lathe bell + spire
  const prof = [[0,0],[.5,0],[.66,.3],[.58,.8],[.38,1.5],[.2,2.1],[0,2.6]].map(([r,yy])=>new THREE.Vector2(r*w*.9, yy*w*.7));
  P.add('MOSAIC', place(new THREE.LatheGeometry(prof, D.seg*2), 0, y, 0), PAL.white, mosaic);
  const y2 = y + 2.6*w*.7;
  P.add('GOLD', place(new THREE.CylinderGeometry(w*.04,w*.12,w*.5,D.seg),0,y2+w*.25-w*.05,0), PAL.gold, {jitter:.02});
  P.add('GOLD', cone(w*.1,w*.5,0,y2+w*.45,0,D.seg), PAL.gold, {jitter:.02});
  // vajra-like finial
  P.add('GOLD', cone(.03*w,w*.5,0,y2+w*.9,0,Math.max(4,D.seg/2)), PAL.gold, {jitter:0});
  return y2 + w*1.4; // approx height
}

function mandapa(P, D) { // square pavilion, tiered roof, spire
  P.add('STONE', box(9,.8,9,0,0,0), PAL.stone);
  P.add('WALL', box(6,3.4,6,0,.8,0), PAL.wall, {jitter:.02});
  P.add('MOSAIC', frustum(8,5,2.2,4.2,4), PAL.white, { accents:[PAL.blue,PAL.teal,PAL.terra], rate:.25, cell:.7 });
  P.add('ROOF', frustum(6,3,1.6,6.4,4), PAL.roof, {jitter:.05, cell:.5});
  P.add('GOLD', cone(.55,3.2,0,8,0,D.seg), PAL.gold);
  if (D.orn) for (let q=0;q<4;q++){ const a=q*Math.PI/2+Math.PI/4; const x=Math.cos(a)*2.9,z=Math.sin(a)*2.9; P.add('WALL', box(.5,3.4,.5,x,.8,z), PAL.warm);
    P.add('GOLD', cone(.35,1.2,Math.cos(a)*3.6,6.3,Math.sin(a)*3.6,D.seg), PAL.gold); }
  return 12;
}
function ubosot(P, D) { // hall with two-tier sweeping roof
  P.add('STONE', box(24,1.2,12,0,0,0), PAL.stone);
  P.add('WALL', box(20,5,8,0,1.2,0), PAL.wall, {jitter:.02});
  // gabled roofs as triangular prisms
  const prism=(L,Wd,H,y0)=>{ const s=new THREE.Shape(); s.moveTo(-Wd/2,0); s.lineTo(Wd/2,0); s.lineTo(0,H); s.closePath(); const g=new THREE.ExtrudeGeometry(s,{depth:L,bevelEnabled:false}); g.translate(0,y0,-L/2); g.rotateY(Math.PI/2); return g; };
  P.add('ROOF', prism(22,11,3.4,6.2), PAL.roof, {jitter:.06, cell:.6});
  P.add('ROOF', prism(17,8,2.6,9.0), PAL.roof, {jitter:.06, cell:.6});
  P.add('GOLD', box(18,.25,.35,0,11.6,0), PAL.gold);
  if (D.orn) for (let i=0;i<7;i++) P.add('WOOD', place(new THREE.CylinderGeometry(.28,.28,5,D.seg),-9+i*3,3.7,4.4), PAL.wood);
  return 13;
}
function groundPart(P, D) {
  P.add('GROUND', box(112,1.2,112,0,-1.2,0), PAL.ground, {jitter:.03, cell:3});
  P.add('STONE', box(60,.1,60,0,0,0), C('#d6c9ae'), {jitter:.03, cell:1.5}); // inner court
  P.add('STONE', box(8,.12,50,0,0,-30), PAL.warm, {cell:1.5});
  // trees
  const n = D.orn ? 56 : 14; seed = 99;
  for (let i=0;i<n;i++){ let x,z; do { x=(rnd()-.5)*104; z=(rnd()-.5)*104; } while (Math.abs(x)<34 && Math.abs(z)<34 || (Math.abs(x)<7 && z<0));
    const h=3+rnd()*2.5;
    P.add('WOOD', place(new THREE.CylinderGeometry(.18,.25,h*.5,5),x,h*.25,z), PAL.wood);
    P.add('FOLIAGE', cone(1.4+rnd()*.6,h,x,h*.35,z,D.seg), PAL.leaf, {jitter:.08});
  }
}
function riverPart(P, D) {
  P.add('WATER', box(46,.4,140,0,-1.0,0), PAL.water, {accents:[C('#6bb3c4'),C('#3d8aa0')], rate:.3, cell:4, jitter:.03});
  P.add('STONE', box(2,1.6,100,-24.5,-1.4,0), PAL.stone);
  if (D.orn) for (let i=0;i<5;i++) P.add('WOOD', box(10,.3,2.2,-20,-.2,-16+i*8), PAL.wood); // piers
}

// ---- assemble
const LOD = [
  { orn:true,  seg:16, tiers:6 },
  { orn:false, seg:6,  tiers:4 },
];
function build(code, fn, lod) { const P = new Part(); const h = fn(P, LOD[lod]); return { P, h }; }
function toMesh(name, P) {
  const byMat = MAT_KEYS.map(k => P.items.filter(i=>i.mat===k).map(i=>i.g)).map(a=>a.length?mergeGeometries(a,false):null);
  const geos = [], used = [];
  byMat.forEach((g,i)=>{ if(g){ geos.push(g); used.push(i); } });
  const merged = mergeGeometries(geos, true); // groups -> material indices relative to `used`
  const mats = used.map(i => SHARED[MAT_KEYS[i]]);
  const m = new THREE.Mesh(merged, mats); m.name = name; return m;
}
const SHARED = {}; MAT_KEYS.forEach(k=>{ SHARED[k]=new THREE.MeshStandardMaterial({ name:'BOON_'+k, color:0xffffff, vertexColors:true, roughness:MATS[k].r, metalness:MATS[k].m }); });

const scene = new THREE.Scene(); scene.name = 'WAT-ARUN';
const specs = [
  ['WAT-ARUN.PRANG.MAIN', [0,0,0], (P,D)=>prang(P,1.0,D,D.tiers), ],
  ['WAT-ARUN.PRANG.SAT-01', [18,0,18], (P,D)=>prang(P,.5,D,Math.min(D.tiers,4))],
  ['WAT-ARUN.PRANG.SAT-02', [-18,0,18], (P,D)=>prang(P,.5,D,Math.min(D.tiers,4))],
  ['WAT-ARUN.PRANG.SAT-03', [-18,0,-18], (P,D)=>prang(P,.5,D,Math.min(D.tiers,4))],
  ['WAT-ARUN.PRANG.SAT-04', [18,0,-18], (P,D)=>prang(P,.5,D,Math.min(D.tiers,4))],
  ['WAT-ARUN.MANDAPA.01', [0,0,30], mandapa], ['WAT-ARUN.MANDAPA.02', [30,0,0], mandapa],
  ['WAT-ARUN.MANDAPA.03', [0,0,-30], mandapa], ['WAT-ARUN.MANDAPA.04', [-30,0,0], mandapa],
  ['WAT-ARUN.UBOSOT', [-2,0,-42], ubosot],
  ['WAT-ARUN.GROUND', [0,0,0], groundPart],
  ['WAT-ARUN.RIVER', [80,0,0], riverPart],
];
for (const [code,pos,fn] of specs) {
  const grp = new THREE.Group(); grp.name = code; grp.position.set(...pos);
  const r0 = build(code, fn, 0), r1 = build(code, fn, 1);
  grp.add(toMesh(code+'_LOD0', r0.P), toMesh(code+'_LOD1', r1.P));
  const h = r0.h ?? 1;
  const ma = new THREE.Object3D(); ma.name = 'marker_anchor'; ma.position.set(0, (h||2)+3, 0);
  const ct = new THREE.Object3D(); ct.name = 'camera_target'; ct.position.set(0, (h||2)*.5, 0);
  grp.add(ma, ct); scene.add(grp);
}
scene.userData = { generator:'BOON SYSTEM Agent 05 procedural', note:'STYLIZED PLACEHOLDER, not survey-accurate', units:'metres', up:'Y' };

new GLTFExporter().parse(scene, res => { fs.writeFileSync(OUT, Buffer.from(res)); console.log('wrote', OUT, res.byteLength); },
  e => { console.error(e); process.exit(1); }, { binary:true });
