import { chromium } from 'playwright-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root='/home/user/KINGBOON420';
const srv=http.createServer((q,s)=>{const p=path.join(root,q.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){console.log('404',q.url);s.writeHead(404);s.end();return;}s.writeHead(200,{'content-type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':'application/octet-stream'});s.end(d);});}).listen(0);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const pg=await b.newPage(); pg.on('console',m=>console.log('c',m.text().slice(0,300)));
await pg.goto(`http://localhost:${srv.address().port}/docs/3d/preview/index.html`); await pg.waitForTimeout(4000);
console.log(await pg.evaluate(()=>{let a=[];window.__scene.traverse(o=>{if(o.isMesh&&a.length<6)a.push([o.name,o.visible,o.geometry.attributes.position.count,o.material.name||o.material.length])});return JSON.stringify(a)})); await b.close(); srv.close();
