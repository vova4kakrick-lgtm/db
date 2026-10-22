const Q = (pages) => ({ doc: 'l06', pages });

const DATA = 'Тестовые данные Uni-DB сайта: `content/fixtures/uni.sql`.';

export default [
  {
    id: 'adv-recursive-prereq',
    title: 'Все пререквизиты курса (WITH RECURSIVE)',
    level: 2,
    statement: `
${DATA}
Найдите **все** (транзитивные) пререквизиты курса 'Венский кружок' и для каждого — минимальный уровень (1 — прямой пререквизит, 2 — пререквизит пререквизита и т. д.).
`,
    answer: `
Философия науки — 1; Теория познания — 2; Этика — 2; Основы — 3.
`,
    solution: `
Рекурсивный CTE по образцу лекции, но стартующий с одного курса и с дополнительным счётчиком глубины. Основы достижимы двумя путями (через Теорию познания и через Этику) — поэтому берём \`min(depth)\`.
{{sql}}
Графы пререквизитов не должны содержать циклов; если цикл возможен, глубину нужно ограничить (\`WHERE depth < N\`) — пояснение составителя.
`,
    sql: {
      fixture: 'uni',
      code: `WITH RECURSIVE prereq(prerequisite_id, depth) AS (
  SELECT cp.prerequisite_id, 1
  FROM course_prerequisite AS cp
  JOIN course AS c ON c.course_id = cp.course_id
  WHERE c.title = 'Венский кружок'
  UNION ALL
  SELECT cp.prerequisite_id, p.depth + 1
  FROM prereq AS p
  JOIN course_prerequisite AS cp ON cp.course_id = p.prerequisite_id
)
SELECT c.title, min(p.depth) AS level
FROM prereq AS p
JOIN course AS c ON c.course_id = p.prerequisite_id
GROUP BY c.title
ORDER BY level, c.title;`,
      expect: [
        { title: 'Философия науки', level: 1 },
        { title: 'Теория познания', level: 2 },
        { title: 'Этика', level: 2 },
        { title: 'Основы', level: 3 },
      ],
    },
    theory: ['sql-advanced#recursive', 'sql-advanced#cte'],
    source: [Q('19'), Q('25')],
    basis: 'derived',
  },
  {
    id: 'adv-window-rank',
    title: 'Ранжировать результаты экзамена внутри курса',
    level: 1,
    statement: `
${DATA}
Для курса 'Databases' (course_id = 11) выведите все попытки с оценками и место внутри курса по убыванию оценки (\`row_number\`). Чем это отличается от \`GROUP BY course_id\`?
`,
    answer: `
Ada Lovelace 10.0 — 1; Alan Turing 7.5 — 2; Карнап 6.5 — 3; Карнап 4.0 — 4. В отличие от GROUP BY строки не схлопываются: каждая попытка остаётся, к ней добавляется номер.
`,
    solution: `
Запрос со слайда «Оконные функции», ограниченный одним курсом. \`NULLS LAST\` отправляет попытки без оценки в конец.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT s.name, e.grade::text AS grade,
       row_number() OVER (
         PARTITION BY e.course_id
         ORDER BY e.grade DESC NULLS LAST
       ) AS place
FROM exam AS e
JOIN student AS s USING (student_id)
WHERE e.course_id = 11
ORDER BY place;`,
      expect: [
        { name: 'Ada Lovelace', grade: '10.0', place: 1 },
        { name: 'Alan Turing', grade: '7.5', place: 2 },
        { name: 'Карнап', grade: '6.5', place: 3 },
        { name: 'Карнап', grade: '4.0', place: 4 },
      ],
    },
    theory: ['sql-advanced#window'],
    source: [Q('14'), Q('25')],
    basis: 'derived',
  },
  {
    id: 'adv-top1-per-group',
    title: 'Лучший результат в каждом курсе (top-1 в группе)',
    level: 2,
    statement: `
${DATA}
Для каждого курса, по которому есть оценки, выведите студента с максимальной оценкой. Почему нельзя написать условие на \`row_number()\` прямо в WHERE?
`,
    answer: `
Основы — Карнап (9.0); Этика — Йонас (8.0); Три критики — Шопенгауэр (8.0); Databases — Ada Lovelace (10.0). Оконные функции вычисляются после WHERE, поэтому фильтр \`place = 1\` пишут во внешнем запросе/CTE.
`,
    solution: `
{{sql}}
Попытки без оценки отброшены в WHERE до ранжирования. При равных оценках \`row_number\` выберет одну строку произвольно; чтобы вернуть всех лучших, используют \`rank()\` (в лекции не разбирается) или сравнение с \`max(grade)\`.
`,
    sql: {
      fixture: 'uni',
      code: `WITH ranked AS (
  SELECT e.course_id, e.student_id, e.grade,
         row_number() OVER (PARTITION BY e.course_id ORDER BY e.grade DESC) AS place
  FROM exam AS e
  WHERE e.grade IS NOT NULL
)
SELECT c.title, s.name, r.grade::text AS grade
FROM ranked AS r
JOIN course  AS c USING (course_id)
JOIN student AS s USING (student_id)
WHERE r.place = 1
ORDER BY c.course_id;`,
      expect: [
        { title: 'Основы', name: 'Карнап', grade: '9.0' },
        { title: 'Этика', name: 'Йонас', grade: '8.0' },
        { title: 'Три критики', name: 'Шопенгауэр', grade: '8.0' },
        { title: 'Databases', name: 'Ada Lovelace', grade: '10.0' },
      ],
    },
    theory: ['sql-advanced#window', 'sql-select#pipeline', 'sql-advanced#cte'],
    source: [Q('2'), Q('14')],
    basis: 'derived',
  },
  {
    id: 'adv-window-share',
    title: 'Доля курса в нагрузке профессора',
    level: 2,
    statement: `
${DATA}
Для курсов Сократа выведите название, кредиты, суммарную нагрузку Сократа и долю курса в процентах (округлить до целого). Решите без GROUP BY.
`,
    answer: `Логика 4 / 10 — 40%; Маевтика 2 / 10 — 20%; Этика 4 / 10 — 40%.`,
    solution: `
\`sum(…) OVER (PARTITION BY professor_id)\` даёт итог по профессору в каждой строке, не схлопывая курсы (пример со слайда). Приведение к numeric перед делением избегает целочисленного деления.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT title, credits, total_load,
       round(100 * credits::numeric / total_load)::int AS pct
FROM (
  SELECT c.title, c.credits, p.name,
         sum(c.credits) OVER (PARTITION BY p.professor_id) AS total_load
  FROM professor AS p
  JOIN course AS c USING (professor_id)
) AS t
WHERE name = 'Сократ'
ORDER BY title;`,
      expect: [
        { title: 'Логика', credits: 4, total_load: 10, pct: 40 },
        { title: 'Маевтика', credits: 2, total_load: 10, pct: 20 },
        { title: 'Этика', credits: 4, total_load: 10, pct: 40 },
      ],
    },
    theory: ['sql-advanced#window', 'sql-ddl#schema-objects'],
    source: [Q('14'), { doc: 'ddl', pages: '4' }],
    basis: 'derived',
  },
  {
    id: 'adv-for-all',
    title: 'Записаны на все 6-кредитные курсы',
    level: 2,
    statement: `
${DATA}
Найдите студентов, записанных на **все** курсы с 6 кредитами, двумя способами: двойным \`NOT EXISTS\` и через счётчики. Чем отличаются способы, если 6-кредитных курсов нет совсем?
`,
    answer: `
Ada Lovelace и Alan Turing (оба записаны на Databases и Algorithms; Карнап — только на Databases). При пустом множестве 6-кредитных курсов двойной NOT EXISTS вернёт **всех** студентов, вариант со счётчиками — **никого**.
`,
    solution: `
Оба запроса — со слайда «Всеобщность». Первый читается как «нет такого 6-кредитного курса, на который студент не записан» (это реляционное деление). Второй сравнивает число нужных курсов у студента с общим числом; \`DISTINCT\` защищает от дублей.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT s.student_id, s.name
FROM student AS s
WHERE NOT EXISTS (
  SELECT 1 FROM course AS c
  WHERE c.credits = 6
    AND NOT EXISTS (
      SELECT 1 FROM enrollment AS e
      WHERE e.student_id = s.student_id
        AND e.course_id = c.course_id
    )
)
INTERSECT
SELECT e.student_id, s.name
FROM enrollment AS e
JOIN course AS c USING (course_id)
JOIN student AS s USING (student_id)
WHERE c.credits = 6
GROUP BY e.student_id, s.name
HAVING count(DISTINCT e.course_id) = (SELECT count(*) FROM course WHERE credits = 6)
ORDER BY student_id;`,
      expect: [
        { student_id: 9, name: 'Ada Lovelace' },
        { student_id: 10, name: 'Alan Turing' },
      ],
    },
    theory: ['sql-advanced#for-all', 'relational-algebra#division'],
    source: [Q('20')],
    basis: 'derived',
  },
  {
    id: 'adv-distinct-on',
    title: 'Последний экзамен каждого студента (DISTINCT ON)',
    level: 2,
    statement: `
${DATA}
Для каждого студента, сдававшего экзамены, выведите последний по времени экзамен (курс и оценку). Попытка без даты (\`taken_at IS NULL\`) не должна считаться последней.
`,
    answer: `
Йонас — Этика 8.0; Шопенгауэр — Три критики 8.0; Карнап — Databases 6.5 (вторая попытка); Ada Lovelace — Databases 10.0 (а не Algorithms без даты); Alan Turing — Databases 7.5.
`,
    solution: `
Идиом со слайда: \`DISTINCT ON (student_id)\` + \`ORDER BY student_id, taken_at DESC NULLS LAST\`. Без \`NULLS LAST\` при сортировке по убыванию NULL оказался бы первым, и у Ada «последним» стал бы экзамен без даты.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT DISTINCT ON (e.student_id)
       s.name, c.title, e.grade::text AS grade
FROM exam AS e
JOIN student AS s USING (student_id)
JOIN course  AS c USING (course_id)
ORDER BY e.student_id, e.taken_at DESC NULLS LAST;`,
      expect: [
        { name: 'Йонас', title: 'Этика', grade: '8.0' },
        { name: 'Шопенгауэр', title: 'Три критики', grade: '8.0' },
        { name: 'Карнап', title: 'Databases', grade: '6.5' },
        { name: 'Ada Lovelace', title: 'Databases', grade: '10.0' },
        { name: 'Alan Turing', title: 'Databases', grade: '7.5' },
      ],
    },
    theory: ['sql-advanced#pg-idioms'],
    source: [Q('21')],
    basis: 'derived',
  },
  {
    id: 'adv-lateral',
    title: 'Самый «тяжёлый» курс каждого профессора (LATERAL)',
    level: 2,
    statement: `
${DATA}
Для каждого профессора (включая тех, у кого нет курсов) выведите курс с наибольшим числом кредитов; при равенстве — первый по названию.
`,
    answer: `
Сократ — Логика; Рассел — Теория познания; Коперник — NULL; Поппер — Венский кружок; Августин — Вера и знание; Кюри — NULL; Кант — Основы; Edsger Dijkstra — Databases.
`,
    solution: `
\`LEFT JOIN LATERAL (… LIMIT 1) ON true\` — пример со слайда; добавлен второй ключ сортировки \`c.title\`, чтобы результат при равных кредитах был детерминированным.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `SELECT p.name, x.title
FROM professor AS p
LEFT JOIN LATERAL (
  SELECT c.title
  FROM course AS c
  WHERE c.professor_id = p.professor_id
  ORDER BY c.credits DESC, c.title
  LIMIT 1
) AS x ON true
ORDER BY p.professor_id;`,
      expect: [
        { name: 'Сократ', title: 'Логика' },
        { name: 'Рассел', title: 'Теория познания' },
        { name: 'Коперник', title: null },
        { name: 'Поппер', title: 'Венский кружок' },
        { name: 'Августин', title: 'Вера и знание' },
        { name: 'Кюри', title: null },
        { name: 'Кант', title: 'Основы' },
        { name: 'Edsger Dijkstra', title: 'Databases' },
      ],
    },
    theory: ['sql-advanced#pg-idioms'],
    source: [Q('21')],
    basis: 'derived',
  },
  {
    id: 'adv-cte-avg',
    title: 'Средний балл по лучшим попыткам (CTE)',
    level: 2,
    statement: `
${DATA}
Для каждого студента возьмите лучшую оценку по каждому курсу (попыток может быть несколько), затем посчитайте средний балл по курсам. Округлите до 2 знаков, отсортируйте по убыванию, при равенстве — по имени.
`,
    answer: `
Ada Lovelace 10.00; Йонас 8.00; Шопенгауэр 8.00; Карнап 7.75 (9.0 по Основам и 6.5 — лучшая из двух попыток по Databases); Alan Turing 7.50.
`,
    solution: `
Два шага — две агрегации, их удобно назвать через CTE. Попытка без оценки (NULL) не влияет: \`max\` и \`avg\` пропускают NULL, а студент без единой оценки отфильтрован.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `WITH best AS (
  SELECT student_id, course_id, max(grade) AS grade
  FROM exam
  GROUP BY student_id, course_id
)
SELECT s.name, round(avg(b.grade), 2)::text AS avg_grade
FROM best AS b
JOIN student AS s USING (student_id)
WHERE b.grade IS NOT NULL
GROUP BY s.student_id, s.name
ORDER BY avg(b.grade) DESC, s.name;`,
      expect: [
        { name: 'Ada Lovelace', avg_grade: '10.00' },
        { name: 'Йонас', avg_grade: '8.00' },
        { name: 'Шопенгауэр', avg_grade: '8.00' },
        { name: 'Карнап', avg_grade: '7.75' },
        { name: 'Alan Turing', avg_grade: '7.50' },
      ],
    },
    theory: ['sql-advanced#cte', 'sql-select#group-by'],
    source: [Q('18'), Q('12')],
    basis: 'derived',
  },
  {
    id: 'adv-view-check',
    title: 'Обновляемое представление и CHECK OPTION',
    level: 2,
    statement: `
${DATA}
Создайте представление \`junior_students\` (студенты с semester ≤ 4) \`WITH LOCAL CHECK OPTION\`. Что произойдёт при
1. \`UPDATE junior_students SET semester = 3 WHERE name = 'Карнап';\`
2. \`UPDATE junior_students SET semester = 6 WHERE name = 'Карнап';\`?
`,
    answer: `
1. Выполнится: простое представление автоматически обновляемо, строка остаётся в нём.
2. **Ошибка** CHECK OPTION: после изменения строка выпала бы из представления (semester 6 > 4).
`,
    solution: `
{{sql}}
Без CHECK OPTION второй UPDATE прошёл бы, и Карнап «исчез» бы из представления, через которое его изменяли.
`,
    sql: {
      fixture: 'uni',
      code: `CREATE VIEW junior_students AS
SELECT student_id, name, semester
FROM student
WHERE semester <= 4
WITH LOCAL CHECK OPTION;

UPDATE junior_students SET semester = 3 WHERE name = 'Карнап';

CREATE TEMP TABLE outcome (result text);
DO $$
BEGIN
  UPDATE junior_students SET semester = 6 WHERE name = 'Карнап';
  INSERT INTO outcome VALUES ('updated');
EXCEPTION WHEN with_check_option_violation THEN
  INSERT INTO outcome VALUES ('CHECK OPTION violation');
END $$;

SELECT (SELECT result FROM outcome) AS second_update,
       (SELECT semester FROM student WHERE name = 'Карнап') AS semester;`,
      expect: [{ second_update: 'CHECK OPTION violation', semester: 3 }],
    },
    theory: ['sql-advanced#views'],
    source: [Q('22–23')],
    basis: 'derived',
  },
  {
    id: 'adv-matview',
    title: 'VIEW и MATERIALIZED VIEW: когда данные устаревают',
    level: 2,
    statement: `
${DATA}
Создайте \`MATERIALIZED VIEW professor_load\` (сумма кредитов по профессору) и обычное \`VIEW\` с тем же запросом. Добавьте Кюри курс на 5 кредитов. Что покажут оба представления до и после \`REFRESH MATERIALIZED VIEW\`?
`,
    answer: `
Обычное VIEW сразу покажет у Кюри 5 (оно хранит запрос). Материализованное до REFRESH не содержит строки для Кюри (хранит старый результат), после REFRESH — 5.
`,
    solution: `
VIEW хранит запрос, а не строки; MATERIALIZED VIEW физически хранит результат и обновляется явно. Уникальный индекс на материализованном представлении из лекции нужен, например, для \`REFRESH … CONCURRENTLY\` (пояснение составителя).
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `CREATE MATERIALIZED VIEW professor_load AS
SELECT professor_id, sum(credits) AS credits
FROM course
GROUP BY professor_id;
CREATE UNIQUE INDEX ON professor_load(professor_id);

CREATE VIEW professor_load_live AS
SELECT professor_id, sum(credits) AS credits
FROM course
GROUP BY professor_id;

INSERT INTO course (title, credits, professor_id) VALUES ('Радиоактивность', 5, 6);

CREATE TEMP TABLE snap AS
SELECT (SELECT credits::int FROM professor_load      WHERE professor_id = 6) AS mat_before,
       (SELECT credits::int FROM professor_load_live WHERE professor_id = 6) AS live;

REFRESH MATERIALIZED VIEW professor_load;

SELECT mat_before, live,
       (SELECT credits::int FROM professor_load WHERE professor_id = 6) AS mat_after
FROM snap;`,
      expect: [{ mat_before: null, live: 5, mat_after: 5 }],
    },
    theory: ['sql-advanced#views'],
    source: [Q('22–23')],
    basis: 'derived',
  },
  {
    id: 'adv-explain',
    title: 'EXPLAIN и EXPLAIN ANALYZE',
    level: 1,
    statement: `
Коллега хочет посмотреть план для \`DELETE FROM enrollment WHERE enrolled_at < '2020-01-01'\` и запускает \`EXPLAIN ANALYZE\` на рабочей базе. Чем это опасно? Чем EXPLAIN отличается от EXPLAIN ANALYZE?
`,
    answer: `
\`EXPLAIN\` только показывает план. \`EXPLAIN ANALYZE\` **реально выполняет** запрос — DELETE действительно удалит строки. Для изменяющих команд используйте просто EXPLAIN или выполняйте ANALYZE внутри транзакции с последующим ROLLBACK.
`,
    solution: `
Предупреждение со слайда «EXPLAIN»: «ANALYZE реально выполняет запрос: осторожно с изменяющими данными командами». Совет с ROLLBACK — пояснение составителя на основе темы [транзакции](topic:sql-dml#transactions).
`,
    theory: ['sql-advanced#explain', 'sql-dml#transactions'],
    source: [Q('24')],
    basis: 'material',
  },
];
