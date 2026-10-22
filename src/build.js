// Сборка статического сайта в папку dist/.
import { mkdir, rm, writeFile, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadCourse, ROOT, LEVELS } from './content.js';
import { escapeHtml, toPlainText } from './markup.js';
import {
  url, layout, md, breadcrumbs, sourceLine, basisNote, theoryLinks,
  levelBadge, answerToggle, renderTaskSolution,
} from './templates.js';

const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(ROOT, 'src', 'assets');

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const countTasks = (n) => `${n} ${plural(n, 'задача', 'задачи', 'задач')}`;
const countQuestions = (n) => `${n} ${plural(n, 'вопрос', 'вопроса', 'вопросов')}`;

async function emit(rel, html) {
  const file = path.join(DIST, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

function topicCard(topic, root, index) {
  return `<li class="topic-card">
  <h3><a href="${root}${url.topic(topic.id)}"><span class="topic-num">${index + 1}.</span> ${escapeHtml(topic.title)}</a></h3>
  <p>${escapeHtml(topic.summary)}</p>
  <p class="topic-card-links">
    <a href="${root}${url.topic(topic.id)}">Теория</a>
    <a href="${root}${url.tasks(topic.id)}">${countTasks(topic.tasks.length)}</a>
    <a href="${root}${url.questions(topic.id)}">${countQuestions(topic.questions.length)}</a>
  </p>
</li>`;
}

function pageHome(data) {
  const root = '';
  const totalTasks = data.topics.reduce((n, t) => n + t.tasks.length, 0);
  const totalQ = data.topics.reduce((n, t) => n + t.questions.length, 0);
  const body = `
<section class="hero">
  <h1>${escapeHtml(data.course.title)}</h1>
  <p class="lead">${escapeHtml(data.course.subtitle)}. Учебный справочник: теория по темам курса, ${countTasks(totalTasks)} с решениями и ${countQuestions(totalQ)} для самопроверки.</p>
</section>
<section class="howto" aria-labelledby="howto-h">
  <h2 id="howto-h">Как пользоваться</h2>
  <ol>
    <li><strong>Выберите тему</strong> из списка ниже и прочитайте теорию. В каждом разделе теории есть ссылки на задачи, которые на нём основаны.</li>
    <li><strong>Решите задачи темы</strong> самостоятельно, затем нажмите «Показать ответ». Под каждой задачей есть ссылки «Теория для решения» — они ведут к нужному разделу.</li>
    <li><strong>Проверьте себя вопросами</strong>: ответ открывается только по нажатию.</li>
    <li><strong>Ищите</strong> по названиям тем, терминам, теории, задачам и вопросам через поле поиска вверху страницы.</li>
  </ol>
  <p>У каждого фрагмента указан источник — файл лекции и страница PDF. Если готового ответа в материалах нет, это отмечено явно. Сайт ничего не сохраняет: после перезагрузки страницы все ответы снова скрыты.</p>
  <p>Формат контрольной (по вариантам прошлых лет): концептуальная модель, <code>CREATE TABLE</code> и 6 SQL-запросов — см. тему <a href="${url.topic('exam-practice')}">«Практикум контрольной»</a>.</p>
</section>
<section aria-labelledby="topics-h">
  <h2 id="topics-h">Темы курса</h2>
  <ol class="topic-grid">${data.topics.map((t, i) => topicCard(t, root, i)).join('')}</ol>
</section>`;
  return layout({ root, title: '', active: 'home', body, data });
}

function pageTopicsIndex(data) {
  const root = '../';
  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Темы', '']])}
<h1>Темы курса</h1>
<p class="lead">Карта тем и подтем. Нажмите на подтему, чтобы перейти к разделу теории.</p>
<ol class="topic-map">
${data.topics
  .map(
    (t, i) => `<li>
  <h2><a href="${root}${url.topic(t.id)}">${i + 1}. ${escapeHtml(t.title)}</a></h2>
  <p>${escapeHtml(t.summary)}</p>
  <ul class="subtopics">${t.sections.map((s) => `<li><a href="${root}${url.topic(t.id, s.id)}">${escapeHtml(s.title)}</a></li>`).join('')}</ul>
  <p class="topic-card-links"><a href="${root}${url.tasks(t.id)}">${countTasks(t.tasks.length)}</a> <a href="${root}${url.questions(t.id)}">${countQuestions(t.questions.length)}</a></p>
</li>`,
  )
  .join('')}
</ol>`;
  return layout({ root, title: 'Темы', active: 'topics', body, data });
}

function prevNext(data, topic, root, urlFn, suffix = '') {
  const idx = data.topics.indexOf(topic);
  const prev = data.topics[idx - 1];
  const next = data.topics[idx + 1];
  return `<nav class="prev-next" aria-label="Соседние темы">
  ${prev ? `<a rel="prev" href="${root}${urlFn(prev.id)}">← ${escapeHtml(prev.title)}${suffix}</a>` : '<span></span>'}
  ${next ? `<a rel="next" href="${root}${urlFn(next.id)}">${escapeHtml(next.title)}${suffix} →</a>` : '<span></span>'}
</nav>`;
}

function pageTopic(data, topic) {
  const root = '../';
  const toc = topic.sections
    .map((s) => `<li><a href="#${s.id}">${escapeHtml(s.title)}</a></li>`)
    .join('');
  const sections = topic.sections
    .map((s) => {
      const related = s.tasks.length
        ? `<div class="related-tasks"><p class="related-label">Задачи по этому разделу:</p><ul>${s.tasks
            .map((t) => `<li><a href="${root}${url.tasks(t.topicId, t.id)}">${escapeHtml(t.title)}</a>${t.topicId !== topic.id ? ` <span class="muted">(${escapeHtml(data.byId.get(t.topicId).short)})</span>` : ''}</li>`)
            .join('')}</ul></div>`
        : '';
      const relatedQ = s.questions.length
        ? `<p class="related-q">Вопросы по разделу: ${s.questions
            .map((q, i) => `<a href="${root}${url.questions(q.topicId, q.id)}">${i + 1}</a>`)
            .join(', ')}</p>`
        : '';
      return `<section class="theory-section" id="${s.id}" aria-labelledby="${s.id}-h">
  <h2 id="${s.id}-h">${escapeHtml(s.title)} <a class="anchor" href="#${s.id}" aria-label="Ссылка на раздел «${escapeHtml(s.title)}»">#</a></h2>
  ${md(s.body, root)}
  ${sourceLine(s.source, data.sources)}
  ${related}${relatedQ}
</section>`;
    })
    .join('\n');

  const terms = topic.terms?.length
    ? `<section id="terms" aria-labelledby="terms-h" class="terms">
  <h2 id="terms-h">Термины</h2>
  <dl>${topic.terms
    .map((t) => `<div class="term" id="term-${slug(t.term)}"><dt>${escapeHtml(t.term)}</dt><dd>${md(t.def, root)}${sourceLine(t.source, data.sources)}</dd></div>`)
    .join('')}</dl>
</section>`
    : '';

  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Темы', url.topics()], [topic.title, '']])}
<article class="topic">
<header class="topic-header">
  <h1>${escapeHtml(topic.title)}</h1>
  <p class="lead">${escapeHtml(topic.summary)}</p>
  <div class="cta-row">
    <a class="button" href="${root}${url.tasks(topic.id)}">Задачи по теме (${topic.tasks.length})</a>
    <a class="button button-secondary" href="${root}${url.questions(topic.id)}">Вопросы для самопроверки (${topic.questions.length})</a>
  </div>
  ${sourceLine(topic.sources.map((doc) => ({ doc })), data.sources, 'Материалы')}
</header>
<nav class="toc" aria-labelledby="toc-h">
  <h2 id="toc-h">На этой странице</h2>
  <ol>${toc}${terms ? '<li><a href="#terms">Термины</a></li>' : ''}</ol>
</nav>
${sections}
${terms}
<div class="cta-row cta-bottom">
  <a class="button" href="${root}${url.tasks(topic.id)}">Перейти к задачам темы (${topic.tasks.length})</a>
  <a class="button button-secondary" href="${root}${url.questions(topic.id)}">Вопросы для самопроверки (${topic.questions.length})</a>
</div>
</article>
${prevNext(data, topic, root, (id) => url.topic(id))}`;
  return layout({ root, title: topic.title, active: 'topics', body, data, description: topic.summary });
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sqlCheckedNote(sql) {
  const fixtures = [].concat(sql.fixture || []);
  const where = fixtures.length
    ? `на тестовых данных ${fixtures.map((f) => `<code>content/fixtures/${escapeHtml(f)}.sql</code>`).join(', ')}`
    : 'на пустой базе';
  const result = sql.expect ? ', результат сверен с ожидаемым' : '';
  return `<p class="sql-checked">Этот SQL выполнен в PostgreSQL 18 ${where}${result} (скрипт <code>npm run check:sql</code>).</p>`;
}

function renderTask(task, n, data, root) {
  const answerInner = `
  <div class="answer-short"><h3>Ответ</h3>${md(task.answer, root)}</div>
  ${task.solution || task.sql ? `<div class="solution"><h3>Решение и пояснение</h3>${renderTaskSolution(task, root)}</div>` : ''}
  ${task.sql ? sqlCheckedNote(task.sql) : ''}
  ${basisNote(task.basis)}
  ${sourceLine(task.source, data.sources)}
  ${theoryLinks(task, data, root, 'Повторить теорию')}`;
  return `<article class="task" id="task-${task.id}" aria-labelledby="task-${task.id}-h">
  <header class="task-header">
    <h2 id="task-${task.id}-h"><span class="task-num">Задача ${n}.</span> ${escapeHtml(task.title)}</h2>
    ${levelBadge(task.level)}
  </header>
  <div class="task-statement">${md(task.statement, root)}</div>
  ${theoryLinks(task, data, root)}
  ${answerToggle(answerInner)}
</article>`;
}

function groupItems(items) {
  const groups = [];
  for (const it of items) {
    const name = it.group || '';
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, items: [] }));
    g.items.push(it);
  }
  return groups;
}

