const N = (pages) => ({ doc: 'norm', pages });

export default [
  {
    id: 'norm-anomalies',
    title: 'Найти аномалии в UnnormalizedOrders',
    level: 1,
    statement: `
Таблица \`UnnormalizedOrders(OrderID, ProductID, OrderDate, CustomerID, CustomerName, ProductDescription, ProductPrice, Quantity)\`, ключ (OrderID, ProductID). Приведите по одному примеру аномалии вставки, удаления и обновления.
`,
    answer: `
- **Вставка:** нельзя добавить новый товар, пока его никто не заказал (нет OrderID для ключа).
- **Удаление:** удалив единственный заказ клиента, теряем сведения о клиенте (CustomerName).
- **Обновление:** цена или описание товара повторяются во всех строках заказов с этим товаром — изменение нужно делать во многих местах.
`,
    solution: `
Все три примера — со слайда «Три типа аномалий данных». Причина — в одной таблице хранятся факты о разных сущностях (заказ, клиент, товар), т. е. есть частичные и транзитивные ФЗ; их устраняют 2НФ и 3НФ.
`,
    theory: ['normalization#anomalies'],
    source: [N('3–4')],
    basis: 'material',
  },
  {
    id: 'norm-armstrong',
    title: 'Вывод ФЗ по аксиомам Армстронга',
    level: 2,
    statement: `
Дано: \`A → B\`, \`B → C\`, \`CD → E\`. Выведите по аксиомам Армстронга (указывая аксиому на каждом шаге):
1. \`A → C\`
2. \`AD → E\`
3. \`A → BC\`
`,
    answer: `
1. A → B, B → C ⇒ **A → C** (транзитивность).
2. A → C ⇒ AD → CD (дополнение D); CD → E ⇒ **AD → E** (транзитивность).
3. A → B и A → C ⇒ **A → BC** (объединение).
`,
    solution: `
Аксиомы: рефлексивность (B ⊆ A ⇒ A → B), дополнение (A → B ⇒ AC → BC), транзитивность (A → B, B → C ⇒ A → C); доп. правила — декомпозиция и объединение. Шаг 2 показывает типичный приём: дополнить левую и правую часть одним атрибутом, чтобы «склеить» с другой ФЗ.
`,
    theory: ['normalization#armstrong'],
    source: [N('6')],
    basis: 'derived',
  },
  {
    id: 'norm-closure-slide',
    title: 'Замыкание и ключ для R(A, B, C, D, E)',
    level: 2,
    statement: `
R(A, B, C, D, E), ФЗ: \`A → B\`, \`BC → D\`, \`E → A\`.
1. Вычислите \`(A, C)⁺\`, \`(C, E)⁺\`, \`(A, C, E)⁺\`.
2. Какие из этих множеств — суперключи? Найдите потенциальный ключ.
`,
    answer: `
1. \`(A, C)⁺ = {A, B, C, D}\`; \`(C, E)⁺ = {A, B, C, D, E}\`; \`(A, C, E)⁺ = {A, B, C, D, E}\`.
2. Суперключи: (C, E) и (A, C, E). Потенциальный ключ — **(C, E)**: он минимален. (A, C, E) — суперключ, но с лишним атрибутом A.
`,
    solution: `
Алгоритм замыкания: result = X; добавляем правую часть ФЗ, если левая ⊆ result; повторяем до стабилизации.
- (A, C): A → B даёт B; BC → D даёт D; E не выводится ни из чего → не суперключ.
- (C, E): E → A даёт A; A → B даёт B; BC → D даёт D → все атрибуты.

Атрибуты C и E не встречаются в правых частях ФЗ, поэтому обязаны входить в любой ключ. **На слайде лекции ключом назван (A, C, E)** — по определению «суперключ без избыточности» это суперключ, но не потенциальный ключ; см. примечание в [теории](topic:normalization#closure-keys).
`,
    theory: ['normalization#closure-keys'],
    source: [N('7')],
    basis: 'derived',
  },
  {
    id: 'norm-closure-chain',
    title: 'Ключи отношения с цепочкой зависимостей',
    level: 1,
    statement: `
R(A, B, C, D), ФЗ: \`A → B\`, \`B → C\`, \`C → D\`. Найдите \`B⁺\`, все потенциальные ключи и нормальную форму R (до 3НФ включительно).
`,
    answer: `
\`B⁺ = {B, C, D}\`. Единственный потенциальный ключ — **A** (\`A⁺ = {A, B, C, D}\`). R в **2НФ**, но не в 3НФ: есть транзитивные зависимости A → B → C → D.
`,
    solution: `
A не встречается справа ни в одной ФЗ — он входит в любой ключ, и его замыкание уже содержит всё. Ключ из одного атрибута ⇒ частичных зависимостей нет ⇒ 2НФ. Но B → C и C → D — ФЗ между неключевыми атрибутами ⇒ нарушение 3НФ. Декомпозиция: (A, B), (B, C), (C, D) — это же даёт и [алгоритм синтеза](topic:normalization#synthesis).
`,
    theory: ['normalization#closure-keys', 'normalization#2nf', 'normalization#3nf'],
    source: [N('7'), N('10–13')],
    basis: 'derived',
  },
  {
    id: 'norm-2nf-3nf',
    title: 'Привести UnnormalizedOrders к 2НФ и 3НФ',
    level: 2,
    statement: `
ФЗ: \`OrderID → OrderDate, CustomerID\`; \`CustomerID → CustomerName\`; \`ProductID → ProductDescription, ProductPrice\`; \`(OrderID, ProductID) → Quantity\`.
Приведите \`UnnormalizedOrders\` сначала к 2НФ, затем к 3НФ. Какие зависимости устраняет каждый шаг?
`,
    answer: `
**2НФ** (устраняем частичные зависимости от части ключа (OrderID, ProductID)):
Orders(OrderID, OrderDate, CustomerID, CustomerName); Products(ProductID, ProductDescription, ProductPrice); OrderItems(OrderID, ProductID, Quantity).

**3НФ** (устраняем транзитивную OrderID → CustomerID → CustomerName):
Customers(CustomerID, CustomerName); Products(ProductID, ProductDesc, ProductPrice); Orders(OrderID, OrderDate, CustomerID FK); OrderItems(OrderID FK, ProductID FK, Quantity).
`,
    solution: `
Решение совпадает со слайдами 10–13. Мнемоника: 1НФ — от ключа, 2НФ — от ключа целиком, 3НФ — ни от чего, кроме ключа. В SQL эта схема — четыре \`CREATE TABLE\` с внешними ключами; составной PK \`(OrderID, ProductID)\` у OrderItems ([DDL](topic:sql-ddl#constraints)).
`,
    theory: ['normalization#2nf', 'normalization#3nf'],
    source: [N('10–13')],
    basis: 'material',
  },
  {
    id: 'norm-1nf-phones',
    title: 'Список телефонов в одной ячейке',
    level: 1,
    statement: `
Таблица \`Clients(ClientID, Name, Phones)\` хранит строку \`(101, 'Иван Иванов', '+79261112233, +74955556677')\`. Какую нормальную форму она нарушает, какие проблемы это создаёт и как исправить?
`,
    answer: `
Нарушена **1НФ** (атрибут Phones не атомарен). Проблемы: нельзя сравнить список со скаляром (\`client.phones = delivery.phone\`); невозможно обеспечить уникальность «один телефон — один клиент»; изменение требует парсить и собирать строки. Исправление: отдельная таблица \`ClientPhones(ClientID FK, Phone)\` с \`UNIQUE (Phone)\`, если телефон принадлежит одному клиенту.
`,
    solution: `
Проблемы перечислены на слайде «Пример нарушения 1НФ». Атомарность зависит от бизнес-требований: решающий вопрос — нужно ли искать по части атрибута. Здесь нужно (поиск клиента по телефону), значит телефоны — отдельные значения. Декомпозиция по образцу [4НФ](topic:higher-nf#4nf): «для каждой многозначной зависимости — своя таблица».
`,
    theory: ['normalization#1nf', 'sql-ddl#constraints'],
    source: [N('8–9')],
    basis: 'derived',
  },
  {
    id: 'norm-bcnf-enrollments',
    title: 'Enrollments(Student, Course, Professor) и НФБК',
    level: 3,
    statement: `
ФЗ: \`(Student, Course) → Professor\`, \`Professor → Course\` (каждый профессор ведёт один курс).
1. Найдите потенциальные ключи.
2. Находится ли отношение в 3НФ? В НФБК?
3. Декомпозируйте до НФБК. Какая ФЗ при этом «теряется»?
`,
    answer: `
1. (Student, Course) и (Student, Professor).
2. В **3НФ** — да (все атрибуты входят в какой-то ключ, неключевых нет). В **НФБК** — нет: \`Professor → Course\`, а Professor — не суперключ.
3. \`ProfCourse(Professor, Course)\` с ключом Professor и \`StudentProf(Student, Professor)\` с ключом (Student, Professor). ФЗ \`(Student, Course) → Professor\` теперь нельзя проверить в одной таблице — она не сохраняется.
`,
    solution: `
Ключи и причина нарушения — со слайда «НФБК». Проверка ключей: \`(Student, Professor)⁺\` — по Professor → Course добавляется Course, все атрибуты; \`(Student, Course)⁺\` — по первой ФЗ добавляется Professor. Декомпозиция по нарушающей ФЗ X → Y: таблица (X, Y) и таблица из X и остальных атрибутов. Лекция подчёркивает: НФБК декомпозирует **без гарантии сохранения всех ФЗ**, а синтез 3НФ — сохраняет.
`,
    theory: ['normalization#bcnf', 'normalization#closure-keys', 'normalization#3nf'],
    source: [N('14'), N('18')],
    basis: 'derived',
  },
  {
    id: 'norm-synthesis-slide',
    title: 'Синтез 3НФ: студенты, курсы, оценки',
    level: 1,
    statement: `
Атрибуты: (StudentID, StudentName, CourseID, CourseName, Grade). ФЗ: \`StudentID → StudentName\`, \`CourseID → CourseName\`, \`(StudentID, CourseID) → Grade\`. Примените алгоритм синтеза.
`,
    answer: `
Students(StudentID PK, StudentName); Courses(CourseID PK, CourseName); Grades(StudentID FK, CourseID FK, Grade) с ключом (StudentID, CourseID).
`,
    solution: `
1) Покрытие уже минимально. 2) По таблице на ФЗ. 3) Левые части различны — группировать нечего. 4) Таблица Grades содержит потенциальный ключ всего отношения (StudentID, CourseID). 5) Дополнительная таблица не нужна. Результат совпадает со слайдом и сохраняет все исходные зависимости.
`,
    theory: ['normalization#synthesis'],
    source: [N('15–16')],
    basis: 'material',
  },
  {
    id: 'norm-synthesis-key',
    title: 'Синтез 3НФ, когда нужна таблица с ключом',
    level: 3,
    statement: `
R(A, B, C, D, E), ФЗ: \`A → B\`, \`BC → D\`, \`E → A\` (покрытие минимально). Постройте схему в 3НФ алгоритмом синтеза.
`,
    answer: `
R1(A, B), R2(B, C, D), R3(E, A) и **R4(C, E)** — таблица с потенциальным ключом.
`,
    solution: `
Шаги 2–3: таблицы по ФЗ — (A, B), (B, C, D), (E, A); левые части разные. Шаг 4: потенциальный ключ R — (C, E) (см. [задачу о замыкании](tasks:normalization#norm-closure-slide)); ни одна из трёх таблиц не содержит одновременно C и E. Шаг 5: добавляем (C, E). Без этой таблицы нельзя восстановить исходное отношение соединением.
`,
    theory: ['normalization#synthesis', 'normalization#closure-keys'],
    source: [N('7'), N('15')],
    basis: 'derived',
  },
  {
    id: 'norm-which-nf',
    title: 'Определить нормальную форму',
    level: 2,
    statement: `
Для каждого отношения укажите наивысшую НФ из {1НФ, 2НФ, 3НФ, НФБК} (атрибуты атомарны):
1. \`Student(StudentID, Name, GroupID, GroupName)\`; ФЗ: StudentID → Name, GroupID; GroupID → GroupName.
2. \`Exam(StudentID, CourseID, CourseTitle, Grade)\`; ФЗ: (StudentID, CourseID) → Grade; CourseID → CourseTitle.
3. \`Course(CourseID, Title, Credits)\`; ФЗ: CourseID → Title, Credits.
`,
    answer: `1 — **2НФ** (транзитивная StudentID → GroupID → GroupName); 2 — **1НФ** (частичная CourseID → CourseTitle); 3 — **НФБК** (единственный детерминант — ключ).`,
    solution: `
1. Ключ StudentID (один атрибут) ⇒ частичных зависимостей нет ⇒ 2НФ; GroupID → GroupName — неключевой от неключевого ⇒ не 3НФ.
2. Ключ (StudentID, CourseID); CourseTitle зависит от части ключа ⇒ не 2НФ.
3. Все нетривиальные ФЗ имеют детерминантом ключ CourseID ⇒ НФБК (а значит, и 3НФ).
`,
    theory: ['normalization#2nf', 'normalization#3nf', 'normalization#bcnf'],
    source: [N('10–14')],
    basis: 'derived',
  },
  {
    id: 'norm-denormalize',
    title: 'Оправдана ли денормализация?',
    level: 1,
    statement: `
Команда предлагает: (а) сразу при проектировании хранить имя клиента в каждой строке заказов, «чтобы было быстрее»; (б) для ежемесячного аналитического отчёта по продажам завести таблицу с готовыми агрегатами после того, как выяснилось, что отчёт строится слишком долго. Оцените оба предложения.
`,
    answer: `
(а) — **неоправданно**: денормализация допустима только после нормализованной схемы и при реальных проблемах с производительностью. (б) — **оправданно**: отчёты/аналитика (OLAP) и есть реальная проблема.
`,
    solution: `
Слайд «Денормализация»: это осознанное добавление избыточных данных; оправдана для отчётов и аналитики, историчности, кэширования; важное условие — только после нормализации и реальных проблем. Для (б) в PostgreSQL подходит \`MATERIALIZED VIEW\` или \`INSERT … SELECT\` в отчётную таблицу ([представления](topic:sql-advanced#views), [INSERT … SELECT](topic:sql-dml#insert)).
`,
    theory: ['normalization#denormalization'],
    source: [N('17')],
    basis: 'derived',
  },
];
