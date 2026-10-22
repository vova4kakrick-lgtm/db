const P = (pages) => ({ doc: 'l05', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default [
  {
    id: 'ddl-orders-3nf',
    title: 'CREATE TABLE для схемы заказов в 3НФ',
    level: 2,
    statement: `
Напишите \`CREATE TABLE\` для схемы, полученной при нормализации заказов: Customers(CustomerID, CustomerName), Products(ProductID, ProductDesc, ProductPrice), Orders(OrderID, OrderDate, CustomerID), OrderItems(OrderID, ProductID, Quantity). Выберите типы, ключи, внешние ключи, ограничения и ссылочные действия; обоснуйте выбор.
`,
    answer: `
Четыре таблицы: \`customer\`, \`product\`, \`orders\` (FK на customer) и \`order_item\` с составным PK \`(order_id, product_id)\` и FK на orders (CASCADE) и product (RESTRICT). Полный DDL — в решении.
`,
    solution: `
{{sql}}
- Ключи — \`GENERATED ALWAYS AS IDENTITY PRIMARY KEY\` (рекомендация лекции для новых схем вместо SERIAL).
- Цена — \`numeric(12,2)\`: деньги никогда не хранят во float/double.
- Дата заказа — \`date\` (календарная дата); если важен момент — \`timestamptz\`.
- \`order_item\` — таблица связи M:N с естественным составным PK \`(order_id, product_id)\`; \`CHECK (quantity > 0)\`.
- Ссылочные действия описывают жизненный цикл: позиция заказа — составная часть заказа → \`ON DELETE CASCADE\`; товар, который есть в заказах, удалять нельзя без решения → \`RESTRICT\`; заказчик заказа обязателен → \`NOT NULL\` + \`RESTRICT\`.
- PostgreSQL не индексирует ссылающийся FK автоматически — добавлены индексы на \`customer_id\` и \`product_id\`.
`,
    sql: {
      fixture: [],
      code: `CREATE TABLE customer (
  customer_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL
);

CREATE TABLE product (
  product_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  description text NOT NULL,
  price       numeric(12,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE orders (
  order_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_date  date NOT NULL DEFAULT CURRENT_DATE,
  customer_id bigint NOT NULL REFERENCES customer ON DELETE RESTRICT
);

CREATE TABLE order_item (
  order_id   bigint REFERENCES orders  ON DELETE CASCADE,
  product_id bigint REFERENCES product ON DELETE RESTRICT,
  quantity   integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE INDEX orders_customer_idx ON orders(customer_id);
CREATE INDEX order_item_product_idx ON order_item(product_id);`,
    },
    theory: ['sql-ddl#constraints', 'sql-ddl#fk-actions', 'sql-ddl#types', 'normalization#3nf'],
    source: [P('5–15'), D('4–5'), { doc: 'norm', pages: '13' }],
    basis: 'derived',
  },
  {
    id: 'ddl-fk-choice',
    title: 'Выбрать ссылочное действие',
    level: 1,
    statement: `
Какое \`ON DELETE\` выбрать для внешних ключей Uni-DB и почему?
1. \`enrollment.student_id → student\`
2. \`course.professor_id → professor\`
3. \`course_prerequisite.prerequisite_id → course\`
4. \`exam.examiner_id → professor\`
`,
    answer: `1 — **CASCADE**; 2 — **SET NULL**; 3 — **RESTRICT**; 4 — **SET NULL**.`,
    solution: `
Правило лекции «FK описывает жизненный цикл данных»:
1. Запись на курс — составная часть, не живущая без студента → CASCADE.
2. Курс и преподаватель — независимые сущности, курс может временно остаться без преподавателя → SET NULL.
3. Нельзя молча удалить курс, который является пререквизитом другого, — нужно явное решение → RESTRICT (так в DDL лекции).
4. Экзамен остаётся в истории, даже если экзаменатор удалён → SET NULL (так в DDL лекции).

По умолчанию (если ничего не указать) действует NO ACTION.
`,
    theory: ['sql-ddl#fk-actions', 'sql-ddl#uni-ddl'],
    source: [P('13–15')],
    basis: 'material',
  },
  {
    id: 'ddl-constraint-violations',
    title: 'Какие INSERT нарушат ограничения Uni-DB?',
    level: 2,
    statement: `
Для схемы Uni-DB из лекции определите, какие команды выполнятся, а какие упадут, и какое ограничение сработает:
1. \`INSERT INTO student (name, semester) VALUES ('Новичок', 15);\`
2. \`INSERT INTO course (title, credits) VALUES ('Семинар', 0);\`
3. \`INSERT INTO course_prerequisite VALUES (5, 5);\`
4. \`INSERT INTO professor (name, level, room) VALUES ('Гёдель', 'full', '226');\` (кабинет 226 уже занят)
5. \`INSERT INTO professor (name, level, room) VALUES ('Тьюринг', 'full', NULL);\` (у Dijkstra room тоже NULL)
6. \`INSERT INTO enrollment (student_id, course_id) VALUES (1, 999);\`
7. \`INSERT INTO student (student_id, name) VALUES (100, 'Ручной id');\`
8. \`INSERT INTO exam (student_id, course_id, grade) VALUES (1, 1, 7.5);\`
`,
    answer: `
| № | Результат | Причина |
| --- | --- | --- |
| 1 | ошибка | \`CHECK (semester BETWEEN 1 AND 14)\` |
| 2 | ошибка | \`CHECK (credits BETWEEN 1 AND 12)\` |
| 3 | ошибка | \`CHECK (course_id <> prerequisite_id)\` |
| 4 | ошибка | \`room text UNIQUE\` |
| 5 | **успех** | UNIQUE допускает несколько NULL |
| 6 | ошибка | внешний ключ: курса 999 нет |
| 7 | ошибка | \`GENERATED ALWAYS\` — нужен \`OVERRIDING SYSTEM VALUE\` |
| 8 | **успех** | \`attempt_no\` берёт DEFAULT 1, \`examiner_id\` и \`taken_at\` допускают NULL |
`,
    solution: `
Проверка в PostgreSQL: каждая команда выполняется в своём блоке, ошибка перехватывается и записывается её тип.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `CREATE TEMP TABLE outcome (n int, result text);

DO $$
DECLARE
  stmts text[] := ARRAY[
    $q$INSERT INTO student (name, semester) VALUES ('Новичок', 15)$q$,
    $q$INSERT INTO course (title, credits) VALUES ('Семинар', 0)$q$,
    $q$INSERT INTO course_prerequisite VALUES (5, 5)$q$,
    $q$INSERT INTO professor (name, level, room) VALUES ('Гёдель', 'full', '226')$q$,
    $q$INSERT INTO professor (name, level, room) VALUES ('Тьюринг', 'full', NULL)$q$,
    $q$INSERT INTO enrollment (student_id, course_id) VALUES (1, 999)$q$,
    $q$INSERT INTO student (student_id, name) VALUES (100, 'Ручной id')$q$,
    $q$INSERT INTO exam (student_id, course_id, grade) VALUES (1, 1, 7.5)$q$
  ];
BEGIN
  FOR i IN 1 .. array_length(stmts, 1) LOOP
    BEGIN
      EXECUTE stmts[i];
      INSERT INTO outcome VALUES (i, 'ok');
    EXCEPTION
      WHEN check_violation       THEN INSERT INTO outcome VALUES (i, 'CHECK');
      WHEN unique_violation      THEN INSERT INTO outcome VALUES (i, 'UNIQUE');
      WHEN foreign_key_violation THEN INSERT INTO outcome VALUES (i, 'FOREIGN KEY');
      WHEN others                THEN INSERT INTO outcome VALUES (i, SQLERRM);
    END;
  END LOOP;
END $$;

SELECT n, result FROM outcome ORDER BY n;`,
      expect: [
        { n: 1, result: 'CHECK' },
        { n: 2, result: 'CHECK' },
        { n: 3, result: 'CHECK' },
        { n: 4, result: 'UNIQUE' },
        { n: 5, result: 'ok' },
        { n: 6, result: 'FOREIGN KEY' },
        { n: 7, result: 'cannot insert a non-DEFAULT value into column "student_id"' },
        { n: 8, result: 'ok' },
      ],
    },
    theory: ['sql-ddl#constraints', 'sql-ddl#identity', 'sql-ddl#uni-ddl'],
    source: [P('10–15'), P('11–12')],
    basis: 'derived',
  },
  {
    id: 'ddl-delete-effects',
    title: 'Что произойдёт при удалении строк?',
    level: 2,
    statement: `
В Uni-DB (тестовые данные сайта) выполняют по отдельности:
1. \`DELETE FROM student WHERE student_id = 6;\` (Карнап: 5 записей на курсы и 3 экзамена)
2. \`DELETE FROM professor WHERE professor_id = 8;\` (Dijkstra ведёт курс 11 и принимал 4 экзамена)
3. \`DELETE FROM course WHERE course_id = 1;\` (курс «Основы» — пререквизит курсов 2, 3, 4 и 11)

Опишите последствия по ссылочным действиям из DDL лекции.
`,
    answer: `
1. Удаляется студент **и каскадно** все его 5 записей в \`enrollment\` и 3 строки \`exam\` (\`ON DELETE CASCADE\`).
2. Профессор удаляется; у курса 11 \`professor_id\` становится **NULL**, у его 4 экзаменов \`examiner_id\` — **NULL** (\`SET NULL\`).
3. **Ошибка:** \`course_prerequisite.prerequisite_id … ON DELETE RESTRICT\` запрещает удалить курс, на который ссылаются как на пререквизит.
`,
    solution: `
Проверка: каждое удаление выполняется в отдельном блоке, затем подсчитываются оставшиеся строки.
{{sql}}
Каскадное удаление «мощное, но опасное»: одно \`DELETE\` запускает цепную реакцию. Альтернатива для сохранения истории — [мягкое удаление](topic:sql-dml#delete).
`,
    sql: {
      fixture: 'uni',
      code: `CREATE TEMP TABLE outcome (step int, result text);

-- Каждый шаг выполняется независимо: в конце блока изменения откатываются
-- искусственным исключением, а результат сохраняется в переменной.
DO $$
DECLARE res text;
BEGIN
  BEGIN
    DELETE FROM student WHERE student_id = 6;
    res := format('enrollment: %s, exam: %s',
      (SELECT count(*) FROM enrollment WHERE student_id = 6),
      (SELECT count(*) FROM exam WHERE student_id = 6));
    RAISE EXCEPTION 'rollback step';
  EXCEPTION WHEN raise_exception THEN INSERT INTO outcome VALUES (1, res);
  END;
  BEGIN
    DELETE FROM professor WHERE professor_id = 8;
    res := format('course 11 professor_id is null: %s, exams with null examiner: %s',
      (SELECT professor_id IS NULL FROM course WHERE course_id = 11)::text,
      (SELECT count(*) FROM exam WHERE examiner_id IS NULL AND course_id = 11));
    RAISE EXCEPTION 'rollback step';
  EXCEPTION WHEN raise_exception THEN INSERT INTO outcome VALUES (2, res);
  END;
  BEGIN
    DELETE FROM course WHERE course_id = 1;
    INSERT INTO outcome VALUES (3, 'deleted');
  EXCEPTION WHEN restrict_violation THEN INSERT INTO outcome VALUES (3, 'RESTRICT: ' || SQLERRM);
  END;
END $$;

SELECT step, result FROM outcome ORDER BY step;`,
      expect: [
        { step: 1, result: 'enrollment: 0, exam: 0' },
        { step: 2, result: 'course 11 professor_id is null: true, exams with null examiner: 4' },
        { step: 3, result: 'RESTRICT: update or delete on table "course" violates RESTRICT setting of foreign key constraint "course_prerequisite_prerequisite_id_fkey" on table "course_prerequisite"' },
      ],
    },
    theory: ['sql-ddl#fk-actions'],
    source: [P('13–15'), D('10')],
    basis: 'derived',
  },
  {
    id: 'ddl-one-to-one',
    title: 'Связь 1:1 профессор — кабинет',
    level: 2,
    statement: `
Нужно связать профессора с кабинетом \`office\` так, чтобы у профессора был не более чем один кабинет и кабинет принадлежал не более чем одному профессору. Напишите DDL. Почему одного \`REFERENCES\` недостаточно?
`,
    answer: `
\`\`\`sql
CREATE TABLE office (
  office_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room      text NOT NULL UNIQUE
);
ALTER TABLE professor
  ADD COLUMN office_id bigint UNIQUE REFERENCES office(office_id) ON DELETE SET NULL;
\`\`\`
Один FK задаёт N:1 (много профессоров могут ссылаться на один кабинет); \`UNIQUE\` сужает связь до 0..1 : 0..1.
`,
    solution: `
Проверка: второй профессор не может получить уже занятый кабинет, а несколько профессоров без кабинета (NULL) допустимы.
{{sql}}
Для симметричной связи лекция советует одну таблицу связи, а не два зеркальных FK.
`,
    sql: {
      fixture: 'uni',
      code: `CREATE TABLE office (
  office_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room      text NOT NULL UNIQUE
);
ALTER TABLE professor
  ADD COLUMN office_id bigint UNIQUE REFERENCES office(office_id) ON DELETE SET NULL;

INSERT INTO office (room) VALUES ('A-101');
UPDATE professor SET office_id = 1 WHERE professor_id = 1;

CREATE TEMP TABLE outcome (result text);
DO $$
BEGIN
  UPDATE professor SET office_id = 1 WHERE professor_id = 2;
  INSERT INTO outcome VALUES ('second professor got the same office');
EXCEPTION WHEN unique_violation THEN
  INSERT INTO outcome VALUES ('UNIQUE: office already taken');
END $$;

SELECT result,
       (SELECT count(*)::int FROM professor WHERE office_id IS NULL) AS without_office
FROM outcome;`,
      expect: [{ result: 'UNIQUE: office already taken', without_office: 7 }],
    },
    theory: ['sql-ddl#one-to-one'],
    source: [P('16')],
    basis: 'material',
  },
  {
    id: 'ddl-identity',
    title: 'GENERATED ALWAYS, BY DEFAULT и SERIAL',
    level: 1,
    statement: `
1. Чем \`GENERATED ALWAYS AS IDENTITY\` отличается от \`GENERATED BY DEFAULT AS IDENTITY\`?
2. Как вставить строку с явным \`student_id = 100\` в таблицу \`student\` Uni-DB?
3. Достаточно ли identity для уникальности?
4. Что такое \`SERIAL\`?
`,
    answer: `
1. ALWAYS — значением управляет СУБД, явное значение только с \`OVERRIDING SYSTEM VALUE\`; BY DEFAULT — приложение может задать значение, иначе берётся из последовательности.
2. \`INSERT INTO student (student_id, name, semester) OVERRIDING SYSTEM VALUE VALUES (100, 'Ручной id', 1);\`
3. Нет: identity означает NOT NULL, но уникальность даёт только \`PRIMARY KEY\` / \`UNIQUE\`.
4. Синтаксический сахар: целый столбец + sequence + default; не стандарт SQL, в новых схемах лучше identity.
`,
    solution: `
{{sql}}
Номера из последовательности могут иметь «пропуски» при откате транзакций — это нормально, ключ не обязан быть непрерывным.
`,
    sql: {
      fixture: 'uni',
      code: `INSERT INTO student (student_id, name, semester)
OVERRIDING SYSTEM VALUE
VALUES (100, 'Ручной id', 1)
RETURNING student_id, name;`,
      expect: [{ student_id: 100, name: 'Ручной id' }],
    },
    theory: ['sql-ddl#identity'],
    source: [P('11'), D('7–8')],
    basis: 'material',
  },
  {
    id: 'ddl-types',
    title: 'Подобрать типы столбцов',
    level: 1,
    statement: `
Подберите тип PostgreSQL и кратко обоснуйте:
1. Стоимость тарифного плана.
2. Дата рождения читателя.
3. Момент публикации статьи на глобальной платформе.
4. Код страны 'US'.
5. Длительность поездки.
6. Набор необязательных «гибких» атрибутов товара.
7. Идентификатор, создаваемый в разных микросервисах.
8. Скорость самоката из телеметрии.
`,
    answer: `
1. \`numeric(10,2)\` — точные деньги, не float. 2. \`date\`. 3. \`timestamptz\` — момент времени. 4. \`char(2)\` — фиксированная длина. 5. \`interval\`. 6. \`jsonb\` — гибкие атрибуты (не замена реляционной модели). 7. \`uuid\`. 8. \`real\` / \`double precision\` — приближённое измерение.
`,
    solution: `
Все правила — из таблиц типов лекций: numeric — деньги и оценки, real/double — измерения; date — календарная дата, timestamptz — события и аудит, interval — длительность; char(n) — строки фиксированной длины; jsonb — гибкие атрибуты; uuid — когда идентификаторы создаются в разных системах.
`,
    theory: ['sql-ddl#types', 'sql-ddl#identity'],
    source: [P('5–9'), D('1–2')],
    basis: 'material',
  },
  {
    id: 'ddl-alter',
    title: 'Безопасно изменить схему',
    level: 1,
    statement: `
В таблицу \`student\` нужно добавить \`email\` (уникальный, необязательный), а в \`course\` сделать \`title\` обязательным. Напишите команды. Какая операция быстрая, а какая может потребовать проверки всех строк?
`,
    answer: `
\`\`\`sql
ALTER TABLE student ADD COLUMN email text;
ALTER TABLE student ADD CONSTRAINT student_email_uk UNIQUE (email);
ALTER TABLE course ALTER COLUMN title SET NOT NULL;
\`\`\`
Добавление nullable-колонки без DEFAULT — мгновенная операция с метаданными. Добавление ограничения (UNIQUE, NOT NULL, CHECK, FK) требует проверить существующие данные.
`,
    solution: `
Команды — со слайда «ALTER TABLE», замечания о производительности — из конспекта (раздел 1.4). Любой ALTER на большой таблице в production — операция, требующая планирования; изменения схемы оформляют миграциями в Git.
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `ALTER TABLE student ADD COLUMN email text;
ALTER TABLE student ADD CONSTRAINT student_email_uk UNIQUE (email);
ALTER TABLE course ALTER COLUMN title SET NOT NULL;
SELECT count(*)::int AS students_without_email FROM student WHERE email IS NULL;`,
      expect: [{ students_without_email: 10 }],
    },
    theory: ['sql-ddl#alter-drop', 'sql-ddl#schema-objects'],
    source: [P('18'), D('6'), D('8')],
    basis: 'material',
  },
  {
    id: 'ddl-trigger',
    title: 'Триггер против понижения full-профессора',
    level: 3,
    statement: `
Реализуйте правило «профессора уровня full нельзя понизить» и проверьте его. Почему лекция называет триггер «последним рубежом»?
`,
    answer: `
Функция \`prevent_full_demotion()\` с проверкой \`OLD.level = 'full' AND NEW.level <> 'full'\` и \`RAISE EXCEPTION\`, плюс \`CREATE TRIGGER … BEFORE UPDATE OF level ON professor FOR EACH ROW\`. Триггер — последний рубеж, потому что правило сначала пытаются выразить через CHECK / UNIQUE / FK / EXCLUDE: триггеры хуже видны, сложнее тестируются и взаимодействуют друг с другом.
`,
    solution: `
CHECK видит только текущую строку и не знает старого значения, поэтому переход «было full → стало другое» декларативно не выразить. Проверка:
{{sql}}
`,
    sql: {
      fixture: 'uni',
      code: `CREATE FUNCTION prevent_full_demotion()
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

CREATE TEMP TABLE outcome (result text);
DO $$
BEGIN
  UPDATE professor SET level = 'associate' WHERE name = 'Сократ';
  INSERT INTO outcome VALUES ('demoted');
EXCEPTION WHEN raise_exception THEN
  INSERT INTO outcome VALUES (SQLERRM);
END $$;
UPDATE professor SET level = 'full' WHERE name = 'Поппер';   -- повышение разрешено

SELECT (SELECT result FROM outcome) AS socrates,
       (SELECT level::text FROM professor WHERE name = 'Поппер') AS popper;`,
      expect: [{ socrates: 'full professor cannot be demoted', popper: 'full' }],
    },
    theory: ['sql-ddl#triggers'],
    source: [P('17'), P('22')],
    basis: 'material',
  },
  {
    id: 'ddl-deferrable-swap',
    title: 'Обмен значениями под UNIQUE: DEFERRABLE',
    level: 3,
    statement: `
В таблице \`Swappable(ID INT PRIMARY KEY DEFERRABLE INITIALLY DEFERRED, val text)\` есть строки (1, 'a') и (2, 'b'). Нужно поменять ID местами: (2, 'a') и (1, 'b').
1. Зачем здесь \`DEFERRABLE INITIALLY DEFERRED\`?
2. Сработает ли пара команд из конспекта \`UPDATE … SET ID = 2 WHERE ID = 1; UPDATE … SET ID = 1 WHERE ID = 2;\`?
3. Напишите корректный обмен.
`,
    answer: `
1. Проверка уникальности откладывается до \`COMMIT\`, поэтому промежуточное состояние с двумя одинаковыми ID допустимо.
2. **Нет.** После первого UPDATE обе строки имеют ID = 2, второй UPDATE переводит **обе** в 1 — на COMMIT ограничение нарушено.
3. Одним оператором: \`UPDATE Swappable SET ID = CASE ID WHEN 1 THEN 2 WHEN 2 THEN 1 END WHERE ID IN (1, 2);\` внутри транзакции.
`,
    solution: `
Идея отложенных ограничений — из конспекта (раздел «Отложенные ограничения»); сам пример с двумя UPDATE в конспекте неточен. Проверка обоих вариантов (\`SET CONSTRAINTS ALL IMMEDIATE\` принудительно выполняет отложенную проверку, как это сделал бы COMMIT):
{{sql}}
`,
    sql: {
      fixture: [],
      code: `CREATE TABLE swappable (
  id  int PRIMARY KEY DEFERRABLE INITIALLY DEFERRED,
  val text
);
INSERT INTO swappable VALUES (1, 'a'), (2, 'b');

CREATE TEMP TABLE outcome (variant text, result text);
DO $$
BEGIN
  -- вариант из конспекта
  BEGIN
    UPDATE swappable SET id = 2 WHERE id = 1;
    UPDATE swappable SET id = 1 WHERE id = 2;
    SET CONSTRAINTS ALL IMMEDIATE;
    INSERT INTO outcome VALUES ('two updates', 'ok');
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO outcome VALUES ('two updates', 'unique_violation');
  END;
  SET CONSTRAINTS ALL DEFERRED;
  -- корректный обмен
  UPDATE swappable SET id = CASE id WHEN 1 THEN 2 WHEN 2 THEN 1 END WHERE id IN (1, 2);
  SET CONSTRAINTS ALL IMMEDIATE;
  INSERT INTO outcome VALUES ('case', (SELECT string_agg(id || '=' || val, ', ' ORDER BY id) FROM swappable));
END $$;

SELECT variant, result FROM outcome;`,
      expect: [
        { variant: 'two updates', result: 'unique_violation' },
        { variant: 'case', result: '1=b, 2=a' },
      ],
    },
    theory: ['sql-ddl#deferrable'],
    source: [D('5')],
    basis: 'derived',
  },
  {
    id: 'ddl-integer-division',
    title: 'Целочисленное деление и приведение типов',
    level: 1,
    statement: `
Что вернут выражения \`5 / 2\`, \`5::numeric / 2\`, \`CAST(7 AS numeric(12,2))\`, \`ROUND(10 * 1.2, 2)\`?
`,
    answer: `\`5 / 2\` = **2**; \`5::numeric / 2\` = **2.5** (в PostgreSQL выводится как 2.5000000000000000); \`CAST(7 AS numeric(12,2))\` = **7.00**; \`ROUND(10 * 1.2, 2)\` = **12.00**.`,
    solution: `
Конспект: «особенно важно при делении целых чисел: (5::NUMERIC / 2) вернёт 2.5, а (5 / 2) вернёт 2». Это частая ошибка в отчётах со средними значениями — приводите к numeric до деления (или используйте \`avg\`, который для целых возвращает numeric).
{{sql}}
`,
    sql: {
      fixture: [],
      code: `SELECT 5 / 2 AS int_div,
       (5::numeric / 2)::text AS numeric_div,
       CAST(7 AS numeric(12,2))::text AS money,
       ROUND(10 * 1.2, 2)::text AS rounded;`,
      expect: [{ int_div: 2, numeric_div: '2.5000000000000000', money: '7.00', rounded: '12.00' }],
    },
    theory: ['sql-ddl#schema-objects'],
    source: [D('3–4')],
    basis: 'material',
  },
];
