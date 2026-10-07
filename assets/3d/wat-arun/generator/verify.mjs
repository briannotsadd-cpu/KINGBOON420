import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const f = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'wat-arun-stylized.glb');
const b = fs.readFileSync(f); const jl = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20+jl).toString());
const codes = ['WAT-ARUN.PRANG.MAIN',...[1,2,3,4].map(i=>`WAT-ARUN.PRANG.SAT-0${i}`),...[1,2,3,4].map(i=>`WAT-ARUN.MANDAPA.0${i}`),'WAT-ARUN.UBOSOT','WAT-ARUN.GROUND','WAT-ARUN.RIVER'];
const N = j.nodes; const byName = n => N.find(x=>x.name===n);
const tris = mi => j.meshes[mi].primitives.reduce((s,p)=>s+(p.indices!=null?j.accessors[p.indices].count:j.accessors[p.attributes.POSITION].count)/3,0);
let ok = true, t0=0, t1=0; const rows=[];
for (const c of codes) {
  const n = byName(c); if (!n) { ok=false; rows.push(`${c}: MISSING`); continue; }
  const kids = (n.children||[]).map(i=>N[i]);
  const has = nm => kids.find(k=>k.name===nm);
  const l0 = has(c+'_LOD0'), l1 = has(c+'_LOD1'), ma = has('marker_anchor'), ct = has('camera_target');
  const good = l0&&l1&&ma&&ct&&l0.mesh!=null&&l1.mesh!=null&&ma.mesh==null&&ct.mesh==null; if(!good) ok=false;
  const a = l0?tris(l0.mesh):0, d = l1?tris(l1.mesh):0; t0+=a; t1+=d;
  rows.push(`${c.padEnd(24)} ${good?'OK  ':'FAIL'} LOD0=${String(a).padStart(6)} LOD1=${String(d).padStart(6)} ratio=${a?(d/a*100).toFixed(0):'-'}%`);
}
const rootNames = (j.scenes[0].nodes||[]).map(i=>N[i].name);
const rootOk = rootNames.every(n=>codes.includes(n)) && rootNames.length===codes.length || (rootNames.length===1);
console.log('Root nodes:', rootNames.join(', ').slice(0,200));
console.log(rows.join('\n'));
const mats = j.materials.length, size = b.length;
console.log(`Scene total LOD0=${t0} LOD1=${t1} (both=${t0+t1})`);
console.log(`Materials=${mats}  File=${(size/1048576).toFixed(2)} MB  Textures=${(j.textures||[]).length}`);
const checks = { names:ok, tris:t0<=300000&&(t0+t1)<=300000, materials:mats<=20, size:size<=5*1048576 };
console.log('Checks (BALANCED):', JSON.stringify(checks)); process.exit(Object.values(checks).every(Boolean)?0:1);
