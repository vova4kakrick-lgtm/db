// Тема 9. SELECT: фильтрация, NULL, JOIN, группировка, подзапросы.
const Q = (pages) => ({ doc: 'l06', pages });
const Q7 = (pages) => ({ doc: 'l07', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default {
  title: 'SELECT: фильтры, NULL, JOIN, группировка, подзапросы',
  short: 'SELECT и JOIN',
  summary:
    'Логический порядок выполнения SELECT, фильтрация и сортировка, CASE и приведение типов, трёхзначная логика NULL, сопоставление строк, виды JOIN, GROUP BY / HAVING / FILTER, подзапросы, EXISTS / NOT EXISTS, UNION / INTERSECT / EXCEPT.',
  sources: ['l06', 'l07'],
  sections: [
    {
      id: 'pipeline',
      title: 'SELECT — это конвейер',
      source: [Q('2'), Q7('2')],
      body: `
Логический порядок выполнения:

**FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → WINDOW → ORDER BY → LIMIT**

Он объясняет многие правила SQL: псевдонимы, агрегаты и оконные функции становятся доступны на разных этапах. Следствия (пояснение составителя по этому порядку):
- в \`WHERE\` нельзя использовать агрегаты — группировки ещё нет; условие на агрегат пишут в \`HAVING\`;
- псевдоним из списка \`SELECT\` нельзя использовать в \`WHERE\`, но можно в \`ORDER BY\`;
- оконные функции вычисляются после \`HAVING\`, поэтому фильтр по результату окна делают во внешнем запросе или CTE.

Все примеры темы — на [Uni-DB](topic:sql-ddl#uni-ddl): \`student\`, \`professor\`, \`course\`, \`enrollment\`, \`course_prerequisite\`, \`exam\`.
`,
    },
    {
      id: 'select-basics',
      title: 'Фильтрация, проекция, сортировка, пагинация',
      source: [Q('4'), Q7('4')],
      body: `
\`\`\`sql
SELECT student_id, name, semester
FROM student
WHERE semester BETWEEN 1 AND 6
ORDER BY semester, name
LIMIT 20 OFFSET 0;

SELECT DISTINCT semester
FROM student
WHERE semester IS NOT NULL
ORDER BY semester;
\`\`\`

- \`DISTINCT\` удаляет дубликаты (в отличие от проекции в алгебре, SQL по умолчанию работает с мультимножествами).
- **Для пагинации нужен детерминированный \`ORDER BY\`** — иначе страницы могут пересекаться.
`,
    },
    {
      id: 'expressions',
      title: 'Выражения, CASE, приведение типов, COALESCE/NULLIF',
      source: [Q('5'), Q7('5'), D('3–4')],
      body: `
\`\`\`sql
SELECT name, semester,
       CASE
         WHEN semester <= 4 THEN 'junior'
         WHEN semester <= 8 THEN 'middle'
         ELSE 'senior'
       END AS stage
FROM student;

SELECT course_id,
       credits::numeric / 2      AS half_credits,
       COALESCE(room, 'TBA')     AS room_label,
       NULLIF(trim(room), '')    AS room_or_null
FROM course
LEFT JOIN professor USING (professor_id);
\`\`\`

- \`CASE WHEN … THEN … ELSE … END\` — условное выражение; ветки проверяются по порядку.
- \`::type\` или \`CAST(x AS type)\` — приведение; \`credits::numeric / 2\` избегает целочисленного деления.
- \`COALESCE(a, b, …)\` — первое не-NULL значение; \`NULLIF(x, y)\` — NULL, если x = y.
- Функции дат для отчётов: \`DATE_TRUNC('month', ts)\`, \`EXTRACT(DOW FROM ts)\`, \`now() - INTERVAL '30 days'\` ([функции](topic:sql-ddl#schema-objects)).
`,
    },
    {
      id: 'null',
      title: 'NULL и трёхзначная логика',
      source: [Q('6'), Q7('6')],
      body: `
**NULL означает «неизвестно / отсутствует», а не значение.**

- **Сравнения:** \`NULL = NULL\` и \`NULL <> NULL\` дают **UNKNOWN**. Используйте \`IS NULL\` / \`IS NOT NULL\`.
- **WHERE** оставляет только строки с **TRUE**; FALSE и UNKNOWN отбрасываются.
- **Безопасное равенство:** \`IS DISTINCT FROM\` / \`IS NOT DISTINCT FROM\` сравнивают NULL как отдельное состояние.
- **Классическая ловушка:** \`NOT IN\` может дать UNKNOWN, если подзапрос содержит NULL; \`NOT EXISTS\` часто безопаснее.

Агрегаты (\`count(col)\`, \`sum\`, \`avg\`) пропускают NULL; \`count(*)\` считает строки (пояснение составителя; на слайдах это видно из примера \`count(c.course_id)\` с LEFT JOIN, где для профессора без курсов получается 0).
`,
    },
    {
      id: 'text-match',
      title: 'Сопоставление строк: LIKE, ILIKE, регулярные выражения',
      source: [Q('7'), Q7('7')],
      body: `
\`\`\`sql
SELECT * FROM student WHERE name LIKE 'A%';          -- с учётом регистра
SELECT * FROM student WHERE name ILIKE '%turing%';   -- PostgreSQL, без учёта регистра
SELECT * FROM course  WHERE title ~ 'Data(base| Engineering)';  -- regexp
SELECT * FROM course  WHERE title !~* 'intro';       -- отрицательный regexp без регистра
\`\`\`

В \`LIKE\`: \`%\` — любая последовательность символов, \`_\` — один символ.
`,
    },
    {
      id: 'joins',
      title: 'Виды JOIN: INNER, LEFT, FULL, CROSS, self-join',
      source: [Q('8–11'), Q7('8–10')],
      body: `
| JOIN | Результат |
| --- | --- |
| \`INNER JOIN\` | только совпавшие строки |
| \`LEFT JOIN\` | все строки слева + совпадения (иначе NULL) |
| \`FULL JOIN\` | все строки с обеих сторон |
| \`CROSS JOIN\` | декартово произведение |

**Избегайте \`NATURAL JOIN\`:** добавление одноимённых столбцов незаметно меняет смысл запроса. **Явный \`JOIN … ON\` лучше старого синтаксиса через запятую.** \`USING (col)\` — сокращение для соединения по одноимённому столбцу.

\`\`\`sql
-- INNER JOIN: связываем факты по ключам
SELECT s.name AS student, c.title AS course
FROM enrollment AS e
JOIN student AS s ON s.student_id = e.student_id
JOIN course  AS c ON c.course_id  = e.course_id
ORDER BY s.name, c.title;

-- LEFT JOIN: сохраняем строки без пары
SELECT p.name, count(c.course_id) AS course_count
FROM professor AS p
LEFT JOIN course AS c ON c.professor_id = p.professor_id
GROUP BY p.professor_id, p.name
ORDER BY course_count DESC, p.name;
-- преподаватель без курсов попадёт в результат с count = 0

-- self-join: одна таблица в двух ролях
SELECT c.title AS course, p.title AS prerequisite
FROM course_prerequisite AS cp
JOIN course AS c ON c.course_id = cp.course_id
JOIN course AS p ON p.course_id = cp.prerequisite_id
ORDER BY c.title, p.title;
\`\`\`

Связь с алгеброй: JOIN … ON — θ-соединение, LEFT JOIN — левое внешнее соединение ⟕ ([реляционная алгебра](topic:relational-algebra#outer-semi)).
`,
    },
    {
      id: 'group-by',
      title: 'GROUP BY, HAVING, агрегаты, FILTER',
      source: [Q('12–13'), Q7('11–12')],
      body: `
\`\`\`sql
SELECT professor_id,
       count(*)     AS courses,
       sum(credits) AS teaching_credits,
       avg(credits) AS avg_credits
FROM course
GROUP BY professor_id;

SELECT p.name, sum(c.credits) AS load
FROM professor AS p
JOIN course AS c USING (professor_id)
GROUP BY p.professor_id, p.name
HAVING sum(c.credits) >= 8
ORDER BY load DESC;
\`\`\`

- \`WHERE\` фильтрует строки **до** группировки, \`HAVING\` — группы **после**.
- В \`SELECT\` с \`GROUP BY\` можно выводить столбцы группировки и агрегаты.
- **\`FILTER\`** — несколько агрегатов с разными условиями за один проход:

\`\`\`sql
SELECT professor_id,
       count(*)                                AS total_courses,
       count(*) FILTER (WHERE credits >= 6)    AS large_courses,
       avg(credits) FILTER (WHERE credits > 0) AS avg_credits
FROM course
GROUP BY professor_id;
\`\`\`
`,
    },
    {
      id: 'subqueries',
      title: 'Подзапросы: скалярные, IN/ANY/ALL, коррелированные',
      source: [Q('15'), Q7('14')],
      body: `
Выбирайте форму подзапроса под смысл вопроса:
- **Скалярный** — одно значение: \`WHERE credits > (SELECT avg(credits) FROM course)\`.
- **IN / ANY / ALL** — сравнение с множеством; помните о семантике NULL.
- **EXISTS** — проверка существования хотя бы одной строки; естественный вариант для semi-join.
- **Коррелированный** — внутренний запрос ссылается на строку внешнего. Часто хорошо оптимизируется, но дорогие случаи проверяют планом ([EXPLAIN](topic:sql-advanced#explain)).
`,
    },
    {
      id: 'exists',
      title: 'EXISTS и NOT EXISTS: semi- и anti-join',
      source: [Q('16'), Q7('15')],
      body: `
\`\`\`sql
-- профессора, у которых есть хотя бы один курс (semi-join)
SELECT p.name
FROM professor AS p
WHERE EXISTS (
  SELECT 1 FROM course AS c WHERE c.professor_id = p.professor_id
);

-- профессора без курсов (anti-join)
SELECT p.name
FROM professor AS p
WHERE NOT EXISTS (
  SELECT 1 FROM course AS c WHERE c.professor_id = p.professor_id
);
-- здесь нет NULL-ловушки NOT IN
\`\`\`

Тот же anti-join можно записать через \`LEFT JOIN … WHERE c.course_id IS NULL\`; лекция предлагает сравнить планы обоих вариантов. Это SQL-аналоги полусоединения ⋉ и «антисоединения» из [алгебры](topic:relational-algebra#outer-semi).
`,
    },
    {
      id: 'set-ops',
      title: 'UNION, INTERSECT, EXCEPT',
      source: [Q('17'), Q7('16')],
      body: `
\`\`\`sql
SELECT name FROM professor
UNION
SELECT name FROM student;

SELECT student_id FROM enrollment
INTERSECT
SELECT student_id FROM exam;

SELECT student_id FROM student
EXCEPT
SELECT student_id FROM enrollment;
\`\`\`

- **Операция разности в SQL — \`EXCEPT\`, не \`MINUS\`.**
- \`UNION\` удаляет дубликаты, \`UNION ALL\` сохраняет.
- Запросы должны быть совместимы: одинаковое число столбцов и совместимые типы (ср. совместимость по объединению в [алгебре](topic:relational-algebra#set-ops)).
`,
    },
  ],
  terms: [
    { term: 'Логический порядок SELECT', def: 'FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → WINDOW → ORDER BY → LIMIT.', source: Q('2') },
    { term: 'UNKNOWN', def: 'Третье логическое значение; результат сравнения с NULL. WHERE отбрасывает строки с FALSE и UNKNOWN.', source: Q('6') },
    { term: 'IS DISTINCT FROM', def: 'Сравнение, при котором NULL считается отдельным состоянием, а не «неизвестно».', source: Q('6') },
    { term: 'HAVING', def: 'Фильтр групп после GROUP BY (условия на агрегаты).', source: Q('12') },
    { term: 'FILTER', def: 'Условие для отдельного агрегата: `count(*) FILTER (WHERE …)`.', source: Q('13') },
    { term: 'Коррелированный подзапрос', def: 'Подзапрос, ссылающийся на строку внешнего запроса.', source: Q('15') },
    { term: 'Semi-join / anti-join', def: 'EXISTS / NOT EXISTS: строки, для которых есть / нет пары в другой таблице.', source: Q('16') },
    { term: 'EXCEPT', def: 'Разность результатов запросов в SQL (а не MINUS).', source: Q('17') },
  ],
};
