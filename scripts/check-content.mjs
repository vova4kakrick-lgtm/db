// Проверка структуры контента: обязательные поля, уникальные id,
// корректные ссылки на теорию и источники, существование фикстур.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadCourse, CONTENT_DIR, asArray, parseRef, BASIS } from '../src/content.js';

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const data = await loadCourse();
const { sources, topics, byId } = data;

function checkSource(where, src, required = true) {
  const list = asArray(src);
  if (!list.length && required) err(where, 'не указан источник (source)');
  for (const s of list) {
    const doc = sources[s.doc];
    if (!doc) { err(where, `неизвестный источник "${s.doc}"`); continue; }
    if (s.pages && doc.pages) {
      for (const n of String(s.pages).match(/\d+/g) || []) {
        if (Number(n) < 1 || Number(n) > doc.pages) err(where, `страница ${n} вне диапазона 1–${doc.pages} в ${s.doc}`);
      }
    }
  }
}

function checkRefs(where, refs, required) {
  const list = asArray(refs);
  if (required && !list.length) err(where, 'нет ссылки на теорию (theory)');
  for (const ref of list) {
    const { topicId, sectionId } = parseRef(ref);
    const topic = byId.get(topicId);
    if (!topic) { err(where, `ссылка на несуществующую тему "${ref}"`); continue; }
    if (sectionId && !topic.sections.some((s) => s.id === sectionId)) err(where, `нет раздела "${ref}"`);
  }
}

function checkMarkupLinks(where, text) {
  for (const m of String(text || '').matchAll(/\]\((topic|tasks|questions):([\w-]+)(?:#([\w-]+))?\)/g)) {
    const [, kind, id, anchor] = m;
    const topic = byId.get(id);
    if (!topic) { err(where, `ссылка ${m[0]} на несуществующую тему`); continue; }
    if (!anchor) continue;
    const ok = kind === 'topic'
      ? topic.sections.some((s) => s.id === anchor)
      : kind === 'tasks'
        ? topic.tasks.some((t) => t.id === anchor)
        : topic.questions.some((q) => q.id === anchor);
    if (!ok) err(where, `ссылка ${m[0]}: якорь не найден`);
  }
}

const taskIds = new Set();
const questionIds = new Set();

for (const t of topics) {
  const w = `тема ${t.id}`;
  for (const f of ['title', 'short', 'summary']) if (!t[f]) err(w, `нет поля ${f}`);
  if (!asArray(t.sources).length) err(w, 'нет списка sources');
  for (const s of asArray(t.sources)) if (!sources[s]) err(w, `неизвестный источник ${s}`);
  if (!t.sections?.length) err(w, 'нет разделов теории');
  const secIds = new Set();
  for (const s of t.sections || []) {
    const ws = `${w} / раздел ${s.id}`;
    if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) err(ws, 'некорректный id');
    if (secIds.has(s.id)) err(ws, 'повтор id раздела');
    secIds.add(s.id);
    if (!s.title || !s.body) err(ws, 'нет title/body');
    checkSource(ws, s.source);
    checkMarkupLinks(ws, s.body);
  }
  for (const term of t.terms || []) {
    if (!term.term || !term.def) err(w, `термин без term/def: ${JSON.stringify(term).slice(0, 60)}`);
    checkSource(`${w} / термин ${term.term}`, term.source);
  }
  if (!t.tasks.length) err(w, 'нет задач');
  for (const task of t.tasks) {
    const wt = `${w} / задача ${task.id}`;
    if (!task.id || !/^[a-z0-9-]+$/.test(task.id)) err(wt, 'некорректный id');
    if (taskIds.has(task.id)) err(wt, 'повтор id задачи');
    taskIds.add(task.id);
    for (const f of ['title', 'statement', 'answer']) if (!task[f]) err(wt, `нет поля ${f}`);
    if (![1, 2, 3].includes(task.level)) err(wt, 'level должен быть 1, 2 или 3');
    if (task.basis && !BASIS[task.basis]) err(wt, `неизвестный basis ${task.basis}`);
    checkSource(wt, task.source);
    checkRefs(wt, task.theory, true);
    for (const f of ['statement', 'answer', 'solution']) checkMarkupLinks(wt, task[f]);
    if (task.sql) {
      for (const fx of asArray(task.sql.fixture)) {
        if (!existsSync(path.join(CONTENT_DIR, 'fixtures', `${fx}.sql`))) err(wt, `нет фикстуры ${fx}.sql`);
      }
      if (!task.sql.code) err(wt, 'sql без кода');
      if (task.solution && task.solution.split('{{sql}}').length > 2) err(wt, '{{sql}} встречается больше одного раза');
    } else if (task.solution?.includes('{{sql}}')) {
      err(wt, 'есть {{sql}}, но нет поля sql');
    }
  }
  if (!t.questions.length) err(w, 'нет вопросов');
  for (const q of t.questions) {
    const wq = `${w} / вопрос ${q.id}`;
    if (!q.id || !/^[a-z0-9-]+$/.test(q.id)) err(wq, 'некорректный id');
    if (questionIds.has(q.id)) err(wq, 'повтор id вопроса');
    questionIds.add(q.id);
    if (!q.q || !q.a) err(wq, 'нет q/a');
    if (/\n\s*\n/.test(q.q)) err(wq, 'формулировка вопроса должна быть одним абзацем');
    if (q.basis && !BASIS[q.basis]) err(wq, `неизвестный basis ${q.basis}`);
    checkSource(wq, q.source, q.basis !== 'not-found');
    checkRefs(wq, q.theory, false);
    checkMarkupLinks(wq, q.a);
  }
}

const nTasks = topics.reduce((n, t) => n + t.tasks.length, 0);
const nQ = topics.reduce((n, t) => n + t.questions.length, 0);
if (errors.length) {
  console.error(`Ошибки контента (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Контент в порядке: тем ${topics.length}, задач ${nTasks}, вопросов ${nQ}.`);
