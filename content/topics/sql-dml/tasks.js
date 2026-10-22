const P = (pages) => ({ doc: 'l05', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default [
  {
    id: 'dml-insert-returning',
    title: 'Вставить студентов и получить их ключи',
    level: 1,
    statement: `
Одним запросом добавьте в Uni-DB студентов 'Grace Hopper' (1 семестр) и 'Barbara Liskov' (2 семестр) и сразу получите их \`student_id\`. Почему не стоит после вставки делать \`SELECT CURRVAL(…)\`?
`,
    answer: `
\`INSERT INTO student (name, semester) VALUES (…), (…) RETURNING student_id, name;\` — на тестовых данных вернёт id **11** и **12**. CURRVAL — второе обращение к базе и не всегда безопасно в конкурентной среде; RETURNING получает ключи в том же запросе.
`,
    solution: `
{{sql}}
Многострочный VALUES эффективнее отдельных INSERT. Ключи генерирует identity-столбец (в тестовых данных уже есть студенты 1–10).
`,
    sql: {
      fixture: 'uni',
      code: `INSERT INTO student (name, semester)
VALUES ('Grace Hopper', 1),
       ('Barbara Liskov', 2)
RETURNING student_id, name;`,
      expect: [
        { student_id: 11, name: 'Grace Hopper' },
        { student_id: 12, name: 'Barbara Liskov' },
      ],
    },
    theory: ['sql-dml#insert', 'sql-ddl#identity'],
    source: [P('19'), D('9')],
    basis: 'derived',
  },
  {
    id: 'dml-insert-select',
    title: 'INSERT … SELECT: массовая запись на курс',
    level: 2,
    statement: `
Запишите на курс 'Algorithms' всех студентов 1–2 семестра, которые ещё на него не записаны. Верните, сколько строк добавлено.
`,
    answer: `
\`INSERT INTO enrollment (student_id, course_id) SELECT … FROM student CROSS JOIN course WHERE … AND NOT EXISTS (…) RETURNING …\`. На тестовых данных добавятся **2** записи: Теофраст и Фейербах (Ada Lovelace и Alan Turing уже записаны).
`,
    solution: `
Образец — \`INSERT … SELECT\` с \`CROSS JOIN\` из лекции; условие \`NOT EXISTS\` исключает дубли (иначе PK \`(student_id, course_id)\` вызовет ошибку). Альтернатива — \`ON CONFLICT DO NOTHING\`.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `WITH ins AS (
  INSERT INTO enrollment (student_id, course_id)
  SELECT s.student_id, c.course_id
  FROM student AS s
  CROSS JOIN course AS c
  WHERE s.semester BETWEEN 1 AND 2
    AND c.title = 'Algorithms'
    AND NOT EXISTS (
      SELECT 1 FROM enrollment AS e
      WHERE e.student_id = s.student_id AND e.course_id = c.course_id
    )
  RETURNING student_id
)
SELECT s.name
FROM ins JOIN student AS s USING (student_id)
ORDER BY s.name;`,
      expect: [{ name: 'Теофраст' }, { name: 'Фейербах' }],
    },
    theory: ['sql-dml#insert', 'sql-select#exists'],
    source: [P('19'), D('10')],
    basis: 'derived',
  },
  {
    id: 'dml-update-from',
    title: 'UPDATE … FROM: назначить преподавателя',
    level: 1,
    statement: `
У курса 'Algorithms' нет преподавателя. Назначьте ему 'Edsger Dijkstra', найдя \`professor_id\` по имени, и верните название курса и имя профессора.
`,
    answer: `
\`UPDATE course AS c SET professor_id = p.professor_id FROM professor AS p WHERE c.title = 'Algorithms' AND p.name = 'Edsger Dijkstra' RETURNING c.title, p.name;\`
`,
    solution: `
\`UPDATE … FROM\` — синтаксис PostgreSQL, аналог соединения: строки обновляемой таблицы сопоставляются со строками из FROM по условию WHERE. Без условия на \`c.title\` обновились бы все курсы — поэтому сначала полезно выполнить тот же запрос как SELECT.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `UPDATE course AS c
SET professor_id = p.professor_id
FROM professor AS p
WHERE c.title = 'Algorithms'
  AND p.name = 'Edsger Dijkstra'
RETURNING c.title, p.name;`,
      expect: [{ title: 'Algorithms', name: 'Edsger Dijkstra' }],
    },
    theory: ['sql-dml#update'],
    source: [P('21')],
    basis: 'material',
  },
  {
    id: 'dml-update-aggregate',
    title: 'Обновить счётчик по агрегату другой таблицы',
    level: 2,
    statement: `
Добавьте в \`professor\` столбец \`course_count integer NOT NULL DEFAULT 0\` и заполните его числом курсов каждого профессора одним UPDATE. Выведите профессоров с ненулевым счётчиком.
`,
    answer: `
\`UPDATE professor AS p SET course_count = c.cnt FROM (SELECT professor_id, count(*) AS cnt FROM course GROUP BY professor_id) AS c WHERE p.professor_id = c.professor_id;\` На тестовых данных: Рассел 3, Сократ 3, Кант 2, Edsger Dijkstra 1, Августин 1, Поппер 1 (остальные — 0).
`,
    solution: `
Приём «UPDATE … FROM (агрегирующий подзапрос)» — из конспекта (пример с TotalOrders). Профессора без курсов в подзапросе отсутствуют и сохраняют DEFAULT 0. Курс 'Algorithms' без преподавателя даёт группу \`professor_id IS NULL\`, но она ни с кем не сопоставится.
{{sql}}
Такой счётчик — это денормализация: его нужно поддерживать при изменениях курсов (см. [денормализацию](topic:normalization#denormalization)).
`,
    sql: {
      fixture: 'uni',
      code: `ALTER TABLE professor ADD COLUMN course_count integer NOT NULL DEFAULT 0;

UPDATE professor AS p
SET course_count = c.cnt
FROM (
  SELECT professor_id, count(*) AS cnt
  FROM course
  GROUP BY professor_id
) AS c
WHERE p.professor_id = c.professor_id;

SELECT name, course_count
FROM professor
WHERE course_count > 0
ORDER BY course_count DESC, name;`,
      expect: [
        { name: 'Рассел', course_count: 3 },
        { name: 'Сократ', course_count: 3 },
        { name: 'Кант', course_count: 2 },
        { name: 'Edsger Dijkstra', course_count: 1 },
        { name: 'Августин', course_count: 1 },
        { name: 'Поппер', course_count: 1 },
      ],
    },
    theory: ['sql-dml#update', 'sql-select#group-by'],
    source: [D('9')],
    basis: 'derived',
  },
  {
    id: 'dml-delete-using',
    title: 'DELETE … USING: удалить записи старшекурсников',
    level: 1,
    statement: `
Удалите записи на курсы (\`enrollment\`) всех студентов, у которых семестр не меньше 12, и верните удалённые пары (student_id, course_id).
`,
    answer: `
\`DELETE FROM enrollment AS e USING student AS s WHERE e.student_id = s.student_id AND s.semester >= 12 RETURNING e.student_id, e.course_id;\` — на тестовых данных удалится одна запись: (2, 9) — Йонас на «Вера и знание».
`,
    solution: `
\`DELETE … USING\` — синтаксис PostgreSQL для удаления по условию на другой таблице (в лекции — \`semester > 14\`). Ксенократ (14 семестр) ни на что не записан, поэтому удаляется только запись Йонаса.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `DELETE FROM enrollment AS e
USING student AS s
WHERE e.student_id = s.student_id
  AND s.semester >= 12
RETURNING e.student_id, e.course_id;`,
      expect: [{ student_id: 2, course_id: 9 }],
    },
    theory: ['sql-dml#delete'],
    source: [P('21')],
    basis: 'derived',
  },
  {
    id: 'dml-upsert-counter',
    title: 'Счётчик просмотров через ON CONFLICT',
    level: 2,
    statement: `
Таблица \`DailyPageViews(PageID, ViewDate, ViewCount)\` с PK \`(PageID, ViewDate)\`. Напишите UPSERT, который добавляет просмотры за день: если строки нет — создаёт её, иначе прибавляет. Что будет в таблице после вставок 100 и затем 50 просмотров '/home' за '2023-10-27'? Почему нельзя сделать «SELECT, потом UPDATE или INSERT»?
`,
    answer: `
\`INSERT … ON CONFLICT (PageID, ViewDate) DO UPDATE SET ViewCount = DailyPageViews.ViewCount + EXCLUDED.ViewCount\`. После двух вставок — одна строка с **ViewCount = 150**. Вариант с SELECT подвержен состоянию гонки: между проверкой и записью может вклиниться другая транзакция; ON CONFLICT атомарен.
`,
    solution: `
\`EXCLUDED\` — данные, которые пытались вставить; \`DailyPageViews.ViewCount\` — уже сохранённое значение. Конфликт определяется ключом, указанным в \`ON CONFLICT (…)\` (нужен PK или UNIQUE на этих столбцах).
{{sql}}
`,
    sql: {
      fixture: [],
      code: `CREATE TABLE DailyPageViews (
  PageID    VARCHAR(255),
  ViewDate  DATE,
  ViewCount INT NOT NULL,
  PRIMARY KEY (PageID, ViewDate)
);

INSERT INTO DailyPageViews (PageID, ViewDate, ViewCount)
VALUES ('/home', '2023-10-27', 100)
ON CONFLICT (PageID, ViewDate) DO UPDATE
  SET ViewCount = DailyPageViews.ViewCount + EXCLUDED.ViewCount;

INSERT INTO DailyPageViews (PageID, ViewDate, ViewCount)
VALUES ('/home', '2023-10-27', 50)
ON CONFLICT (PageID, ViewDate) DO UPDATE
  SET ViewCount = DailyPageViews.ViewCount + EXCLUDED.ViewCount;

SELECT pageid, viewdate::text, viewcount FROM DailyPageViews;`,
      expect: [{ pageid: '/home', viewdate: '2023-10-27', viewcount: 150 }],
    },
    theory: ['sql-dml#upsert'],
    source: [D('10–11')],
    basis: 'material',
  },
  {
    id: 'dml-merge',
    title: 'Загрузить импорт студентов через MERGE',
    level: 2,
    statement: `
В \`student\` добавлен уникальный \`email\`; у Ada Lovelace email 'ada@example.edu'. Из внешней системы пришла таблица \`import_student(name, semester, email)\` со строками ('Ada King', 2, 'ada@example.edu') и ('Grace Hopper', 1, 'grace@example.edu'). Обновите существующих и добавьте новых одной командой MERGE. Как сделать то же через ON CONFLICT?
`,
    answer: `
\`MERGE INTO student AS s USING import_student AS i ON s.email = i.email WHEN MATCHED THEN UPDATE SET name = i.name, semester = i.semester WHEN NOT MATCHED THEN INSERT (name, semester, email) VALUES (i.name, i.semester, i.email);\` — Ada переименуется в 'Ada King' (семестр 2), Grace Hopper добавится. Через UPSERT: \`INSERT INTO student (name, semester, email) SELECT … FROM import_student ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, semester = EXCLUDED.semester;\`
`,
    solution: `
{{sql}}
MERGE — стандарт SQL с более сложным синтаксисом; ON CONFLICT — компактный PostgreSQL-идиом, требующий уникального ограничения на столбце сравнения.
`,
    sql: {
      fixture: 'uni',
      code: `ALTER TABLE student ADD COLUMN email text UNIQUE;
UPDATE student SET email = 'ada@example.edu' WHERE name = 'Ada Lovelace';

CREATE TABLE import_student (name text, semester smallint, email text);
INSERT INTO import_student VALUES
  ('Ada King', 2, 'ada@example.edu'),
  ('Grace Hopper', 1, 'grace@example.edu');

MERGE INTO student AS s
USING import_student AS i
ON s.email = i.email
WHEN MATCHED THEN
  UPDATE SET name = i.name, semester = i.semester
WHEN NOT MATCHED THEN
  INSERT (name, semester, email)
  VALUES (i.name, i.semester, i.email);

SELECT name, semester, email
FROM student
WHERE email IS NOT NULL
ORDER BY email;`,
      expect: [
        { name: 'Ada King', semester: 2, email: 'ada@example.edu' },
        { name: 'Grace Hopper', semester: 1, email: 'grace@example.edu' },
      ],
    },
    theory: ['sql-dml#merge', 'sql-dml#upsert'],
    source: [P('20')],
    basis: 'derived',
  },
  {
    id: 'dml-soft-delete',
    title: 'Мягкое удаление пользователя',
    level: 2,
    statement: `
Реализуйте «мягкое» удаление студентов Uni-DB: какой столбец добавить, чем заменить \`DELETE\`, как изменятся запросы? Назовите плюсы и минусы подхода. Удалите так студента 'Фейербах' и выведите число «живых» студентов.
`,
    answer: `
Столбец \`deleted_at timestamptz DEFAULT NULL\`; вместо DELETE — \`UPDATE student SET deleted_at = now() WHERE …\`; во все запросы — \`WHERE deleted_at IS NULL\`. Плюсы: история, лёгкое восстановление, сохраняется ссылочная целостность (записи на курсы не удаляются каскадом). Минусы: сложнее запросы, таблицы «раздуваются», нужна архивация. На тестовых данных живых студентов станет **9**.
`,
    solution: `
Схема из конспекта (раздел «Мягкое удаление»). Удобно спрятать фильтр в представление, чтобы его не забывали.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `ALTER TABLE student ADD COLUMN deleted_at timestamptz DEFAULT NULL;

UPDATE student SET deleted_at = now() WHERE name = 'Фейербах';

CREATE VIEW active_student AS
SELECT student_id, name, semester FROM student WHERE deleted_at IS NULL;

SELECT (SELECT count(*)::int FROM active_student) AS alive,
       (SELECT count(*)::int FROM enrollment WHERE student_id = 8) AS enrollments_kept;`,
      expect: [{ alive: 9, enrollments_kept: 1 }],
    },
    theory: ['sql-dml#delete', 'sql-advanced#views'],
    source: [D('10')],
    basis: 'derived',
  },
  {
    id: 'dml-transaction',
    title: 'Перевод студента на другой курс в транзакции',
    level: 2,
    statement: `
Карнап (student_id = 6) переходит с курса 'Биоэтика' (7) на 'Логика' (5): удалить одну запись и вставить другую. Почему это нужно делать в транзакции? Покажите, что после \`ROLLBACK\` данные не меняются.
`,
    answer: `
Две операции должны выполниться **целиком или не выполниться вообще**: иначе при сбое между ними студент останется без записи. \`BEGIN; DELETE …; INSERT …; COMMIT;\` (или \`ROLLBACK\` для отмены).
`,
    solution: `
Транзакции BEGIN / COMMIT / ROLLBACK — со слайда «DEFAULT, генерируемые столбцы и транзакции». Проверка: внутри транзакции изменения видны, после ROLLBACK — исчезают.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `BEGIN;
DELETE FROM enrollment WHERE student_id = 6 AND course_id = 7;
INSERT INTO enrollment (student_id, course_id) VALUES (6, 5);
ROLLBACK;

SELECT string_agg(course_id::text, ',' ORDER BY course_id) AS courses_of_carnap
FROM enrollment WHERE student_id = 6;`,
      expect: [{ courses_of_carnap: '2,6,7,8,11' }],
    },
    theory: ['sql-dml#transactions'],
    source: [P('22')],
    basis: 'derived',
  },
  {
    id: 'dml-safe-update',
    title: 'Как не «уволить всех» одним UPDATE',
    level: 1,
    statement: `
Нужно повысить зарплату на 10% сотрудникам отдела 20. Какую ошибку называют одной из самых катастрофических и какой порядок действий предлагает лекция, чтобы её избежать?
`,
    answer: `
Забытый \`WHERE\` в UPDATE/DELETE (изменятся все строки). Порядок: сначала написать \`SELECT … FROM Employees WHERE DepartmentID = 20\`, проверить результат, затем заменить \`SELECT …\` на \`UPDATE Employees SET Salary = Salary * 1.1\`, сохранив WHERE.
`,
    solution: `
Совет — из конспекта (раздел 2.2 UPDATE). Дополнительно можно выполнять изменения внутри транзакции и проверить число затронутых строк (\`RETURNING\`) перед COMMIT.
`,
    theory: ['sql-dml#update', 'sql-dml#transactions'],
    source: [D('9')],
    basis: 'material',
  },
];
