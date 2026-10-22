// Выполняет SQL из решений задач в настоящем PostgreSQL (PGlite = PostgreSQL 18 в WebAssembly).
// Для каждой задачи с полем sql создаётся чистая БД, загружаются фикстуры
// (content/fixtures/*.sql), затем выполняется код решения.
// Если задано sql.expect — результат последнего оператора сравнивается с ожидаемым.
import { PGlite } from '@electric-sql/pglite';
import { loadCourse, loadFixture, asArray } from '../src/content.js';

const only = process.argv[2]; // необязательно: id одной задачи
const data = await loadCourse();
const tasks = data.topics.flatMap((t) => t.tasks).filter((t) => t.sql && (!only || t.id === only));

function normalizeRows(rows) {
  return rows.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => {
        if (v instanceof Date) return [k, v.toISOString()];
        if (typeof v === 'bigint') return [k, Number(v)];
        return [k, v];
      }),
    ),
  );
}

let failed = 0;
for (const task of tasks) {
  const db = await PGlite.create();
  try {
    await db.exec('SET TIME ZONE \'UTC\';');
    for (const fx of asArray(task.sql.fixture)) await db.exec(await loadFixture(fx));
    const results = await db.exec(task.sql.code);
    const last = results[results.length - 1];
    const rows = normalizeRows(last?.rows || []);
    if (task.sql.expect) {
      // Сравниваются только столбцы, перечисленные в ожидаемых строках:
      // так можно не проверять значения, зависящие от текущей даты.
      const keys = Object.keys(task.sql.expect[0] || {});
      const projected = keys.length ? rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]]))) : rows;
      const got = JSON.stringify(projected);
      const want = JSON.stringify(task.sql.expect);
      if (got !== want) throw new Error(`результат не совпал\n    ожидалось: ${want}\n    получено:  ${got}`);
    }
    if (task.sql.expectSubset) {
      // Каждая ожидаемая строка должна встретиться в результате (по указанным столбцам).
      for (const want of task.sql.expectSubset) {
        const keys = Object.keys(want);
        const found = rows.some((r) => keys.every((k) => JSON.stringify(r[k]) === JSON.stringify(want[k])));
        if (!found) throw new Error(`в результате нет строки ${JSON.stringify(want)}\n    получено: ${JSON.stringify(rows)}`);
      }
    }
    if (task.sql.nonEmpty && !rows.length) throw new Error('запрос вернул пустой результат на тестовых данных');
    if (process.env.SHOW) console.log(`  ${task.id}:`, JSON.stringify(rows));
    console.log(`ok   ${task.id}${task.sql.expect || task.sql.expectSubset ? ' (результат совпал)' : ''} — строк: ${rows.length}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${task.id}: ${e.message}`);
  } finally {
    await db.close();
  }
}

console.log(`\nSQL-проверка: ${tasks.length - failed} из ${tasks.length} решений выполнены успешно.`);
if (failed) process.exit(1);
