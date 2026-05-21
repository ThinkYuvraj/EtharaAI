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
  const stream = createReadStream(filePath);
  stream.on('error', (err) => {
    console.error(`[sendFile] Failed to read file "${filePath}":`, err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
  });
  stream.pipe(res);
}

const server = createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url ?? '/', `http://${req.headers.host}`).pathname);
    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    const requestedPath = resolve(join(distDir, safePath));

    console.log(`[request] ${req.method} ${urlPath} -> ${requestedPath}`);

    if (!requestedPath.startsWith(distDir)) {
      console.warn(`[request] Forbidden path traversal attempt: ${requestedPath}`);
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
      sendFile(res, requestedPath);
      return;
    }

    if (urlPath.startsWith('/api/')) {
      console.warn(`[request] API route hit on frontend server: ${urlPath}`);
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: 'API route not found on frontend server' }));
      return;
    }

    // SPA fallback — serve index.html for all unmatched routes
    if (!existsSync(indexPath)) {
      console.error(`[request] index.html not found at ${indexPath}`);
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Service Unavailable: build artifacts missing');
      return;
    }

    sendFile(res, indexPath);
  } catch (err) {
    console.error(`[request] Uncaught error handling ${req.method} ${req.url}:`, err);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Internal Server Error');
    } catch (writeErr) {
      console.error(`[request] Failed to send error response:`, writeErr.message);
    }
  }
});

server.on('error', (err) => {
  console.error(`[server] Server error:`, err);
});

server.on('clientError', (err, socket) => {
  console.error(`[server] Client error:`, err.message);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

process.on('uncaughtException', (err) => {
  console.error(`[process] Uncaught exception:`, err);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[process] Unhandled promise rejection:`, reason);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on port ${port}`);
});
