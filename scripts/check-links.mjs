// Проверка собранного сайта: все внутренние ссылки и ресурсы существуют,
// якоря есть на целевых страницах, нет абсолютных путей от корня домена
// (они сломались бы в подкаталоге https://<user>.github.io/<repo>/).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/content.js';

const DIST = path.join(ROOT, 'dist');
if (!existsSync(DIST)) {
  console.error('Нет папки dist/. Сначала выполните npm run build.');
  process.exit(1);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const idCache = new Map();
const errors = [];

async function idsOf(file) {
  if (!idCache.has(file)) {
    const html = await readFile(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}

async function checkUrl(fromFile, raw, where) {
  const href = decodeEntities(raw);
  if (/^(https?:|mailto:|data:)/.test(href)) return;
  if (href.startsWith('/')) {
    errors.push(`${where}: абсолютный путь "${href}" сломается в подкаталоге`);
    return;
  }
  const [pathPart, hash] = href.split('#');
  const [cleanPath] = pathPart.split('?');
  const target = cleanPath ? path.resolve(path.dirname(fromFile), cleanPath) : fromFile;
  if (!target.startsWith(DIST)) {
    errors.push(`${where}: ссылка "${href}" выходит за пределы сайта`);
    return;
  }
  if (!existsSync(target)) {
    errors.push(`${where}: нет файла для "${href}"`);
    return;
  }
  if (hash && target.endsWith('.html') && !(await idsOf(target)).has(hash)) {
    errors.push(`${where}: на странице ${path.relative(DIST, target)} нет якоря #${hash}`);
  }
}

let links = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const rel = path.relative(DIST, file);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) errors.push(`${rel}: повторяющиеся id: ${[...new Set(dup)].join(', ')}`);
  if (!/<html lang="ru">/.test(html)) errors.push(`${rel}: нет lang="ru"`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`${rel}: должен быть ровно один <h1>`);
  if (/localStorage|sessionStorage|document\.cookie/.test(html)) errors.push(`${rel}: обращение к хранилищу браузера`);
  for (const m of html.matchAll(/\s(?:href|src|action)="([^"]*)"/g)) {
    links++;
    await checkUrl(file, m[1], rel);
  }
}

// Ссылки из поискового индекса считаются от корня сайта (search.html лежит в корне).
const index = JSON.parse(await readFile(path.join(DIST, 'assets', 'search-index.json'), 'utf8'));
for (const e of index) {
  links++;
  await checkUrl(path.join(DIST, 'search.html'), e.url, `search-index (${e.title.slice(0, 40)})`);
}

for (const f of files.filter((f) => f.endsWith('.js'))) {
  if (/localStorage|sessionStorage|document\.cookie|indexedDB/.test(await readFile(f, 'utf8'))) {
    errors.push(`${path.relative(DIST, f)}: обращение к хранилищу браузера`);
  }
}

if (errors.length) {
  console.error(`Найдены проблемы (${errors.length}):\n- ${errors.slice(0, 200).join('\n- ')}`);
  process.exit(1);
}
console.log(`Ссылки в порядке: страниц ${htmlFiles.length}, проверено ссылок ${links}, записей индекса ${index.length}.`);
