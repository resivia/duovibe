/* Minimal static server that mimics the Netlify production setup:
   gzip + long cache for hashed assets + no-store for the shell. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8090);
const PUBLIC = new Set(require('../scripts/site-files'));

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

function createServer() {
  return http.createServer(serveAsset);
}

function serveAsset(req, res) {
  const pathname = req.url.split('?')[0];
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!PUBLIC.has(file) || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('not found');
  }
  const full = path.join(ROOT, file);
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

  if (['sw.js', 'index.html', 'config.js'].includes(file)) {
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
    return res.end(req.method === 'HEAD' ? undefined : buf);
  }

  if (compressible && accepts.includes('gzip')) {
    const key = full + ':' + fs.statSync(full).mtimeMs + ':gz';
    let buf = cache.get(key);
    if (!buf) { buf = zlib.gzipSync(body, { level: 9 }); cache.set(key, buf); }
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = buf.length;
    res.writeHead(200, headers);
    return res.end(req.method === 'HEAD' ? undefined : buf);
  }

  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

if (require.main === module) {
  createServer().listen(PORT, process.env.HOST || '0.0.0.0', () => console.log('DuoVibe app on port ' + PORT));
}

module.exports = { createServer };
