// Загрузка и связывание учебного контента из папки content/.
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { course, sources, topicOrder } from '../content/course.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT_DIR = path.join(ROOT, 'content');

export const LEVELS = {
  1: 'базовая',
  2: 'средняя',
  3: 'повышенная',
};

export const BASIS = {
  material: 'Ответ взят из материалов курса.',
  derived: 'Готового ответа в материалах нет: решение составлено по правилам и примерам из указанных лекций.',
  'not-found': 'В материалах курса не найдено.',
};

async function importTopicPart(id, part) {
  const file = path.join(CONTENT_DIR, 'topics', id, `${part}.js`);
  const mod = await import(pathToFileURL(file).href);
  return mod.default;
}

async function loadFixtureSql(name) {
  return readFile(path.join(CONTENT_DIR, 'fixtures', `${name}.sql`), 'utf8');
}

export function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

// "topicId#sectionId" -> { topicId, sectionId }
export function parseRef(ref) {
  const [topicId, sectionId = ''] = ref.split('#');
  return { topicId, sectionId };
}

export async function loadCourse() {
  const topics = [];
  for (const id of topicOrder) {
    const meta = await importTopicPart(id, 'index');
    const tasks = await importTopicPart(id, 'tasks');
    const questions = await importTopicPart(id, 'questions');
    topics.push({ ...meta, id, tasks, questions });
  }

  // SQL-код решения можно хранить в файле фикстуры (sql.file), чтобы не дублировать его.
  for (const topic of topics) {
    for (const task of topic.tasks) {
      if (task.sql?.file && !task.sql.code) {
        task.sql.code = (await loadFixtureSql(task.sql.file)).trim();
      }
      task.topicId = topic.id;
    }
    for (const q of topic.questions) q.topicId = topic.id;
  }

  const byId = new Map(topics.map((t) => [t.id, t]));

  // Обратные ссылки: какие задачи и вопросы опираются на раздел теории.
  for (const topic of topics) {
    for (const s of topic.sections) {
      s.tasks = [];
      s.questions = [];
    }
  }
  for (const topic of topics) {
    for (const item of [...topic.tasks, ...topic.questions]) {
      for (const ref of asArray(item.theory)) {
        const { topicId, sectionId } = parseRef(ref);
        const section = byId.get(topicId)?.sections.find((s) => s.id === sectionId);
        if (!section) continue;
        (item.q ? section.questions : section.tasks).push(item);
      }
    }
  }

  return { course, sources, topics, byId };
}

export async function loadFixture(name) {
  return loadFixtureSql(name);
}
