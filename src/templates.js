// HTML-шаблоны страниц. Все ссылки относительные (через префикс root),
// поэтому сайт работает и в корне домена, и в подкаталоге GitHub Pages.
import { escapeHtml, renderMarkup, renderCode } from './markup.js';
import { LEVELS, BASIS, asArray, parseRef } from './content.js';

export const url = {
  home: () => 'index.html',
  topics: () => 'topics/index.html',
  topic: (id, section) => `topics/${id}.html${section ? `#${section}` : ''}`,
  tasksIndex: () => 'tasks/index.html',
  tasks: (id, taskId) => `tasks/${id}.html${taskId ? `#task-${taskId}` : ''}`,
  questionsIndex: () => 'questions/index.html',
  questions: (id, qId) => `questions/${id}.html${qId ? `#q-${qId}` : ''}`,
  search: () => 'search.html',
  sources: () => 'sources.html',
};

// Ссылки из разметки контента: topic:<id>#<раздел>, tasks:<id>#<задача>, questions:<id>#<вопрос>.
export function makeLinkResolver(root) {
  return (href) => {
    const m = href.match(/^(topic|tasks|questions):([\w-]+)(?:#([\w-]+))?$/);
    if (!m) return href;
    const [, kind, id, anchor] = m;
    if (kind === 'topic') return root + url.topic(id, anchor);
    if (kind === 'tasks') return root + url.tasks(id, anchor);
    return root + url.questions(id, anchor);
  };
}

export function md(src, root) {
  return renderMarkup(src, makeLinkResolver(root));
}

const NAV = [
  ['home', 'Главная', url.home],
  ['topics', 'Темы', url.topics],
  ['tasks', 'Задачи', url.tasksIndex],
  ['questions', 'Вопросы', url.questionsIndex],
  ['sources', 'Источники', url.sources],
];

export function layout({ root, title, active, body, data, description }) {
  const { course } = data;
  const nav = NAV.map(([key, label, fn]) => {
    const current = key === active ? ' aria-current="page"' : '';
    return `<li><a href="${root}${fn()}"${current}>${label}</a></li>`;
  }).join('');
  const fullTitle = title ? `${title} — ${course.title}` : course.title;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description || course.subtitle)}">
<link rel="stylesheet" href="${root}assets/styles.css">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
</head>
<body>
<a class="skip-link" href="#main">Перейти к содержанию</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${root}${url.home()}">
      <span class="brand-mark" aria-hidden="true">БД</span>
      <span class="brand-text">${escapeHtml(course.title)}</span>
    </a>
    <nav aria-label="Основная навигация">
      <ul class="nav-list">${nav}</ul>
    </nav>
    <form class="header-search" role="search" action="${root}${url.search()}" method="get">
      <label for="header-q" class="visually-hidden">Поиск по сайту</label>
      <input id="header-q" name="q" type="search" placeholder="Поиск: тема, термин, задача…" autocomplete="off">
      <button type="submit">Найти</button>
    </form>
  </div>
</header>
<main id="main" class="container" tabindex="-1">
${body}
</main>
<footer class="site-footer">
  <div class="container">
    <p>${escapeHtml(course.subtitle)}. Лектор: ${escapeHtml(course.lecturer)}. Содержание основано на лекциях курса — см. <a href="${root}${url.sources()}">источники</a>.</p>
    <p>Сайт не сохраняет ответы, прогресс и историю: открытые ответы сбрасываются при перезагрузке страницы. Нет cookies, аналитики и учётных записей.</p>
  </div>
</footer>
</body>
</html>
`;
}

export function breadcrumbs(root, items) {
  const li = items
    .map(([label, href], i) =>
      i === items.length - 1
        ? `<li aria-current="page">${escapeHtml(label)}</li>`
        : `<li><a href="${root}${href}">${escapeHtml(label)}</a></li>`,
    )
    .join('');
  return `<nav class="breadcrumbs" aria-label="Хлебные крошки"><ol>${li}</ol></nav>`;
}

export function formatSource(src, sources) {
  return asArray(src)
    .map((s) => {
      const doc = sources[s.doc];
      if (!doc) throw new Error(`Неизвестный источник: ${s.doc}`);
      const fileName = doc.file.split('/').pop();
      const where = [s.pages ? `с. ${s.pages}` : '', s.note || ''].filter(Boolean).join(', ');
      return `${escapeHtml(doc.title)} <span class="src-file">(${escapeHtml(fileName)}${where ? `, ${escapeHtml(where)}` : ''})</span>`;
    })
    .join('; ');
}

export function sourceLine(src, sources, label = 'Источник') {
  if (!asArray(src).length) return '';
  return `<p class="source"><span class="source-label">${label}:</span> ${formatSource(src, sources)}</p>`;
}

export function basisNote(basis = 'material') {
  const cls = basis === 'material' ? 'basis-material' : basis === 'derived' ? 'basis-derived' : 'basis-missing';
  return `<p class="basis ${cls}">${escapeHtml(BASIS[basis])}</p>`;
}

export function theoryLinks(item, data, root, label = 'Теория для решения') {
  const refs = asArray(item.theory);
  if (!refs.length) return '';
  const links = refs
    .map((ref) => {
      const { topicId, sectionId } = parseRef(ref);
      const topic = data.byId.get(topicId);
      if (!topic) throw new Error(`Ссылка на теорию "${ref}": тема не найдена (запустите npm run check:content)`);
      const section = topic.sections.find((s) => s.id === sectionId);
      const text = section ? `${section.title}` : topic.title;
      return `<li><a class="theory-link" href="${root}${url.topic(topicId, sectionId)}"><span class="theory-icon" aria-hidden="true">§</span> ${escapeHtml(text)}<span class="theory-topic"> · ${escapeHtml(topic.short || topic.title)}</span></a></li>`;
    })
    .join('');
  return `<div class="theory-refs"><p class="theory-refs-label">${label}:</p><ul>${links}</ul></div>`;
}

export function levelBadge(level) {
  if (!level) return '';
  return `<span class="badge badge-level-${level}">Сложность: ${LEVELS[level]}</span>`;
}

// Кнопка «Показать ответ» — нативный <details>: доступен с клавиатуры,
// состояние живёт только до перезагрузки страницы.
export function answerToggle(inner, label = 'ответ') {
  return `<details class="answer">
<summary><span class="when-closed">Показать ${label}</span><span class="when-open">Скрыть ${label}</span></summary>
<div class="answer-body">${inner}</div>
</details>`;
}

export function renderTaskSolution(task, root) {
  let solution = task.solution || '';
  const sqlHtml = task.sql?.code ? renderCode(task.sql.code, 'sql') : '';
  // {{sql}} в тексте решения — место, куда вставляется проверенный SQL-код.
  const parts = solution.split('{{sql}}');
  let html = parts.map((p) => md(p, root)).join(sqlHtml);
  if (sqlHtml && parts.length === 1) html = sqlHtml + html;
  return html;
}
