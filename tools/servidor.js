// Servidor local simples, só para testar a loja: node tools/servidor.js  ->  http://localhost:5173
// Não é servidor de produção. Para publicar, use uma hospedagem de site estático.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const PORTA = 5173;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.task': 'application/octet-stream', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};
// Só estas pastas/arquivos são públicos. docs/, tools/, README, .git e qualquer arquivo oculto ficam bloqueados.
const PUBLICO = [
  /^\/(index|404)\.html$/,
  /^\/(sitemap\.xml|robots\.txt)$/,
  /^\/(guia|produto|paginas)\/[^/]+\.html$/,
  /^\/assets\//
];

const cabecalhosSeguranca = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY'
};

function responder(res, status, texto) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...cabecalhosSeguranca });
  res.end(texto);
}

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Método não permitido');

  let p;
  try {
    p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return responder(res, 400, 'Endereço inválido');   // endereço malformado não derruba mais o servidor
  }
  if (p.endsWith('/')) p += 'index.html';

  const arquivo = path.resolve(root, '.' + p);
  const relativo = '/' + path.relative(root, arquivo).split(path.sep).join('/');
  const fora = arquivo !== root && !arquivo.startsWith(root + path.sep);
  const oculto = relativo.split('/').some(parte => parte.startsWith('.'));
  if (fora || oculto || !PUBLICO.some(r => r.test(relativo))) return responder(res, 404, 'Não encontrado');

  fs.readFile(arquivo, (err, data) => {
    if (err) return responder(res, 404, 'Não encontrado');
    res.writeHead(200, { 'Content-Type': types[path.extname(arquivo).toLowerCase()] || 'application/octet-stream', ...cabecalhosSeguranca });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(PORTA, () => console.log(`Loja rodando em http://localhost:${PORTA}`));
