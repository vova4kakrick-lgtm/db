// Тема 7. SQL DDL: типы, таблицы, ограничения, ключи, изменение схемы.
const P = (pages) => ({ doc: 'l05', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default {
  title: 'SQL DDL: типы данных, CREATE TABLE, ограничения',
  short: 'SQL DDL',
  summary:
    'Типы PostgreSQL, CREATE TABLE для Uni-DB, identity/serial/uuid, ограничения NOT NULL, CHECK, UNIQUE, PRIMARY KEY, FOREIGN KEY и ссылочные действия, связь 1:1, триггеры, ALTER/DROP/TRUNCATE, отложенные ограничения, объекты схемы и встроенные функции.',
  sources: ['l05', 'ddl'],
  sections: [
    {
      id: 'ddl-overview',
      title: 'Семейство языка SQL',
      source: [P('2–3'), D('1')],
      body: `
- **DDL** — схемы, таблицы, ограничения, индексы (\`CREATE\`, \`ALTER\`, \`DROP\`). «Это не про данные, это про контейнеры для данных. Ошибки на этом уровне — самые дорогие.»
- **DML** — \`INSERT\`, \`UPDATE\`, \`DELETE\`, \`MERGE\` ([тема DML](topic:sql-dml#insert)).
- **Запросы** — \`SELECT\` ([тема SELECT](topic:sql-select#pipeline)).

PostgreSQL близок к стандарту SQL, но добавляет расширения: \`RETURNING\`, \`ON CONFLICT\`, типы \`jsonb\`, массивы, диапазоны, развитые индексы.

Учебный пример лекций — **Uni-DB**: \`student\`, \`professor\`, \`course\` (1:N к professor), \`enrollment\` (student M:N course), \`course_prerequisite\` (self M:N), \`exam\`. Суррогатные ключи генерируются; таблицы связей сохраняют естественные составные ключи.
`,
    },
    {
      id: 'types',
      title: 'Типы данных PostgreSQL',
      source: [P('5–9'), D('1–2')],
      body: `
**Выбирайте тип, который передаёт смысл.** Выбор типа — первый и самый важный контракт целостности данных.

| Тип | Для чего | Замечание |
| --- | --- | --- |
| \`smallint\` / \`integer\` / \`bigint\` | счётчики, целые, идентификаторы | 2 / 4 / 8 байт |
| \`numeric(p,s)\` | точные десятичные: **деньги**, оценки | точен, но медленнее double |
| \`real\` / \`double precision\` | измерения, приближённые вычисления | плавающая точка; **никогда не храните деньги во FLOAT/DOUBLE** |
| \`boolean\` | true / false | допускает NULL (трёхзначная логика); лучше, чем INTEGER 0/1 |
| \`text\` | строки без содержательного ограничения длины | основной вариант |
| \`varchar(n)\` | если максимальная длина — правило предметной области | n — ограничение, а не выделение памяти |
| \`char(n)\` | строки фиксированной длины (коды стран 'US') | дополняется пробелами |
| \`bytea\` | двоичные данные | в PostgreSQL нет Oracle-типов BLOB/RAW/CLOB |
| \`uuid\` | 128-битный идентификатор | PostgreSQL 18 генерирует UUIDv4 и UUIDv7 |
| \`date\` | календарная дата | день рождения, срок |
| \`time\` | время суток | редко без даты |
| \`timestamp\` | дата+время без часового пояса | «местное время», локальное расписание |
| \`timestamptz\` | **момент времени** | события, аудит; хранится в UTC |
| \`interval\` | длительность | «2 дня 3 часа» |

**Структурированные типы:** \`jsonb\` — валидированный двоичный JSON, можно запрашивать и индексировать; подходит для гибких атрибутов, но **не заменяет реляционную модель**. **Массивы** — для действительно атомарных списков, **не для скрытых связей M:N**. \`enum\` — стабильный небольшой набор меток (менять сложнее, чем строки справочника). \`domain\` — переиспользуемый тип с ограничениями. Специализированные: \`inet\` (IP-адреса), \`tsvector\` (полнотекстовый поиск).

\`timestamptz\` конвертирует время из часового пояса сессии при вставке и обратно при выборке — **почти всегда используйте его для глобальных данных**.
`,
    },
    {
      id: 'uni-ddl',
      title: 'CREATE TABLE для Uni-DB',
      source: [P('10'), P('13'), P('15')],
      body: `
\`\`\`sql
CREATE TYPE professor_level AS ENUM ('assistant', 'associate', 'full');

CREATE TABLE professor (
  professor_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text NOT NULL,
  level        professor_level NOT NULL,
  room         text UNIQUE
);

CREATE TABLE student (
  student_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  semester   smallint CHECK (semester BETWEEN 1 AND 14)
);

CREATE TABLE course (
  course_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text NOT NULL,
  credits      smallint NOT NULL CHECK (credits BETWEEN 1 AND 12),
  professor_id bigint REFERENCES professor(professor_id)
                 ON UPDATE CASCADE
                 ON DELETE SET NULL
);

CREATE TABLE enrollment (
  student_id  bigint REFERENCES student ON DELETE CASCADE,
  course_id   bigint REFERENCES course  ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id)
);

CREATE TABLE course_prerequisite (
  course_id       bigint REFERENCES course ON DELETE CASCADE,
  prerequisite_id bigint REFERENCES course ON DELETE RESTRICT,
  PRIMARY KEY (course_id, prerequisite_id),
  CHECK (course_id <> prerequisite_id)
);

CREATE TABLE exam (
  student_id  bigint REFERENCES student ON DELETE CASCADE,
  course_id   bigint REFERENCES course  ON DELETE CASCADE,
  attempt_no  smallint NOT NULL DEFAULT 1 CHECK (attempt_no > 0),
  examiner_id bigint REFERENCES professor ON DELETE SET NULL,
  grade       numeric(3,1) CHECK (grade BETWEEN 0 AND 10),
  taken_at    timestamptz,
  PRIMARY KEY (student_id, course_id, attempt_no)
);
CREATE INDEX exam_examiner_idx ON exam(examiner_id);
\`\`\`

Обратите внимание: связь 1:N professor–course реализована внешним ключом в course ([правило 3](topic:relational-model#rule3)); M:N student–course — таблицей \`enrollment\` с составным PK; рекурсивная M:N — \`course_prerequisite\` с \`CHECK\` против петли; \`exam\` — «слабая» сущность с ключом, включающим ключи студента и курса ([правило 5](topic:relational-model#rule5)).
`,
    },
    {
      id: 'identity',
      title: 'Генераторы ключей: IDENTITY, SERIAL, UUID',
      source: [P('11'), D('7–8')],
      body: `
- **\`GENERATED ALWAYS AS IDENTITY\`** — значением управляет СУБД; явное значение требует \`OVERRIDING SYSTEM VALUE\`.
- **\`GENERATED BY DEFAULT AS IDENTITY\`** — приложение может задать значение, иначе берётся из неявной последовательности.
- **Identity означает NOT NULL, но не гарантирует уникальность** — нужен \`PRIMARY KEY\` или \`UNIQUE\`.
- **\`SERIAL\` / \`BIGSERIAL\`** — не тип, а синтаксический сахар: целочисленный столбец + последовательность (sequence) + default. Не стандарт SQL; номера могут иметь «пропуски» при откате транзакций. Его надо узнавать, но в новых схемах лучше identity (стандарт SQL:2003).
- **\`UUID\`** (\`DEFAULT gen_random_uuid()\`) — 128-битный глобально уникальный идентификатор: подходит для распределённых систем и микросервисов, ID можно генерировать в приложении, не раскрывает порядок и количество записей. Минусы: 16 байт против 4/8 (больше индексы), чуть медленнее JOIN, неудобен человеку.

**Какой выбрать:** простое монолитное приложение — \`SERIAL\`/\`BIGSERIAL\` или \`IDENTITY\`; микросервисы, офлайн-режим, нельзя «перебирать» ID в URL — \`UUID\`.

Никогда не полагайтесь на ручной ввод или бизнес-логику для создания первичных ключей — используйте механизмы СУБД.
`,
    },
    {
      id: 'constraints',
      title: 'Ограничения целостности',
      source: [P('12'), D('4–5')],
      body: `
Ограничения — **исполняемая документация схемы** и «контракт» таблицы.

- **\`NOT NULL\`** — отсутствующее значение запрещено (обычно лучше эквивалентного CHECK).
- **\`CHECK\`** — логическое правило для текущей строки: \`credits BETWEEN 1 AND 12\`, \`CHECK (EndDate > StartDate)\`.
- **\`UNIQUE\`** — запрещает повторяющиеся ключи (альтернативный ключ). По умолчанию PostgreSQL допускает **несколько NULL**; есть вариант \`NULLS NOT DISTINCT\`.
- **\`PRIMARY KEY\`** = \`UNIQUE\` + \`NOT NULL\`, канонический идентификатор строки.
- **\`FOREIGN KEY\`** — ссылочная целостность ([ссылочные действия](topic:sql-ddl#fk-actions)).
- **\`DEFAULT\`** — значение, если оно не указано при вставке; может вызывать volatile-функции, например \`now()\`.

Пример из конспекта:

\`\`\`sql
CREATE TABLE Employees (
  EmployeeID   SERIAL PRIMARY KEY,
  FIO          VARCHAR(255) NOT NULL,
  Email        VARCHAR(255) NOT NULL UNIQUE,            -- альтернативный ключ
  DepartmentID INT,
  Salary       NUMERIC(10, 2) NOT NULL CHECK (Salary > 0),
  HireDate     DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT fk_department
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
\`\`\`

Ограничения уровня столбца пишутся рядом со столбцом; ограничения уровня таблицы (составной PK, FK, CHECK по нескольким столбцам) — отдельными строками, можно с именем \`CONSTRAINT имя\`.
`,
    },
    {
      id: 'fk-actions',
      title: 'Внешние ключи и ссылочные действия',
      source: [P('13–14'), D('5'), D('10')],
      body: `
Варианты \`ON DELETE\` / \`ON UPDATE\`: **\`NO ACTION\`** (по умолчанию), **\`RESTRICT\`**, **\`CASCADE\`**, **\`SET NULL\`**, **\`SET DEFAULT\`**.

**Внешний ключ описывает жизненный цикл данных:**
- **CASCADE** — для составной части, которая не должна жить без родителя: запись на курс после удаления студента (\`enrollment … ON DELETE CASCADE\`). Мощный, но опасный инструмент: одно \`DELETE\` из Users может каскадом удалить заказы, комментарии, лайки…
- **SET NULL** — для необязательной связи независимых сущностей: курс может временно остаться без преподавателя (\`course.professor_id … ON DELETE SET NULL\`).
- **RESTRICT / NO ACTION** — требуют явного решения перед удалением объекта, на который ссылаются (\`prerequisite_id … ON DELETE RESTRICT\`).
- **SET DEFAULT** — установить значение по умолчанию.
- \`ON UPDATE\` — поведение при изменении PK родителя (редкая операция).

**Индекс FK:** PostgreSQL индексирует целевые PK/UNIQUE, но **не создаёт индекс на ссылающемся FK автоматически** — поэтому в Uni-DB есть \`CREATE INDEX exam_examiner_idx ON exam(examiner_id)\`.
`,
    },
    {
      id: 'one-to-one',
      title: 'Связь 1:1: внешний ключ + UNIQUE',
      source: [P('16')],
      body: `
\`\`\`sql
CREATE TABLE office (
  office_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room      text NOT NULL UNIQUE
);

ALTER TABLE professor
  ADD COLUMN office_id bigint
  UNIQUE REFERENCES office(office_id)
  ON DELETE SET NULL;
\`\`\`

FK сам по себе задаёт N:1; **UNIQUE сужает её до 0..1 : 0..1**. Для симметричной связи лучше одна таблица связи, а не два зеркальных FK.
`,
    },
    {
      id: 'triggers',
      title: 'Триггеры — последний рубеж',
      source: [P('17')],
      body: `
Триггер — для **динамических инвариантов**, которые не выражаются декларативно (например, «full-профессора нельзя понизить»):

\`\`\`sql
CREATE FUNCTION prevent_full_demotion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.level = 'full' AND NEW.level <> 'full' THEN
    RAISE EXCEPTION 'full professor cannot be demoted';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER professor_level_guard
BEFORE UPDATE OF level ON professor
FOR EACH ROW
EXECUTE FUNCTION prevent_full_demotion();
\`\`\`

**Сначала пытаемся выразить правило через CHECK / UNIQUE / FK / EXCLUDE.** Триггеры хуже видны, сложнее тестируются и взаимодействуют друг с другом. Принцип: инвариантные правила данных — в БД; workflow и понятные пользователю ошибки — в приложении.
`,
    },
    {
      id: 'alter-drop',
      title: 'ALTER TABLE, DROP TABLE, TRUNCATE',
      source: [P('18'), D('6')],
      body: `
\`\`\`sql
ALTER TABLE student ADD COLUMN email text;
ALTER TABLE student ADD CONSTRAINT student_email_uk UNIQUE (email);
ALTER TABLE course ALTER COLUMN title SET NOT NULL;
DROP TABLE old_import_stage;          -- ошибка, если есть зависимые объекты
DROP TABLE old_import_stage CASCADE;  -- удалить и зависимые объекты
\`\`\`

**ALTER TABLE — «хирургия на живом организме»:**
- \`ADD COLUMN\`: в PostgreSQL добавление nullable-колонки без DEFAULT — мгновенная операция с метаданными; с DEFAULT может потребовать перезаписи таблицы.
- \`DROP COLUMN\`: потеря данных необратима; приложение может быть не готово.
- \`ALTER COLUMN … TYPE\`: почти всегда полная перезапись таблицы и эксклюзивная блокировка.
- \`ADD CONSTRAINT\` (FK, CHECK): может потребовать полного сканирования для проверки существующих данных.

Любой ALTER TABLE на большой таблице в production — сложная операция, требующая планирования.

| Команда | Что делает | Откат | Триггеры |
| --- | --- | --- | --- |
| \`DELETE FROM t;\` | удаляет все строки по одной (медленно) | да, в транзакции | да |
| \`TRUNCATE TABLE t;\` | быстро «обнуляет» таблицу | нет (в большинстве СУБД это DDL) | нет |
| \`DROP TABLE t;\` | удаляет строки **и структуру** таблицы | нет | нет |

> **Примечание составителя:** таблица — из конспекта лекции 7, где сказано «нет (в большинстве СУБД)». В самом PostgreSQL \`TRUNCATE\` транзакционен и откатывается внутри \`BEGIN … ROLLBACK\`; триггеры \`ON DELETE\` при нём действительно не срабатывают.
`,
    },
    {
      id: 'deferrable',
      title: 'Отложенные ограничения и идемпотентные скрипты',
      source: [D('5')],
      body: `
**Проблема:** иногда нужно временно нарушить ограничение внутри одной транзакции, например поменять местами значения в столбце с \`UNIQUE\`. Обычный код упадёт на первом \`UPDATE\`.

**Решение — отложенное ограничение:** проверка выполняется не после каждого оператора, а при \`COMMIT\`.

\`\`\`sql
CREATE TABLE Swappable (
  ID INT PRIMARY KEY DEFERRABLE INITIALLY DEFERRED
);
BEGIN;
UPDATE Swappable SET ID = 2 WHERE ID = 1;  -- OK
UPDATE Swappable SET ID = 1 WHERE ID = 2;  -- OK
COMMIT;                                    -- проверка и фиксация
\`\`\`

> **Примечание составителя:** пример дословно из конспекта. Если в таблице есть строки с ID 1 и 2, то после первого UPDATE обе имеют ID = 2, и второй UPDATE переведёт в 1 *обе* — COMMIT упадёт. Для настоящего обмена нужен один \`UPDATE … SET ID = CASE …\` или промежуточное значение; проверено в [задаче](tasks:sql-ddl#ddl-deferrable-swap).

**Проверка на существование:** в миграциях пишите идемпотентно — \`CREATE TABLE IF NOT EXISTS Users (…)\`, \`CREATE INDEX IF NOT EXISTS …\`, \`CREATE SCHEMA IF NOT EXISTS …\`.
`,
    },
    {
      id: 'schema-objects',
      title: 'Объекты схемы, функции и «схема как код»',
      source: [D('2–4'), D('7–8'), P('22')],
      body: `
**Объекты схемы, кроме таблиц:**
- \`SCHEMA\` — пространство имён (\`CREATE SCHEMA billing; CREATE TABLE billing.invoices(…)\`), группировка и права доступа;
- \`VIEW\` — виртуальная таблица на основе SELECT: упрощение запросов и безопасность (\`CREATE VIEW public_users AS SELECT id, name FROM users WHERE is_public = true\`) — подробнее в [представлениях](topic:sql-advanced#views);
- \`INDEX\` — структура для быстрого поиска (\`CREATE INDEX idx_users_email ON Users(Email)\`);
- \`SEQUENCE\` — генератор чисел (под капотом SERIAL).

**Генерируемые столбцы (GENERATED)** вычисляются из других столбцов; PostgreSQL 18 поддерживает хранимые и виртуальные.

**Встроенные функции** (лучше, чем обрабатывать сырые данные в приложении):
- строковые: \`LENGTH\`, \`LOWER\`, \`UPPER\`, \`TRIM\`, \`SUBSTRING\`, \`POSITION\`, \`CONCAT\` (в отличие от \`||\` не возвращает NULL, если аргумент NULL), \`COALESCE\` (первое не-NULL), \`NULLIF(value, '')\`;
- числовые: \`ABS\`, \`ROUND(price * 1.2, 2)\`, \`CEIL\`, \`FLOOR\`, \`RANDOM()\` (\`ORDER BY RANDOM() LIMIT 10\` неэффективно на больших таблицах);
- дата/время: \`NOW()\`, \`CURRENT_DATE\`, \`DATE_TRUNC('month', …)\`, \`EXTRACT(DOW FROM …)\`, \`AGE(…)\`, \`INTERVAL '1 day'\`; фильтр \`WHERE created_at >= NOW() - INTERVAL '30 days'\`;
- JSONB: \`->\`, \`->>\`, \`#>\`, \`@>\`, \`jsonb_build_object()\`, \`jsonb_agg()\`;
- приведение: \`CAST(x AS type)\` или \`x::type\`; **\`5 / 2 = 2\`, а \`5::NUMERIC / 2 = 2.5\`**.

**Схема как код:** не писать \`ALTER TABLE\` руками на production; все изменения — миграционные скрипты (\`001_create_users_table.sql\`…) в Git, применение — инструментами (Flyway, Liquibase, Alembic).
`,
    },
  ],
  terms: [
    { term: 'PRIMARY KEY', def: '`UNIQUE` + `NOT NULL`; канонический идентификатор строки.', source: P('12') },
    { term: 'UNIQUE', def: 'Запрет повторов (альтернативный ключ); по умолчанию допускает несколько NULL (`NULLS NOT DISTINCT` меняет это).', source: P('12') },
    { term: 'CHECK', def: 'Логическое правило для текущей строки.', source: P('12') },
    { term: 'FOREIGN KEY', def: 'Ссылочная целостность; ссылочные действия NO ACTION (по умолчанию), RESTRICT, CASCADE, SET NULL, SET DEFAULT.', source: P('13') },
    { term: 'IDENTITY', def: 'Стандартный автоинкремент; ALWAYS запрещает ручные значения без OVERRIDING SYSTEM VALUE, BY DEFAULT — разрешает. Не гарантирует уникальность сам по себе.', source: P('11') },
    { term: 'SERIAL', def: 'Синтаксический сахар PostgreSQL: целый столбец + sequence + default; не стандарт SQL.', source: [P('11'), D('7')] },
    { term: 'DEFERRABLE', def: 'Отложенное ограничение: проверяется при COMMIT, а не после каждого оператора.', source: D('5') },
    { term: 'timestamptz', def: 'Момент времени; хранится в UTC и конвертируется из/в часовой пояс сессии.', source: [P('8'), D('2')] },
  ],
};
