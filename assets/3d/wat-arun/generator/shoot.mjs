// Renders preview PNGs with Playwright Chromium (software GL). Usage: node shoot.mjs
import { chromium } from 'playwright-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const mime = { '.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary' };
const srv = http.createServer((q,s)=>{ const p=path.join(root,decodeURIComponent(q.url.split('?')[0])); fs.readFile(p,(e,d)=>{ if(e){s.writeHead(404);s.end();return;} s.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); s.end(d); }); }).listen(0);
const port = srv.address().port;
const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const b = await chromium.launch({ executablePath: exe, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
for (const [v,w,h] of [['wide',1280,720],['close',1280,720],['top',1000,1000]]) {
  const pg = await b.newPage({ viewport:{width:w,height:h} }); pg.on('pageerror',e=>console.log('pageerror',e.message)); pg.on('console',m=>{ if(m.type()==='error') console.log('console',m.text()); });
  await pg.goto(`http://localhost:${port}/docs/3d/preview/index.html?view=${v}`); await pg.waitForFunction('window.__ready',null,{timeout:60000}); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: path.join(root,`docs/3d/preview/${v}.png`) }); console.log('shot',v); await pg.close();
}
await b.close(); srv.close();