function pageTasks(data, topic) {
  const root = '../';
  let n = 0;
  const groups = groupItems(topic.tasks);
  const list = groups
    .map((g) => {
      const tasks = g.items.map((t) => renderTask(t, ++n, data, root)).join('\n');
      return g.name ? `<section class="task-group" aria-label="${escapeHtml(g.name)}"><h2 class="group-title">${escapeHtml(g.name)}</h2>${tasks}</section>` : tasks;
    })
    .join('\n');
  let k = 0;
  const toc = groups
    .map((g) => `${g.name ? `<li class="toc-group">${escapeHtml(g.name)}</li>` : ''}${g.items
      .map((t) => `<li><a href="#task-${t.id}">${++k}. ${escapeHtml(t.title)}</a> <span class="muted">· ${LEVELS[t.level] || ''}</span></li>`)
      .join('')}`)
    .join('');
  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Задачи', url.tasksIndex()], [topic.title, '']])}
<header class="topic-header">
  <h1>Задачи: ${escapeHtml(topic.title)}</h1>
  <p class="lead">Сначала решите задачу сами, затем откройте ответ. Ссылки «Теория для решения» ведут к нужному разделу темы.</p>
  <div class="cta-row">
    <a class="button button-secondary" href="${root}${url.topic(topic.id)}">Теория темы</a>
    <a class="button button-secondary" href="${root}${url.questions(topic.id)}">Вопросы по теме</a>
  </div>
</header>
<nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h">Список задач</h2><ul class="toc-list">${toc}</ul></nav>
${list}
${prevNext(data, topic, root, (id) => url.tasks(id), ' — задачи')}`;
  return layout({ root, title: `Задачи: ${topic.title}`, active: 'tasks', body, data });
}

function pageTasksIndex(data) {
  const root = '../';
  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Задачи', '']])}
<h1>Задачи по темам</h1>
<p class="lead">У каждой задачи есть условие, кнопка «Показать ответ», решение с пояснением, источник и ссылка на теорию.</p>
${data.topics
  .map(
    (t) => `<section class="index-group" aria-labelledby="ti-${t.id}">
  <h2 id="ti-${t.id}"><a href="${root}${url.tasks(t.id)}">${escapeHtml(t.title)}</a> <span class="muted">· ${countTasks(t.tasks.length)}</span></h2>
  <ol class="plain">${t.tasks.map((task) => `<li><a href="${root}${url.tasks(t.id, task.id)}">${escapeHtml(task.title)}</a> <span class="muted">· ${LEVELS[task.level] || ''}</span></li>`).join('')}</ol>
</section>`,
  )
  .join('')}`;
  return layout({ root, title: 'Задачи', active: 'tasks', body, data });
}

