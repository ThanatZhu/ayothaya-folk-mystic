import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.glb':'model/gltf-binary'};
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),relative=pathname==='/'?'premium-hub-lab.html':pathname.slice(1);if(!/^(?:[^/]+\.(?:html|js|css)|(?:assets|vendor|maps)\/[^\0]+)$/.test(relative)||relative.split('/').includes('..'))throw Error('path');const file=path.resolve(root,relative);if(!file.startsWith(root))throw Error('path');const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1',async()=>{const url='http://127.0.0.1:'+server.address().port+'/premium-hub-lab.html?rev=gacha200-rounded';await writeFile(new URL('../outputs/gacha-banner200/preview-url.txt',import.meta.url),url);console.log(url);});
