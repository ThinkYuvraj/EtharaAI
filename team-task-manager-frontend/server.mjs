import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(root, 'dist');
const port = Number(process.env.PORT) || 8080;

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

// Startup diagnostics — log distDir and verify it exists before accepting traffic
console.log(`[startup] distDir: ${distDir}`);
if (existsSync(distDir)) {
  try {
    const stat = statSync(distDir);
    console.log(`[startup] distDir exists: true, isDirectory: ${stat.isDirectory()}`);
  } catch (err) {
    console.error(`[startup] Error stat-ing distDir:`, err.message);
  }
} else {
  console.error(`[startup] distDir does NOT exist: ${distDir}`);
}

const indexPath = join(distDir, 'index.html');
console.log(`[startup] index.html exists: ${existsSync(indexPath)}`);

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
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    sendFile(res, requestedPath);
    return;
  }

  // SPA fallback — serve index.html for all unmatched routes
  sendFile(res, indexPath);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on port ${port}`);
});