function pageQuestions(data, topic) {
  const root = '../';
  const items = topic.questions
    .map(
      (q, i) => `<article class="question" id="q-${q.id}" aria-labelledby="q-${q.id}-h">
  <h2 id="q-${q.id}-h"><span class="task-num">${i + 1}.</span> ${md(q.q, root).replace(/^<p>|<\/p>$/g, '')}</h2>
  ${answerToggle(`${md(q.a, root)}${basisNote(q.basis)}${sourceLine(q.source, data.sources)}${theoryLinks(q, data, root, 'Теория')}`)}
</article>`,
    )
    .join('\n');
  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Вопросы', url.questionsIndex()], [topic.title, '']])}
<header class="topic-header">
  <h1>Вопросы: ${escapeHtml(topic.title)}</h1>
  <p class="lead">Сформулируйте ответ для себя, затем откройте ответ из материалов.</p>
  <div class="cta-row">
    <a class="button button-secondary" href="${root}${url.topic(topic.id)}">Теория темы</a>
    <a class="button button-secondary" href="${root}${url.tasks(topic.id)}">Задачи по теме</a>
  </div>
</header>
${items}
${prevNext(data, topic, root, (id) => url.questions(id), ' — вопросы')}`;
  return layout({ root, title: `Вопросы: ${topic.title}`, active: 'questions', body, data });
}

function pageQuestionsIndex(data) {
  const root = '../';
  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Вопросы', '']])}
<h1>Вопросы для самопроверки</h1>
<p class="lead">Вопросы сгруппированы по темам; ответ открывается по нажатию «Показать ответ».</p>
${data.topics
  .map(
    (t) => `<section class="index-group" aria-labelledby="qi-${t.id}">
  <h2 id="qi-${t.id}"><a href="${root}${url.questions(t.id)}">${escapeHtml(t.title)}</a> <span class="muted">· ${countQuestions(t.questions.length)}</span></h2>
  <ol class="plain">${t.questions.map((q) => `<li><a href="${root}${url.questions(t.id, q.id)}">${escapeHtml(toPlainText(q.q))}</a></li>`).join('')}</ol>
</section>`,
  )
  .join('')}`;
  return layout({ root, title: 'Вопросы', active: 'questions', body, data });
}

