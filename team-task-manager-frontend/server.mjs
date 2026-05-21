import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(root, 'dist');
const port = Number(process.env.PORT) || 5173;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function sendFile(res, filePath) {
  const type = contentTypes[extname(filePath)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', `http://${req.headers.host}`).pathname);
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = resolve(join(distDir, safePath));

  if (!requestedPath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    sendFile(res, requestedPath);
    return;
  }

  if (urlPath.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'API route not found on frontend server' }));
    return;
  }

  sendFile(res, join(distDir, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on port ${port}`);
});
