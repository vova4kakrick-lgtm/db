// Тема 10. CTE, рекурсия, оконные функции, идиомы PostgreSQL, представления, EXPLAIN.
const Q = (pages) => ({ doc: 'l06', pages });
const Q7 = (pages) => ({ doc: 'l07', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default {
  title: 'CTE, рекурсия, оконные функции, представления',
  short: 'CTE и окна',
  summary:
    'WITH и рекурсивный WITH RECURSIVE, оконные функции, шаблон «для всех» без деления, DISTINCT ON и LATERAL, VIEW и MATERIALIZED VIEW, CHECK OPTION, EXPLAIN.',
  sources: ['l06', 'l07', 'ddl'],
  sections: [
    {
      id: 'cte',
      title: 'CTE: даём имя шагу запроса',
      source: [Q('18'), Q7('17')],
      body: `
\`\`\`sql
WITH load AS (
  SELECT professor_id, sum(credits) AS credits
  FROM course
  GROUP BY professor_id
)
SELECT p.name, l.credits
FROM load AS l
JOIN professor AS p USING (professor_id)
ORDER BY l.credits DESC;
\`\`\`

CTE (\`WITH\`) делает сложный запрос читаемым: каждый шаг получает имя. PostgreSQL может встроить CTE без побочных эффектов в основной запрос; \`MATERIALIZED\` / \`NOT MATERIALIZED\` позволяют переопределить выбор:

\`\`\`sql
WITH expensive AS MATERIALIZED (
  SELECT ...
)
SELECT ... FROM expensive;
\`\`\`
`,
    },
    {
      id: 'recursive',
      title: 'Рекурсивный CTE: все пререквизиты',
      source: [Q('19'), Q7('18')],
      body: `
\`\`\`sql
WITH RECURSIVE prereq(course_id, prerequisite_id) AS (
  SELECT course_id, prerequisite_id          -- нерекурсивная (стартовая) часть
  FROM course_prerequisite
  UNION
  SELECT p.course_id, cp.prerequisite_id     -- рекурсивная часть
  FROM prereq AS p
  JOIN course_prerequisite AS cp
    ON cp.course_id = p.prerequisite_id
)
SELECT c.title, p.title AS prerequisite
FROM prereq AS r
JOIN course AS c ON c.course_id = r.course_id
JOIN course AS p ON p.course_id = r.prerequisite_id;
\`\`\`

Схема рекурсивного CTE: стартовые строки \`UNION [ALL]\` шаг, ссылающийся на сам CTE; шаг повторяется, пока появляются новые строки. Так вычисляется транзитивное замыкание графа (все уровни пререквизитов), которое не выражается одной формулой реляционной алгебры (ср. «дедушки» через [переименование](topic:relational-algebra#rename)).

> **Пояснение составителя:** \`UNION\` (без ALL) отбрасывает уже найденные строки и поэтому защищает от зацикливания в графе с циклами. Для деревьев (комментарии-ответы, задача 8 демо-варианта) в рекурсивную часть добавляют счётчик глубины и путь — см. [практикум](tasks:exam-practice#demo-q8).
`,
    },
    {
      id: 'window',
      title: 'Оконные функции',
      source: [Q('14'), Q7('13')],
      body: `
**Оконные функции не схлопывают строки** — в отличие от GROUP BY, каждая строка остаётся, а к ней добавляется значение, вычисленное по «окну» связанных строк.

\`\`\`sql
-- нагрузка профессора рядом с каждым его курсом
SELECT p.name, c.title, c.credits,
       sum(c.credits) OVER (PARTITION BY p.professor_id) AS total_load
FROM professor AS p
JOIN course AS c USING (professor_id);

-- место студента на экзамене внутри курса
SELECT student_id, course_id, grade,
       row_number() OVER (
         PARTITION BY course_id
         ORDER BY grade DESC NULLS LAST
       ) AS place
FROM exam;
\`\`\`

- \`PARTITION BY\` — на какие группы делится окно; \`ORDER BY\` внутри \`OVER\` — порядок строк в окне.
- \`NULLS LAST\` — куда ставить NULL при сортировке.
- Оконные функции вычисляются после \`HAVING\` ([порядок SELECT](topic:sql-select#pipeline)), поэтому «топ-N в группе» фильтруют во внешнем запросе: \`WHERE place <= N\`.

> Кроме \`row_number()\` и агрегатов с \`OVER\`, другие оконные функции (\`rank\`, \`lag\`, \`lead\` и т. п.) на слайдах не разбираются — где они используются в решениях сайта, это отмечено.
`,
    },
    {
      id: 'for-all',
      title: 'Шаблон «для всех» без деления',
      source: [Q('20'), Q7('19')],
      body: `
В SQL нет операции деления ([÷ в алгебре](topic:relational-algebra#division)). Два шаблона — студенты, записанные на **все** 6-кредитные курсы:

\`\`\`sql
-- 1. Двойное отрицание: нет такого 6-кредитного курса, на который студент не записан
SELECT s.student_id, s.name
FROM student AS s
WHERE NOT EXISTS (
  SELECT 1 FROM course AS c
  WHERE c.credits = 6
    AND NOT EXISTS (
      SELECT 1 FROM enrollment AS e
      WHERE e.student_id = s.student_id
        AND e.course_id = c.course_id
    )
);

-- 2. Через счётчики; DISTINCT важен при возможных дублях
SELECT e.student_id
FROM enrollment AS e
JOIN course AS c USING (course_id)
WHERE c.credits = 6
GROUP BY e.student_id
HAVING count(DISTINCT e.course_id) =
       (SELECT count(*) FROM course WHERE credits = 6);
\`\`\`

> **Пояснение составителя:** варианты различаются, если 6-кредитных курсов нет вовсе: первый вернёт всех студентов (условие «для всех» по пустому множеству истинно), второй — никого. Это тот же вопрос, что на слайде о делении: «что будет, если курсов нет?».
`,
    },
    {
      id: 'pg-idioms',
      title: 'Идиомы PostgreSQL: DISTINCT ON и LATERAL',
      source: [Q('21'), Q7('20')],
      body: `
\`\`\`sql
-- Последний экзамен каждого студента
SELECT DISTINCT ON (student_id)
       student_id, course_id, taken_at, grade
FROM exam
ORDER BY student_id, taken_at DESC NULLS LAST;
\`\`\`
\`DISTINCT ON (выражения)\` оставляет **первую** строку каждой группы в порядке \`ORDER BY\`; поэтому \`ORDER BY\` начинается с тех же выражений.

\`\`\`sql
-- LATERAL: подзапрос вычисляется для каждой внешней строки
SELECT p.name, x.title
FROM professor AS p
LEFT JOIN LATERAL (
  SELECT c.title
  FROM course AS c
  WHERE c.professor_id = p.professor_id
  ORDER BY c.credits DESC
  LIMIT 1
) AS x ON true;
\`\`\`
\`LATERAL\` позволяет подзапросу в FROM ссылаться на столбцы предыдущих таблиц — удобно для «топ-1/топ-N на каждую строку». \`LEFT JOIN … ON true\` сохраняет профессоров без курсов.
`,
    },
    {
      id: 'views',
      title: 'VIEW и MATERIALIZED VIEW',
      source: [Q('22–23'), Q7('21–22'), D('7')],
      body: `
- **VIEW** хранит **запрос, а не строки**. Простые представления автоматически обновляемы.
- **CHECK OPTION** — в фильтрованном обновляемом VIEW запрещает INSERT/UPDATE/MERGE, после которых строка исчезла бы из представления.
- **MATERIALIZED VIEW** физически хранит результат; обновляется явно через \`REFRESH MATERIALIZED VIEW\`.
- **Сложные обновления:** JOIN/aggregate-представления по умолчанию только для чтения; поведение можно задать через \`INSTEAD OF\` trigger.

\`\`\`sql
CREATE VIEW active_students AS
SELECT student_id, name, semester
FROM student
WHERE semester <= 14
WITH LOCAL CHECK OPTION;

UPDATE active_students SET semester = 2 WHERE student_id = 42;

CREATE MATERIALIZED VIEW professor_load AS
SELECT professor_id, sum(credits) AS credits
FROM course
GROUP BY professor_id;

CREATE UNIQUE INDEX ON professor_load(professor_id);
REFRESH MATERIALIZED VIEW professor_load;
\`\`\`

Сценарии VIEW из конспекта: упрощение сложных запросов (спрятать JOIN) и **безопасность** — дать доступ только к части столбцов и строк (\`CREATE VIEW public_users AS SELECT id, name FROM users WHERE is_public = true\`).
`,
    },
    {
      id: 'explain',
      title: 'EXPLAIN: проверяем, а не гадаем',
      source: [Q('24'), Q7('23')],
      body: `
\`\`\`sql
EXPLAIN
SELECT s.name, c.title
FROM enrollment AS e
JOIN student AS s USING (student_id)
JOIN course  AS c USING (course_id)
WHERE c.credits >= 6;

EXPLAIN (ANALYZE, BUFFERS)
SELECT ...;
\`\`\`

\`EXPLAIN\` показывает план выполнения; \`EXPLAIN ANALYZE\` **реально выполняет запрос** — осторожно с командами, изменяющими данные. Практика лекции: сравнить планы «преподаватели без курсов» через \`NOT EXISTS\` и через \`LEFT JOIN\`.

> Как читать узлы плана (типы соединений, сканирования, оценки стоимости), в просмотренных лекциях не разбирается — это тема второй части курса (В материалах курса не найдено).
`,
    },
  ],
  terms: [
    { term: 'CTE (WITH)', def: 'Именованный шаг запроса; PostgreSQL может встроить его в основной запрос (MATERIALIZED / NOT MATERIALIZED управляют этим).', source: Q('18') },
    { term: 'WITH RECURSIVE', def: 'CTE, ссылающийся на себя: стартовая часть UNION рекурсивная часть; вычисляет, например, транзитивные пререквизиты.', source: Q('19') },
    { term: 'Оконная функция', def: 'Функция над «окном» связанных строк (OVER (PARTITION BY … ORDER BY …)), не схлопывающая строки.', source: Q('14') },
    { term: 'DISTINCT ON', def: 'Идиом PostgreSQL: первая строка каждой группы в порядке ORDER BY.', source: Q('21') },
    { term: 'LATERAL', def: 'Подзапрос в FROM, вычисляемый для каждой внешней строки и видящий её столбцы.', source: Q('21') },
    { term: 'MATERIALIZED VIEW', def: 'Представление, физически хранящее результат; обновляется REFRESH MATERIALIZED VIEW.', source: Q('22') },
    { term: 'WITH CHECK OPTION', def: 'Запрещает через представление изменения, после которых строка выпала бы из него.', source: Q('22') },
  ],
};