function pageSearch(data) {
  const root = '';
  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Поиск', '']])}
<h1>Поиск</h1>
<form class="search-form" role="search" action="${url.search()}" method="get" id="search-form">
  <label for="q">Что найти: тема, термин, фрагмент теории, задача или вопрос</label>
  <div class="search-row">
    <input id="q" name="q" type="search" autocomplete="off" spellcheck="false" placeholder="например: НФБК, LEFT JOIN, замыкание">
    <button type="submit">Найти</button>
  </div>
  <fieldset class="search-filter">
    <legend>Искать в</legend>
    <label><input type="checkbox" name="t" value="topic" checked> темах</label>
    <label><input type="checkbox" name="t" value="theory" checked> теории и терминах</label>
    <label><input type="checkbox" name="t" value="task" checked> задачах</label>
    <label><input type="checkbox" name="t" value="question" checked> вопросах</label>
  </fieldset>
</form>
<p id="search-status" class="search-status" role="status" aria-live="polite"></p>
<ol id="search-results" class="search-results"></ol>
<noscript><p class="callout">Для поиска нужен JavaScript. Без него воспользуйтесь <a href="${url.topics()}">картой тем</a> или поиском браузера (Ctrl+F) на странице темы.</p></noscript>
<script src="assets/search.js" defer></script>`;
  return layout({ root, title: 'Поиск', active: '', body, data });
}

function pageSources(data) {
  const root = '';
  const usage = new Map();
  for (const t of data.topics) for (const d of t.sources) usage.set(d, [...(usage.get(d) || []), t]);
  const rows = Object.entries(data.sources)
    .map(([key, s]) => {
      const topics = (usage.get(key) || []).map((t) => `<a href="${url.topic(t.id)}">${escapeHtml(t.short)}</a>`).join(', ');
      const dup = s.duplicates ? `<br><span class="muted">Дубликат (идентичный файл): ${s.duplicates.map((d) => escapeHtml(d.split('/').pop())).join(', ')}</span>` : '';
      return `<tr><td>${escapeHtml(s.title)}${dup}</td><td><code>${escapeHtml(s.file)}</code></td><td>${s.pages ?? '—'}</td><td>${topics || '—'}</td></tr>`;
    })
    .join('');
  const body = `
${breadcrumbs(root, [['Главная', url.home()], ['Источники', '']])}
<h1>Источники</h1>
<p class="lead">Материалы курса, по которым составлен сайт. В ссылках «с. N» указан номер страницы PDF-файла (в некоторых файлах напечатанный на слайде номер отличается на 1).</p>
<div class="table-wrap" tabindex="0"><table>
<thead><tr><th scope="col">Материал</th><th scope="col">Файл</th><th scope="col">Страниц</th><th scope="col">Темы сайта</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<h2>Как помечено происхождение ответов</h2>
<ul>
  <li>${basisNote('material')}</li>
  <li>${basisNote('derived')}</li>
  <li>${basisNote('not-found')}</li>
</ul>
<p>Файлы лекций на сайте не публикуются — указываются только их названия и страницы.</p>`;
  return layout({ root, title: 'Источники', active: 'sources', body, data });
}

function buildSearchIndex(data) {
  const entries = [];
  for (const t of data.topics) {
    entries.push({ k: 'topic', title: t.title, text: t.summary, url: url.topic(t.id), topic: t.short });
    for (const s of t.sections) {
      entries.push({ k: 'theory', title: s.title, text: toPlainText(s.body), url: url.topic(t.id, s.id), topic: t.short });
    }
    for (const term of t.terms || []) {
      entries.push({ k: 'theory', title: `Термин: ${term.term}`, text: toPlainText(term.def), url: `${url.topic(t.id)}#term-${slug(term.term)}`, topic: t.short });
    }
    for (const task of t.tasks) {
      entries.push({ k: 'task', title: task.title, text: toPlainText(task.statement), url: url.tasks(t.id, task.id), topic: t.short });
    }
    for (const q of t.questions) {
      entries.push({ k: 'question', title: toPlainText(q.q), text: '', url: url.questions(t.id, q.id), topic: t.short });
    }
  }
  return entries;
}

export async function build() {
  const data = await loadCourse();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, 'assets'), { recursive: true });

  for (const f of await readdir(ASSETS)) await copyFile(path.join(ASSETS, f), path.join(DIST, 'assets', f));
  await writeFile(path.join(DIST, '.nojekyll'), '');

  await emit('index.html', pageHome(data));
  await emit(url.topics(), pageTopicsIndex(data));
  await emit(url.tasksIndex(), pageTasksIndex(data));
  await emit(url.questionsIndex(), pageQuestionsIndex(data));
  await emit(url.search(), pageSearch(data));
  await emit(url.sources(), pageSources(data));
  for (const topic of data.topics) {
    await emit(url.topic(topic.id), pageTopic(data, topic));
    await emit(url.tasks(topic.id), pageTasks(data, topic));
    await emit(url.questions(topic.id), pageQuestions(data, topic));
  }
  await emit('assets/search-index.json', JSON.stringify(buildSearchIndex(data)));

  const tasks = data.topics.reduce((n, t) => n + t.tasks.length, 0);
  const qs = data.topics.reduce((n, t) => n + t.questions.length, 0);
  return { topics: data.topics.length, tasks, questions: qs, dist: DIST };
}

