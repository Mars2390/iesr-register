// proxy.js — CORS proxy for the school register's Apps Script backend.
//
// Listens on PORT (default 3000), forwards GET/POST to TARGET, adds CORS
// headers, follows the Apps Script script.google.com -> googleusercontent.com
// 302 redirect chain. Single file, no npm install. Requires Node 18+ (uses
// the built-in global fetch — needed for transparent redirect following).
//
// Run:    node proxy.js
// Use it: in the school register browser console:
//           window.setSheetUrl('http://localhost:3000/'); location.reload();
//
// Production hosting: this file is hosting-agnostic. Drop it on Render,
// Railway, Fly, Cloud Run, Vercel (with serverless wrapper), or a small VPS.
// Set the PORT env var to whatever the platform exposes.

const http = require('http');
const { URL } = require('url');

const TARGET = 'https://script.google.com/macros/s/AKfycbyE-1Kj_nvgd2NkJbn8c2RoeYDFMnP6VcXpsTSAgUzSWQWtnLfpLk4n9HSLSk14NW1y/exec';
const PORT = parseInt(process.env.PORT || '3000', 10);

if (typeof fetch !== 'function') {
  console.error('This proxy requires Node 18 or newer (uses the built-in global fetch).');
  console.error('Detected Node version: ' + process.version);
  process.exit(1);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
  'Access-Control-Max-Age':       '86400',
};

function applyCors(res) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data',  c => chunks.push(c));
    req.on('end',   () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function forward(req, res) {
  // Build target URL: keep TARGET's path, merge in the incoming query string.
  const target   = new URL(TARGET);
  const incoming = new URL(req.url, 'http://localhost');
  incoming.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  // Forward most request headers but strip hop-by-hop and host-specific ones
  // that confuse the upstream / cause double-counting.
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lower = k.toLowerCase();
    if (lower === 'host'              ||
        lower === 'content-length'    ||
        lower === 'connection'        ||
        lower === 'transfer-encoding' ||
        lower === 'origin'            ||  // upstream doesn't care; avoids leaks
        lower === 'referer') continue;
    headers[k] = v;
  }

  const init = {
    method: req.method,
    headers,
    redirect: 'follow',  // <-- follows the Apps Script 302 chain
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await readRequestBody(req);
  }

  const upRes = await fetch(target.toString(), init);

  applyCors(res);
  res.statusCode = upRes.status;

  // Forward Content-Type only. We drop:
  //   - content-encoding (fetch already decoded the body for us)
  //   - any upstream Access-Control-* headers (we set our own)
  //   - cookies (Apps Script doesn't set useful ones for browser clients)
  const contentType = upRes.headers.get('content-type');
  if (contentType) res.setHeader('Content-Type', contentType);

  const buf = Buffer.from(await upRes.arrayBuffer());
  res.end(buf);
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  try {
    if (req.method === 'OPTIONS') {
      applyCors(res);
      res.statusCode = 204;
      res.end();
      console.log(`${req.method} ${req.url} -> 204 preflight (${Date.now() - t0}ms)`);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      applyCors(res);
      res.statusCode = 405;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Method Not Allowed');
      console.log(`${req.method} ${req.url} -> 405 (${Date.now() - t0}ms)`);
      return;
    }
    await forward(req, res);
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - t0}ms)`);
  } catch (err) {
    applyCors(res);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'proxy_error: ' + (err && err.message || String(err)) }));
    console.error(`${req.method} ${req.url} -> 502: ${err && err.message} (${Date.now() - t0}ms)`);
  }
});

server.listen(PORT, () => {
  console.log('CORS proxy listening on http://localhost:' + PORT);
  console.log('Forwarding to:                   ' + TARGET);
  console.log('');
  console.log('In the school register browser console:');
  console.log("  window.setSheetUrl('http://localhost:" + PORT + "/'); location.reload();");
});
