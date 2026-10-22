// Тема 8. SQL DML: INSERT, UPDATE, DELETE, UPSERT, MERGE, транзакции.
const P = (pages) => ({ doc: 'l05', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default {
  title: 'SQL DML: INSERT, UPDATE, DELETE, UPSERT и MERGE',
  short: 'SQL DML',
  summary:
    'Вставка значений и результатов запроса, RETURNING и DEFAULT, UPDATE … FROM и DELETE … USING, каскадное и «мягкое» удаление, UPSERT через ON CONFLICT, MERGE, транзакции BEGIN/COMMIT/ROLLBACK.',
  sources: ['l05', 'ddl'],
  sections: [
    {
      id: 'insert',
      title: 'INSERT: значения, запрос, DEFAULT, RETURNING',
      source: [P('19'), D('9–10')],
      body: `
\`\`\`sql
-- несколько строк за раз (эффективнее) + вернуть сгенерированные ключи
INSERT INTO student (name, semester)
VALUES ('Ada Lovelace', 1),
       ('Alan Turing', 2)
RETURNING student_id, name;

-- вставка результата запроса
INSERT INTO enrollment (student_id, course_id)
SELECT s.student_id, c.course_id
FROM student AS s
CROSS JOIN course AS c
WHERE s.name = 'Ada Lovelace'
  AND c.title = 'Databases';

-- DEFAULT запрашивает значение по умолчанию / identity
INSERT INTO student (student_id, name, semester)
VALUES (DEFAULT, 'Grace Hopper', DEFAULT);
\`\`\`

**RETURNING.** Проблема: после вставки строки с SERIAL/UUID-ключом нужно узнать ключ. Наивное решение \`INSERT …; SELECT CURRVAL('my_seq');\` — два обращения к базе и не всегда безопасно в конкурентной среде. Правильно — \`RETURNING\` в том же запросе.

**INSERT … SELECT** — копирование и трансформация данных: архивация (\`INSERT INTO OrdersArchive … SELECT … FROM Orders WHERE OrderDate < '2020-01-01'\`), построение агрегированной отчётной таблицы (\`INSERT INTO MonthlySales … SELECT DepartmentID, DATE_TRUNC('month', OrderDate), SUM(Amount) … GROUP BY …\`).
`,
    },
    {
      id: 'update',
      title: 'UPDATE и UPDATE … FROM',
      source: [P('21'), D('9')],
      body: `
**UPDATE всегда должен использоваться с WHERE.** Забытый WHERE в UPDATE или DELETE — одна из самых катастрофических ошибок. Защита: сначала написать \`SELECT\` с нужными условиями, посмотреть результат, затем заменить \`SELECT …\` на \`UPDATE … SET …\`.

\`\`\`sql
UPDATE Employees SET Salary = Salary * 1.1 WHERE EmployeeID = 101;  -- одна запись
UPDATE Employees SET DepartmentID = 30 WHERE DepartmentID = 20;      -- несколько
\`\`\`

**UPDATE … FROM** (синтаксис PostgreSQL) — обновление по данным другой таблицы:

\`\`\`sql
UPDATE course AS c
SET professor_id = p.professor_id
FROM professor AS p
WHERE c.title = 'Databases'
  AND p.name = 'Edsger Dijkstra'
RETURNING c.course_id, c.title, p.name;
\`\`\`

Обновление по **агрегатам** другой таблицы — через подзапрос в FROM:

\`\`\`sql
UPDATE Customers c
SET TotalOrders = o.OrderCount
FROM (SELECT CustomerID, COUNT(*) AS OrderCount
      FROM Orders GROUP BY CustomerID) AS o
WHERE c.CustomerID = o.CustomerID;
\`\`\`
`,
    },
    {
      id: 'delete',
      title: 'DELETE, DELETE … USING, каскад и «мягкое» удаление',
      source: [P('21'), D('9–10')],
      body: `
\`\`\`sql
DELETE FROM Employees WHERE EmployeeID = 101;

-- DELETE … USING (PostgreSQL): условие по другой таблице
DELETE FROM enrollment AS e
USING student AS s
WHERE e.student_id = s.student_id
  AND s.semester > 14
RETURNING e.student_id, e.course_id;
\`\`\`

**Каскадное удаление (\`ON DELETE CASCADE\`)** — мощный, но опасный инструмент: одно \`DELETE\` из Users может удалить все заказы, комментарии, лайки пользователя ([ссылочные действия](topic:sql-ddl#fk-actions)).

**«Мягкое» удаление (soft delete):** строки не удаляют физически, а помечают:
1. добавить nullable-столбец \`DeletedAt TIMESTAMPTZ DEFAULT NULL\`;
2. вместо \`DELETE\` — \`UPDATE Users SET DeletedAt = NOW() WHERE UserID = 123\`;
3. все SELECT приложения дополнить условием \`WHERE DeletedAt IS NULL\`.

Плюсы: история, лёгкое восстановление, сохранение ссылочной целостности. Минусы: усложнение запросов, «раздувание» таблиц, нужна периодическая архивация.
`,
    },
    {
      id: 'upsert',
      title: 'UPSERT: INSERT … ON CONFLICT',
      source: [P('20'), D('10–11')],
      body: `
Задача «вставить, если нет, иначе обновить». **Наивное решение небезопасно:** \`SELECT\` → если нашли, \`UPDATE\`, иначе \`INSERT\`. Между SELECT и UPDATE/INSERT может «вклиниться» параллельная транзакция — **состояние гонки (race condition)**.

\`INSERT … ON CONFLICT\` — компактный PostgreSQL-идиом UPSERT; операция **атомарна** и защищена от гонок. Конфликт определяется по ограничению уникальности (PK/UNIQUE). \`EXCLUDED\` — ссылка на строку, которую *пытались* вставить.

\`\`\`sql
CREATE TABLE DailyPageViews (
  PageID    VARCHAR(255),
  ViewDate  DATE,
  ViewCount INT NOT NULL,
  PRIMARY KEY (PageID, ViewDate)   -- по этому ключу проверяется конфликт
);

INSERT INTO DailyPageViews (PageID, ViewDate, ViewCount)
VALUES ('/home', '2023-10-27', 100)
ON CONFLICT (PageID, ViewDate) DO UPDATE
  SET ViewCount = DailyPageViews.ViewCount + EXCLUDED.ViewCount;
\`\`\`

Пример из лекции PostgreSQL:

\`\`\`sql
INSERT INTO student (name, semester, email)
VALUES ('Ada Lovelace', 2, 'ada@example.edu')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    semester = EXCLUDED.semester
RETURNING student_id, name, semester, email;
\`\`\`

Вариант \`ON CONFLICT … DO NOTHING\` просто пропускает конфликтующую строку.
`,
    },
    {
      id: 'merge',
      title: 'MERGE',
      source: [P('20'), D('10–11')],
      body: `
\`MERGE\` — стандарт SQL для «создай или обнови» (синтаксис сложнее, чем ON CONFLICT):

\`\`\`sql
MERGE INTO student AS s
USING import_student AS i
ON s.email = i.email
WHEN MATCHED THEN
  UPDATE SET name = i.name, semester = i.semester
WHEN NOT MATCHED THEN
  INSERT (name, semester, email)
  VALUES (i.name, i.semester, i.email);
\`\`\`

Источник (\`USING\`) — таблица или запрос; для каждой его строки выполняется ветка \`WHEN MATCHED\` или \`WHEN NOT MATCHED\`. Типичное применение — ETL и загрузка импортированных данных.
`,
    },
    {
      id: 'transactions',
      title: 'DEFAULT, генерируемые столбцы и транзакции',
      source: [P('22'), D('1')],
      body: `
- **DEFAULT** вычисляется при INSERT, если значение не задано; может вызывать volatile-функции (\`now()\`).
- **GENERATED** — вычисляется из других столбцов (PostgreSQL 18: хранимые и виртуальные).
- **Транзакция** \`BEGIN\` / \`COMMIT\` / \`ROLLBACK\` — для набора изменений, который должен выполниться **целиком или не выполниться вообще**. В групповом проекте запросы, реализующие функциональные требования, группируют в транзакции.
- **БД + приложение:** инвариантные правила данных держим в БД; workflow и понятные пользователю ошибки — в приложении.

> Подробности устройства транзакций (изоляция, параллельное выполнение, восстановление) относятся ко второй части курса «БД — взгляд изнутри»; в просмотренных материалах их нет (В материалах курса не найдено).
`,
    },
  ],
  terms: [
    { term: 'RETURNING', def: 'Возвращает данные изменённых строк (например, сгенерированный ключ) в том же запросе INSERT/UPDATE/DELETE.', source: [P('19'), D('9')] },
    { term: 'UPSERT', def: '«Вставить или обновить»; в PostgreSQL — INSERT … ON CONFLICT, атомарно и без гонок.', source: [P('20'), D('10')] },
    { term: 'EXCLUDED', def: 'Псевдотаблица в ON CONFLICT DO UPDATE: строка, которую пытались вставить.', source: D('11') },
    { term: 'MERGE', def: 'Стандартная команда SQL: для строк источника выполняет UPDATE (WHEN MATCHED) или INSERT (WHEN NOT MATCHED).', source: P('20') },
    { term: 'Soft delete', def: 'Пометка строки как удалённой (DeletedAt) вместо физического удаления.', source: D('10') },
    { term: 'Race condition', def: 'Состояние гонки: между проверкой и изменением вклинивается параллельная транзакция.', source: D('11') },
    { term: 'Транзакция', def: 'Набор изменений BEGIN … COMMIT/ROLLBACK, выполняемый целиком или не выполняемый вообще.', source: P('22') },
  ],
};
