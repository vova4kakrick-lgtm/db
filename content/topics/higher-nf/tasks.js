const H = (pages) => ({ doc: 'hnf', pages });

export default [
  {
    id: 'hnf-4nf-decompose',
    title: 'Декомпозиция EmployeeSkillsLanguages к 4НФ',
    level: 2,
    statement: `
Таблица со слайда:

| EmployeeID | Skill | Language |
| --- | --- | --- |
| 101 | Java | English |
| 101 | Java | German |
| 101 | Python | English |
| 101 | Python | German |
| 102 | SQL | French |

1. Какие многозначные зависимости здесь есть?
2. Выполните декомпозицию к 4НФ и покажите содержимое новых таблиц.
3. Проверьте, что соединение новых таблиц восстанавливает исходную ровно (без потерь и без лишних строк).
`,
    answer: `
1. \`EmployeeID →→ Skill\` и \`EmployeeID →→ Language\`.
2. **EmployeeSkills**: (101, Java), (101, Python), (102, SQL). **EmployeeLanguages**: (101, English), (101, German), (102, French).
3. Соединение по EmployeeID даёт 2·2 + 1·1 = **5** строк — ровно исходные.
`,
    solution: `
Навыки и языки — независимые (ортогональные) факты о сотруднике, поэтому исходная таблица хранит их декартово произведение. По правилу лекции на каждую МЗД A →→ B создаётся таблица (A, B). Проверка в SQL — соединение проекций и сравнение с исходной таблицей в обе стороны через \`EXCEPT\`:
{{sql}}
`,
    sql: {
      fixture: 'higher-nf',
      code: `CREATE TABLE employee_skills AS
  SELECT DISTINCT employee_id, skill FROM employee_skills_languages;
CREATE TABLE employee_languages AS
  SELECT DISTINCT employee_id, language FROM employee_skills_languages;

WITH restored AS (
  SELECT s.employee_id, s.skill, l.language
  FROM employee_skills AS s
  JOIN employee_languages AS l USING (employee_id)
)
SELECT (SELECT count(*) FROM restored)::int AS restored_rows,
       NOT EXISTS (SELECT * FROM restored EXCEPT SELECT * FROM employee_skills_languages)
       AND NOT EXISTS (SELECT * FROM employee_skills_languages EXCEPT SELECT * FROM restored) AS same_rows;`,
      expect: [{ restored_rows: 5, same_rows: true }],
    },
    theory: ['higher-nf#4nf'],
    source: [H('3–5')],
    basis: 'derived',
  },
  {
    id: 'hnf-4nf-anomaly',
    title: 'Аномалия обновления до и после 4НФ',
    level: 1,
    statement: `
Сотрудник 101 освоил навык Go. Сколько строк нужно вставить в исходную \`EmployeeSkillsLanguages\` и сколько — после декомпозиции к 4НФ? Что будет, если вставить только одну строку в исходную таблицу?
`,
    answer: `
В исходную — **2 строки** ((101, Go, English) и (101, Go, German)); после декомпозиции — **1 строка** (101, Go) в EmployeeSkills. Если вставить одну строку, таблица станет противоречивой: будет выглядеть так, будто Go связан только с одним языком.
`,
    solution: `
Это аномалия обновления со слайда «4НФ: Проблема» («добавление навыка требует множества строк»): число строк для нового навыка равно числу языков сотрудника, потому что таблица хранит декартово произведение двух независимых множеств.
`,
    theory: ['higher-nf#4nf'],
    source: [H('3')],
    basis: 'derived',
  },
  {
    id: 'hnf-4nf-course',
    title: 'Курсы, преподаватели и учебники',
    level: 2,
    statement: `
Таблица \`CourseInfo(Course, Teacher, Textbook)\`: любой преподаватель курса может использовать любой учебник курса, наборы преподавателей и учебников курса независимы. Найдите МЗД и предложите схему в 4НФ. Как пришёл бы к этой схеме проектировщик, начавший с ER-модели?
`,
    answer: `
МЗД: \`Course →→ Teacher\`, \`Course →→ Textbook\`. Схема 4НФ: \`CourseTeacher(Course, Teacher)\`, \`CourseTextbook(Course, Textbook)\`. В ER это две независимые связи M:N: «Курс — ведёт — Преподаватель» и «Курс — использует — Учебник», каждая из которых по [правилу 2](topic:relational-model#rule2) даёт своё отношение.
`,
    solution: `
Ситуация полностью аналогична примеру лекции «сотрудник — навыки — языки»: два ортогональных множества при одном A. Главный инсайт лекции — 4НФ получается как естественный результат корректного ER-моделирования. Если же выбор учебника зависит от конкретного преподавателя, независимости нет, МЗД не выполняется, и тройку нужно хранить целиком (ср. [5НФ](topic:higher-nf#5nf)).
`,
    theory: ['higher-nf#4nf', 'relational-model#rule2'],
    source: [H('4–6')],
    basis: 'derived',
  },
  {
    id: 'hnf-5nf-join',
    title: 'Offerings: восстановится ли таблица соединением?',
    level: 3,
    statement: `
Проекции \`Offerings(Agent, Company, Product)\` со слайда 8:
- AgentCompany: (Смит, Acme), (Смит, Stark), (Джонс, Acme);
- CompanyProduct: (Acme, Пылесосы), (Acme, Гаджеты), (Stark, Тостеры);
- AgentProduct: (Смит, Пылесосы), (Смит, Тостеры), (Джонс, Пылесосы), (Джонс, Гаджеты).

1. Вычислите соединение трёх проекций. Есть ли ложные строки?
2. Пусть Смит получил право продавать гаджеты, т. е. в AgentProduct добавлена (Смит, Гаджеты), но гаджеты Acme он не предлагает. Что даст соединение теперь?
3. Почему лекция рекомендует оставить Offerings одной таблицей?
`,
    answer: `
1. Ровно 4 исходные строки, ложных нет (на этих данных).
2. Появляется ложная строка **(Смит, Acme, Гаджеты)**: все три попарных факта верны, но сама тройка — нет.
3. Бизнес-правило («агент может предлагать продукт компании X, *только если* работает на X, авторизован на продукт и X его производит») задаёт лишь необходимые условия; разрешённость тройки определяется только всей тройкой. Декомпозиция на пары теряет это правило, поэтому Offerings — в 5НФ, и её «избыточность» нужна для целостности.
`,
    solution: `
Проверка в SQL: соединяем проекции, затем добавляем факт из п. 2 и ищем строки соединения, которых нет в Offerings:
{{sql}}
На слайде лекции ложной отмечена строка (Смит, Acme, Тостеры); по показанным проекциям она получиться не может (нет пары (Acme, Тостеры)) — см. примечание в [теории](topic:higher-nf#5nf). Сам вывод лекции от этого не меняется.
`,
    sql: {
      fixture: 'higher-nf',
      code: `-- 1) соединение проекций, как на слайде
SELECT count(*)::int AS rows_before
FROM agent_company AS ac
JOIN company_product AS cp USING (company)
JOIN agent_product AS ap USING (agent, product);

-- 2) Смит получил право продавать гаджеты
INSERT INTO agent_product VALUES ('Смит', 'Гаджеты');

SELECT ac.agent, ac.company, cp.product
FROM agent_company AS ac
JOIN company_product AS cp USING (company)
JOIN agent_product AS ap ON ap.agent = ac.agent AND ap.product = cp.product
EXCEPT
SELECT agent, company, product FROM offerings;`,
      expect: [{ agent: 'Смит', company: 'Acme', product: 'Гаджеты' }],
    },
    theory: ['higher-nf#5nf', 'er-uml#binary-vs-ternary'],
    source: [H('7–11')],
    basis: 'derived',
  },
  {
    id: 'hnf-dknf',
    title: 'Какие ограничения обеспечит сама схема (ДК/НФ)?',
    level: 2,
    statement: `
Для SaaS-сервиса заданы правила:
1. Семестр студента от 1 до 14.
2. Email пользователя уникален.
3. Подписка ссылается на существующий тарифный план.
4. Статус счёта — один из 'pending', 'paid', 'failed'.
5. Число пользователей организации не превышает \`max_users\` её тарифного плана.

Какие из них выражаются ограничениями доменов и ключей? Находится ли такая схема в ДК/НФ?
`,
    answer: `
1 и 4 — ограничения доменов (\`CHECK\`, enum/тип); 2 — ключевое (\`UNIQUE\`); 3 — ссылочное (\`FOREIGN KEY\`). Правило 5 зависит от данных других таблиц и не выводится из доменов и ключей — значит, схема **не в ДК/НФ**: его придётся проверять триггером или в приложении.
`,
    solution: `
ДК/НФ — теоретический идеал: любое ограничение целостности — следствие ограничений доменов и ключей (\`PRIMARY KEY\`/\`UNIQUE\`, \`FOREIGN KEY\`, \`CHECK\`, типы, \`NOT NULL\`). Правило 5 — из варианта А мидтерма 2025 («количество пользователей не должно превышать лимит тарифного плана»). Лекция по SQL советует сначала пытаться выразить правило через CHECK/UNIQUE/FK/EXCLUDE и лишь затем использовать [триггер](topic:sql-ddl#triggers).
`,
    theory: ['higher-nf#dknf', 'sql-ddl#constraints', 'sql-ddl#triggers'],
    source: [H('12'), { doc: 'l05', pages: '12' }, { doc: 'l05', pages: '17' }, { doc: 'varA' }],
    basis: 'derived',
  },
  {
    id: 'hnf-6nf',
    title: 'История атрибутов сотрудника в 6НФ',
    level: 2,
    statement: `
Нужно хранить полную историю имени, должности и зарплаты сотрудника, причём атрибуты меняются независимо. Предложите схему в 6НФ и назовите её плюсы. Какую НФ лекция называет «золотым стандартом» для OLTP?
`,
    answer: `
\`EmployeeNames(ID, Name, ValidFrom, ValidTo)\`, \`EmployeePositions(ID, Position, ValidFrom, ValidTo)\`, \`EmployeeSalaries(ID, Salary, ValidFrom, ValidTo)\` — ключ + не более одного неключевого атрибута. Плюсы: независимое изменение атрибутов, полная история каждого, новый атрибут = новая таблица. Для OLTP «золотой стандарт» — **3НФ**.
`,
    solution: `
Схема повторяет пример со слайда 13. Цена максимальной декомпозиции — много соединений при чтении «полного» сотрудника, поэтому 6НФ применяют там, где действительно нужна история по атрибутам.
`,
    theory: ['higher-nf#6nf', 'higher-nf#nf-map'],
    source: [H('13–14')],
    basis: 'material',
  },
];
