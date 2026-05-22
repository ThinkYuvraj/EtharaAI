import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';

const root = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(root, 'dist');
const port = Number(process.env.PORT) || 8080;

// Get backend URL from environment or use default
const BACKEND_URL = process.env.VITE_API_BASE || 'http://localhost:5000';

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

function proxyRequest(req, res, path) {
  const backendUrlObj = new URL(BACKEND_URL);
  const isHttps = backendUrlObj.protocol === 'https:';
  const client = isHttps ? https : http;

  const options = {
    hostname: backendUrlObj.hostname,
    port: backendUrlObj.port || (isHttps ? 443 : 80),
    path: path,
    method: req.method,
    headers: {
      ...req.headers,
      host: backendUrlObj.host,
    },
  };

  // Remove hop-by-hop headers
  delete options.headers['connection'];
  delete options.headers['content-length'];

  const proxyReq = client.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'Backend service unavailable', error: err.message }));
  });

  req.pipe(proxyReq);
}

const server = createServer((req, res) => {
  // Enable CORS for API requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const urlPath = decodeURIComponent(new URL(req.url ?? '/', `http://${req.headers.host}`).pathname);
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');

  // Proxy API requests to backend
  if (urlPath.startsWith('/api/')) {
    console.log(`Proxying ${req.method} ${urlPath} to ${BACKEND_URL}${urlPath}`);
    proxyRequest(req, res, urlPath);
    return;
  }

  // Serve static files
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

  // Fallback to index.html for SPA routing
  sendFile(res, join(distDir, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on port ${port}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
});

