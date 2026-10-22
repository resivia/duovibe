/* Minimal static server that mimics the Netlify production setup:
   gzip + long cache for hashed assets + no-store for the shell. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = process.env.ROOT || '/home/user/duovibe';
const PORT = Number(process.env.PORT || 8090);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const cache = new Map();

http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split('?')[0]);
  if (file === '/') file = '/index.html';

  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('not found');
  }

  const ext = path.extname(full);
  const body = fs.readFileSync(full);
  const type = TYPES[ext] || 'application/octet-stream';
  const accepts = String(req.headers['accept-encoding'] || '');
  const compressible = /text|javascript|json|svg/.test(type);

  const headers = {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; base-uri 'self'; form-action 'self'"
  };

  if (file === '/sw.js' || file === '/index.html' || file === '/') {
    headers['Cache-Control'] = 'no-cache';
  } else {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }

  if (compressible && accepts.includes('br')) {
    const key = full + ':' + fs.statSync(full).mtimeMs + ':br';
    let buf = cache.get(key);
    if (!buf) { buf = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }); cache.set(key, buf); }
    headers['Content-Encoding'] = 'br';
    headers['Content-Length'] = buf.length;
    res.writeHead(200, headers);
    return res.end(buf);
  }

  if (compressible && accepts.includes('gzip')) {
    const key = full + ':' + fs.statSync(full).mtimeMs + ':gz';
    let buf = cache.get(key);
    if (!buf) { buf = zlib.gzipSync(body, { level: 9 }); cache.set(key, buf); }
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = buf.length;
    res.writeHead(200, headers);
    return res.end(buf);
  }

  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(body);
}).listen(PORT, '127.0.0.1', () => console.log('serving ' + ROOT + ' on ' + PORT));
