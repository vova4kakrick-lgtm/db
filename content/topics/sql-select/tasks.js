const Q = (pages) => ({ doc: 'l06', pages });

const DATA = 'Тестовые данные Uni-DB сайта: `content/fixtures/uni.sql`.';

export default [
  {
    id: 'sel-join3',
    title: 'Студент и названия его курсов (JOIN трёх таблиц)',
    level: 1,
    statement: `
${DATA}
Выведите названия курсов, на которые записан студент 'Карнап', в алфавитном порядке. Используйте явный \`JOIN … ON\`.
`,
    answer: `
Databases, Биоэтика, Венский кружок, Философия науки, Этика (латиница при сортировке идёт раньше кириллицы).
`,
    solution: `
Задача из практики к лекции («явный JOIN трёх таблиц: студент и названия его курсов»). Таблица связи \`enrollment\` соединяет \`student\` и \`course\`.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT c.title
FROM enrollment AS e
JOIN student AS s ON s.student_id = e.student_id
JOIN course  AS c ON c.course_id  = e.course_id
WHERE s.name = 'Карнап'
ORDER BY c.title;`,
      expect: [
        { title: 'Databases' },
        { title: 'Биоэтика' },
        { title: 'Венский кружок' },
        { title: 'Философия науки' },
        { title: 'Этика' },
      ],
    },
    theory: ['sql-select#joins'],
    source: [Q('9'), Q('25')],
    basis: 'derived',
  },
  {
    id: 'sel-left-count',
    title: 'Сколько курсов у каждого профессора (включая ноль)',
    level: 1,
    statement: `
${DATA}
Для **каждого** профессора выведите имя и число его курсов, включая профессоров без курсов. Почему нужно \`count(c.course_id)\`, а не \`count(*)\`?
`,
    answer: `
\`LEFT JOIN course … GROUP BY p.professor_id, p.name\` с \`count(c.course_id)\`. У Коперника и Кюри будет 0. С \`count(*)\` у них получилось бы 1, потому что LEFT JOIN даёт для них одну строку с NULL в столбцах course.
`,
    solution: `
{{sql}}
\`count(столбец)\` пропускает NULL, \`count(*)\` считает строки. В \`GROUP BY\` включён ключ \`professor_id\`, чтобы однофамильцы не слились в одну группу.
`,
    sql: {
      fixture: 'uni',
      code: `SELECT p.name, count(c.course_id) AS course_count
FROM professor AS p
LEFT JOIN course AS c ON c.professor_id = p.professor_id
GROUP BY p.professor_id, p.name
ORDER BY course_count DESC, p.name;`,
      expect: [
        { name: 'Рассел', course_count: 3 },
        { name: 'Сократ', course_count: 3 },
        { name: 'Кант', course_count: 2 },
        { name: 'Edsger Dijkstra', course_count: 1 },
        { name: 'Августин', course_count: 1 },
        { name: 'Поппер', course_count: 1 },
        { name: 'Коперник', course_count: 0 },
        { name: 'Кюри', course_count: 0 },
      ],
    },
    theory: ['sql-select#joins', 'sql-select#null'],
    source: [Q('10')],
    basis: 'derived',
  },
  {
    id: 'sel-having-filter',
    title: 'Нагрузка преподавателей: GROUP BY, HAVING, FILTER',
    level: 2,
    statement: `
${DATA}
Для профессоров с суммарной нагрузкой не меньше 8 кредитов выведите имя, суммарные кредиты, число курсов и число «малых» курсов (менее 4 кредитов). Отсортируйте по нагрузке по убыванию, затем по имени.
`,
    answer: `
Сократ — 10 кредитов, 3 курса, 1 малый; Кант — 8, 2, 0; Рассел — 8, 3, 3.
`,
    solution: `
\`HAVING\` фильтрует группы по агрегату (в \`WHERE\` агрегат использовать нельзя — группировки ещё нет). \`FILTER\` считает несколько агрегатов с разными условиями за один проход.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT p.name,
       sum(c.credits)::int                       AS load,
       count(*)::int                             AS courses,
       count(*) FILTER (WHERE c.credits < 4)::int AS small_courses
FROM professor AS p
JOIN course AS c USING (professor_id)
GROUP BY p.professor_id, p.name
HAVING sum(c.credits) >= 8
ORDER BY load DESC, p.name;`,
      expect: [
        { name: 'Сократ', load: 10, courses: 3, small_courses: 1 },
        { name: 'Кант', load: 8, courses: 2, small_courses: 0 },
        { name: 'Рассел', load: 8, courses: 3, small_courses: 3 },
      ],
    },
    theory: ['sql-select#group-by', 'sql-select#pipeline'],
    source: [Q('12–13'), Q('25')],
    basis: 'derived',
  },
  {
    id: 'sel-not-in-trap',
    title: 'Ловушка NOT IN с NULL',
    level: 2,
    statement: `
${DATA}
Нужно найти профессоров без курсов. Студент написал:
\`\`\`sql
SELECT name FROM professor
WHERE professor_id NOT IN (SELECT professor_id FROM course);
\`\`\`
Что вернёт запрос на тестовых данных (у курса 'Algorithms' \`professor_id IS NULL\`)? Исправьте его двумя способами.
`,
    answer: `
**Пустой результат.** Подзапрос содержит NULL, поэтому для любого профессора \`x NOT IN (…, NULL)\` даёт FALSE или UNKNOWN, и WHERE отбрасывает строку. Правильно: \`NOT EXISTS\` (или \`LEFT JOIN … WHERE c.course_id IS NULL\`) — результат: Коперник, Кюри.
`,
    solution: `
Это «классическая ловушка» со слайда о трёхзначной логике. \`x NOT IN (a, b, NULL)\` = \`x <> a AND x <> b AND x <> NULL\`; последнее слагаемое — UNKNOWN, поэтому всё выражение не может быть TRUE.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT
  (SELECT count(*)::int FROM professor
   WHERE professor_id NOT IN (SELECT professor_id FROM course)) AS not_in_rows,
  (SELECT string_agg(p.name, ', ' ORDER BY p.name) FROM professor AS p
   WHERE NOT EXISTS (SELECT 1 FROM course AS c WHERE c.professor_id = p.professor_id)) AS not_exists,
  (SELECT string_agg(p.name, ', ' ORDER BY p.name) FROM professor AS p
   LEFT JOIN course AS c ON c.professor_id = p.professor_id
   WHERE c.course_id IS NULL) AS left_join;`,
      expect: [{ not_in_rows: 0, not_exists: 'Коперник, Кюри', left_join: 'Коперник, Кюри' }],
    },
    theory: ['sql-select#null', 'sql-select#exists'],
    source: [Q('6'), Q('16'), Q('25')],
    basis: 'derived',
  },
  {
    id: 'sel-null-logic',
    title: 'Вычислить выражения с NULL',
    level: 1,
    statement: `
Каков результат (TRUE / FALSE / NULL)?
1. \`NULL = NULL\`
2. \`NULL IS NULL\`
3. \`NULL IS DISTINCT FROM NULL\`
4. \`1 IS DISTINCT FROM NULL\`
5. \`TRUE OR NULL\`
6. \`FALSE AND NULL\`
7. \`TRUE AND NULL\`
8. \`NOT (NULL = 1)\`
`,
    answer: `1 — NULL (UNKNOWN); 2 — TRUE; 3 — FALSE; 4 — TRUE; 5 — TRUE; 6 — FALSE; 7 — NULL; 8 — NULL.`,
    solution: `
Сравнение с NULL даёт UNKNOWN (в SQL оно представлено как NULL типа boolean). \`IS [NOT] DISTINCT FROM\` трактует NULL как отдельное состояние. В трёхзначной логике \`TRUE OR UNKNOWN = TRUE\` и \`FALSE AND UNKNOWN = FALSE\`, остальные комбинации с UNKNOWN дают UNKNOWN (пояснение составителя; на слайде — правила для сравнений и WHERE).
{{sql}}
`,
    sql: {
      fixture: [],
      code: `SELECT coalesce((NULL = NULL)::text, 'NULL')               AS e1,
       coalesce((NULL IS NULL)::text, 'NULL')             AS e2,
       coalesce((NULL IS DISTINCT FROM NULL)::text, 'NULL') AS e3,
       coalesce((1 IS DISTINCT FROM NULL)::text, 'NULL')  AS e4,
       coalesce((TRUE OR NULL)::text, 'NULL')             AS e5,
       coalesce((FALSE AND NULL)::text, 'NULL')           AS e6,
       coalesce((TRUE AND NULL)::text, 'NULL')            AS e7,
       coalesce((NOT (NULL = 1))::text, 'NULL')           AS e8;`,
      expect: [{ e1: 'NULL', e2: 'true', e3: 'false', e4: 'true', e5: 'true', e6: 'false', e7: 'NULL', e8: 'NULL' }],
    },
    theory: ['sql-select#null'],
    source: [Q('6')],
    basis: 'derived',
  },
  {
    id: 'sel-case',
    title: 'CASE: распределить студентов по стадиям',
    level: 1,
    statement: `
${DATA}
Используя \`CASE\` из лекции (semester ≤ 4 — 'junior', ≤ 8 — 'middle', иначе — 'senior'), посчитайте, сколько студентов на каждой стадии.
`,
    answer: `junior — 5, middle — 2, senior — 3.`,
    solution: `
CASE проверяет ветки по порядку, поэтому для semester = 3 сработает первая ветка, а не вторая. Группировать можно по выражению или по псевдониму во внешнем запросе.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT stage, count(*)::int AS students
FROM (
  SELECT CASE
           WHEN semester <= 4 THEN 'junior'
           WHEN semester <= 8 THEN 'middle'
           ELSE 'senior'
         END AS stage
  FROM student
) AS t
GROUP BY stage
ORDER BY stage;`,
      expect: [
        { stage: 'junior', students: 5 },
        { stage: 'middle', students: 2 },
        { stage: 'senior', students: 3 },
      ],
    },
    theory: ['sql-select#expressions'],
    source: [Q('5')],
    basis: 'derived',
  },
  {
    id: 'sel-self-join',
    title: 'Self-join: курс и его пререквизиты',
    level: 1,
    statement: `
${DATA}
Выведите пары «курс — пререквизит» названиями (не id) для курса 'Философия науки'.
`,
    answer: `Философия науки — Теория познания; Философия науки — Этика.`,
    solution: `
Таблица \`course\` участвует дважды в разных ролях — нужны два псевдонима (аналог ρ в [алгебре](topic:relational-algebra#rename)).
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT c.title AS course, p.title AS prerequisite
FROM course_prerequisite AS cp
JOIN course AS c ON c.course_id = cp.course_id
JOIN course AS p ON p.course_id = cp.prerequisite_id
WHERE c.title = 'Философия науки'
ORDER BY p.title;`,
      expect: [
        { course: 'Философия науки', prerequisite: 'Теория познания' },
        { course: 'Философия науки', prerequisite: 'Этика' },
      ],
    },
    theory: ['sql-select#joins', 'relational-algebra#rename'],
    source: [Q('11')],
    basis: 'derived',
  },
  {
    id: 'sel-scalar-subquery',
    title: 'Курсы с кредитами выше среднего',
    level: 1,
    statement: `
${DATA}
Найдите курсы, у которых кредитов больше, чем в среднем по всем курсам. Сколько их?
`,
    answer: `Среднее — 3.5; таких курсов **6**: Основы, Этика, Логика, Три критики (по 4) и Databases, Algorithms (по 6).`,
    solution: `
Скалярный подзапрос возвращает одно значение, поэтому его можно сравнивать через \`>\`:
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT title, credits
FROM course
WHERE credits > (SELECT avg(credits) FROM course)
ORDER BY credits DESC, title;`,
      expect: [
        { title: 'Algorithms', credits: 6 },
        { title: 'Databases', credits: 6 },
        { title: 'Логика', credits: 4 },
        { title: 'Основы', credits: 4 },
        { title: 'Три критики', credits: 4 },
        { title: 'Этика', credits: 4 },
      ],
    },
    theory: ['sql-select#subqueries'],
    source: [Q('15')],
    basis: 'derived',
  },
  {
    id: 'sel-set-ops',
    title: 'EXCEPT: записаны, но не сдавали экзаменов',
    level: 1,
    statement: `
${DATA}
1. Найдите id студентов, которые записаны хотя бы на один курс, но не сдавали ни одного экзамена.
2. Найдите студентов, которые ни на что не записаны.
Используйте операции над множествами.
`,
    answer: `
1. \`SELECT student_id FROM enrollment EXCEPT SELECT student_id FROM exam\` → 3, 7, 8 (Фихте, Теофраст, Фейербах).
2. \`SELECT student_id FROM student EXCEPT SELECT student_id FROM enrollment\` → 1, 4 (Ксенократ, Аристоксен).
`,
    solution: `
Разность в SQL — \`EXCEPT\` (не MINUS); операции над множествами удаляют дубликаты (вариант \`… ALL\` сохраняет).
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT s.student_id, s.name
FROM student AS s
WHERE s.student_id IN (
  SELECT student_id FROM enrollment
  EXCEPT
  SELECT student_id FROM exam
)
ORDER BY s.student_id;`,
      expect: [
        { student_id: 3, name: 'Фихте' },
        { student_id: 7, name: 'Теофраст' },
        { student_id: 8, name: 'Фейербах' },
      ],
    },
    theory: ['sql-select#set-ops'],
    source: [Q('17')],
    basis: 'derived',
  },
  {
    id: 'sel-like',
    title: 'LIKE и ILIKE: подвох с алфавитами',
    level: 1,
    statement: `
${DATA}
Что вернёт \`SELECT name FROM student WHERE name LIKE 'A%'\` (буква A латинская)? А \`… WHERE name ILIKE '%TURING%'\`?
`,
    answer: `
\`LIKE 'A%'\` → Ada Lovelace, Alan Turing (но **не** «Аристоксен»: его «А» — кириллическая буква). \`ILIKE '%TURING%'\` → Alan Turing (без учёта регистра).
`,
    solution: `
LIKE учитывает регистр, ILIKE (расширение PostgreSQL) — нет; \`%\` — любая последовательность символов. Латинская A и кириллическая А — разные символы.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT name FROM student WHERE name LIKE 'A%' ORDER BY name;`,
      expect: [{ name: 'Ada Lovelace' }, { name: 'Alan Turing' }],
    },
    theory: ['sql-select#text-match'],
    source: [Q('7')],
    basis: 'derived',
  },
  {
    id: 'sel-pipeline-errors',
    title: 'Почему запрос не работает: порядок выполнения',
    level: 2,
    statement: `
Объясните ошибки и исправьте запросы:
\`\`\`sql
-- (a)
SELECT name, semester * 2 AS double_sem FROM student WHERE double_sem > 10;
-- (b)
SELECT professor_id, count(*) FROM course WHERE count(*) > 2 GROUP BY professor_id;
\`\`\`
`,
    answer: `
(a) \`WHERE\` выполняется раньше \`SELECT\`, псевдонима ещё нет: \`WHERE semester * 2 > 10\` (или вынести в подзапрос/CTE).
(b) Агрегаты в \`WHERE\` недопустимы — группировки ещё нет: \`… GROUP BY professor_id HAVING count(*) > 2\`.
`,
    solution: `
Логический порядок: FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → WINDOW → ORDER BY → LIMIT. Псевдонимы из SELECT доступны только в ORDER BY. Исправленный (b):
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT professor_id, count(*)::int AS courses
FROM course
GROUP BY professor_id
HAVING count(*) > 2
ORDER BY professor_id;`,
      expect: [
        { professor_id: 1, courses: 3 },
        { professor_id: 2, courses: 3 },
      ],
    },
    theory: ['sql-select#pipeline', 'sql-select#group-by'],
    source: [Q('2'), Q('12')],
    basis: 'derived',
  },
];
