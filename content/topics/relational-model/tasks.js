const R = (pages) => ({ doc: 'l04', pages });
const EN = (pages) => ({ doc: 'l03en', pages });

export default [
  {
    id: 'rel-uni-translate',
    title: 'Перевести ER-модель университета в отношения',
    level: 2,
    statement: `
ER-модель: Студент(StudID, Name, Semester), Курс(Nr, Title, CP), Профессор(PersNr, Name, Level, Room), Ассистент(PersNr, Name, Area).
Связи: посещает (Студент N:M Курс); требует (Курс N:M Курс, роли «пререквизит»/«продолжение»); ведёт (Профессор 1:N Курс); руководит (Ассистент N:1 Профессор); экзамен (Студент, Курс, Профессор) с атрибутом Оценка.

Постройте реляционную схему, применив правила 1–3. Укажите внешние ключи.
`,
    answer: `
\`\`\`
Student(StudID, Name, Semester)
Professor(PersNr, Name, Level, Room)
Lecture(Nr, Title, CP, PersNr)          -- FK PersNr → Professor (связь «ведёт» влита по правилу 3)
Assistant(PersNr, Name, Area, Boss)     -- FK Boss → Professor (связь «руководит» влита)
attends(StudID, Nr)                     -- FK → Student, Lecture
requires(Prerequisite, FollowUp)        -- оба FK → Lecture, имена по ролям
tests(StudID, Nr, PersNr, Grade)        -- FK → Student, Lecture, Professor
\`\`\`
`,
    solution: `
1. **Правило 1:** четыре сущности → четыре отношения.
2. **Правило 2:** каждая связь → отношение из ключей участников и атрибутов связи: attends, requires, gives, works_for, tests. Для рекурсивной «требует» оба ключа называются Nr, поэтому берём имена ролей.
3. **Правило 3:** у gives(Nr, PersNr) ключ Nr — как у Lecture, поэтому gives вливается в Lecture; у works_for(AssistantPersNr, ProfPersNr) ключ — PersNr ассистента, поэтому связь вливается в Assistant как атрибут Boss.
4. N:M-связи (attends, requires) и тернарная tests остаются отдельными отношениями.

Итог совпадает со схемой Uni-DB на слайде лекции.
`,
    theory: ['relational-model#rule1', 'relational-model#rule2', 'relational-model#rule3', 'relational-model#uni-schema'],
    source: [R('4–11'), R('18'), EN('19')],
    basis: 'material',
  },
  {
    id: 'rel-no-list-in-one',
    title: 'Почему нельзя хранить курсы в таблице профессора',
    level: 1,
    statement: `
Студент предложил реализовать связь Профессор 1:N Курс, добавив в Professor столбец gives с номером курса (по строке на каждый курс). Какие проблемы возникнут? Покажите на примере Сократа (3 курса) и Кюри (0 курсов).
`,
    answer: `
Сведения о Сократе повторяются в трёх строках (**избыточность**); смена кабинета требует обновить все три строки, иначе данные противоречивы (**аномалия обновления**); Кюри без курсов можно сохранить только со специальным значением NULL в gives (**аномалия вставки**); удаление последнего курса профессора удалит и сведения о нём (**аномалия удаления**); PersNr перестаёт быть ключом Professor.
`,
    solution: `
Правильная схема хранит ссылку на профессора в Lecture (\`Lecture(Nr, Title, CP, PersNr)\`), а не список курсов в Professor. Формально проблема объясняется функциональными зависимостями и нормальными формами — см. [аномалии](topic:normalization#anomalies) и [3НФ](topic:normalization#3nf).
`,
    theory: ['relational-model#rule3', 'normalization#anomalies'],
    source: [R('12–13'), EN('12–13')],
    basis: 'material',
  },
  {
    id: 'rel-generalization-choice',
    title: 'Выбор стратегии для обобщения',
    level: 2,
    statement: `
Иерархия: Employee(PersNr, Name) — надтип, Professor(Level, Room) и Assistant(Area) — подтипы.
Запишите схемы для обеих стратегий правила 4. Какая удобнее, если (а) чаще всего нужен список **всех** сотрудников с именами; (б) почти всегда запрашиваются только профессора со всеми атрибутами, и сотрудник может быть одновременно профессором и ассистентом?
`,
    answer: `
Стратегия 1: \`Employee(PersNr, Name)\`, \`Professor(PersNr, Level, Room)\`, \`Assistant(PersNr, Area)\` (PersNr в подтипах — PK и FK на Employee).
Стратегия 2: \`Professor(PersNr, Name, Level, Room)\`, \`Assistant(PersNr, Name, Area)\`.

(а) — стратегия 1: все сотрудники и имена лежат в одной таблице Employee.
(б) — чтение профессоров удобнее во 2-й (без JOIN), но пересечение подтипов приведёт к дублированию Name в двух таблицах — лекция отмечает это как минус стратегии 2. Нужно взвесить; «лучшей» стратегии нет.
`,
    solution: `
Плюсы и минусы из лекции: стратегия 1 — нет дублирования, но для полного объекта подтипа нужен JOIN; стратегия 2 — нет JOIN при чтении подтипа, но общие атрибуты дублируются и сложнее поддерживать общую сущность, особенно при пересекающихся подтипах. Выбор зависит от ограничений и характерных запросов.
`,
    theory: ['relational-model#rule4'],
    source: [R('14–16'), EN('14–16')],
    basis: 'derived',
  },
  {
    id: 'rel-roles-naming',
    title: 'Имена атрибутов в отношении связи',
    level: 1,
    statement: `
1. Связь «друг» между Professor и Assistant (N:M); ключ обеих сущностей называется PersNr. Запишите отношение.
2. Рекурсивная связь «требует» между курсами с ролями «пререквизит» и «продолжение». Запишите отношение.
`,
    answer: `
1. \`friend(ProfNr integer, AssistNr integer)\` — различающие имена вместо двух PersNr.
2. \`requires(prerequisite integer, follow_up integer)\` — имена ролей.
`,
    solution: `
Правило лекции: если в ER заданы роли — используйте их имена; иначе — имена ключевых атрибутов сущностей, а при неоднозначности придумайте различающие имена. Имена должны однозначно отражать роли участников.
`,
    theory: ['relational-model#rule2'],
    source: [R('7'), R('9'), EN('9')],
    basis: 'material',
  },
  {
    id: 'rel-library',
    title: 'Библиотека: от ER к схеме (ДЗ 3)',
    level: 3,
    statement: `
Переведите ER-модель библиотеки из [задачи по ER](tasks:er-uml#er-library) в реляционную схему: Книга, Экземпляр (слабая), Издательство, Категория с иерархией, Книга N:M Категория, Читатель, выдача с плановой датой возврата. Укажите ключи и внешние ключи.
`,
    answer: `
\`\`\`
Publisher(PublisherName, Address)
Book(ISBN, Year, Title, Author, Pages, PublisherName)   -- FK → Publisher
Copy(ISBN, CopyNumber, ShelfPosition)                   -- PK (ISBN, CopyNumber), FK ISBN → Book
Category(CategoryName, ParentName)                      -- FK ParentName → Category
BookCategory(ISBN, CategoryName)                        -- PK из двух FK
Reader(ReaderNumber, LastName, FirstName, Address, Birthday)
Borrow(ISBN, CopyNumber, ReaderNumber, ReturnDate)      -- FK (ISBN, CopyNumber) → Copy, ReaderNumber → Reader
\`\`\`
`,
    solution: `
- Сущности → отношения (правило 1).
- Издательство 1:N Книга и иерархия категорий (1:N) — по правилу 3 вливаются как внешние ключи PublisherName и ParentName.
- Книга N:M Категория — отдельное отношение BookCategory (правило 2).
- Экземпляр — слабая сущность: ключ (ISBN, CopyNumber) включает ключ владельца (правило 5).
- Выдача — отношение связи с атрибутом ReturnDate. Если хранится только текущая выдача (у экземпляра не более одного читателя), ключ Borrow — (ISBN, CopyNumber); если нужна история — в ключ нужно добавить, например, дату выдачи. В условии ДЗ это не уточнено.
- Ограничение «у книги хотя бы одна категория» в такой схеме структурой не обеспечивается — его нужно проверять отдельно (в курсе для «динамических» правил упоминаются триггеры, см. [триггеры](topic:sql-ddl#triggers)).
`,
    theory: ['relational-model#rule2', 'relational-model#rule3', 'relational-model#rule5'],
    source: [EN('44'), { doc: 'l02', pages: '43' }],
    basis: 'derived',
  },
  {
    id: 'rel-why-key-exists',
    title: 'Почему у любого отношения есть хотя бы один ключ (ДЗ 3)',
    level: 2,
    statement: `
Докажите, что у любого отношения в реляционной схеме есть хотя бы один ключ.
`,
    answer: `
Отношение — **множество** кортежей, поэтому двух одинаковых кортежей в нём нет. Значит, набор **всех** атрибутов однозначно идентифицирует кортеж (это суперключ). Из конечного набора, обладающего свойством уникальности, можно удалять атрибуты, пока свойство сохраняется; получим **минимальный** набор — ключ.
`,
    solution: `
Используются определения лекции: отношение — подмножество декартова произведения доменов (т. е. множество, без повторов), ключ — минимальный набор атрибутов, однозначно идентифицирующий кортеж. Термин «суперключ» (множество атрибутов, определяющее все остальные) введён в лекции о нормализации.
`,
    theory: ['relational-model#basics', 'normalization#closure-keys'],
    source: [EN('44'), R('2–3'), { doc: 'norm', pages: '7' }],
    basis: 'derived',
  },
  {
    id: 'rel-single-relation',
    title: 'Вся библиотека в одной таблице (ДЗ 3)',
    level: 2,
    statement: `
Что произойдёт, если реализовать ER-модель библиотеки одним отношением со всеми атрибутами (книга, экземпляр, издательство, категории, читатель, выдача) вместо отдельных отношений для сущностей и связей?
`,
    answer: `
Возникнут избыточность и аномалии: данные книги и издательства повторяются для каждого экземпляра, категории и выдачи (аномалия обновления); нельзя добавить книгу без экземпляра или читателя без выдачи без NULL-заглушек (аномалия вставки); удаление последней выдачи стирает сведения о читателе (аномалия удаления). Кроме того, N:M «книга — категория» размножает строки как декартово произведение.
`,
    solution: `
Это та же ситуация, что «кошмарная таблица» UnnormalizedOrders из лекции о нормализации и «впихивание» связи 1:N в одну таблицу в лекции 4. Лечение — декомпозиция по функциональным (и многозначным) зависимостям, т. е. ровно те отдельные отношения, которые дают правила перевода ER.
`,
    theory: ['normalization#anomalies', 'relational-model#rule3', 'higher-nf#4nf'],
    source: [EN('44'), { doc: 'norm', pages: '3–4' }, R('12–13')],
    basis: 'derived',
  },
  {
    id: 'rel-weak-exam',
    title: 'Слабая сущность «Экзамен» в отношениях',
    level: 2,
    statement: `
Экзамен — слабая сущность, зависящая от Студента (частичный ключ Part, атрибут Grade). Экзамен связан N:M с Курсом (covers) и с Профессором (gives). Запишите отношения и их ключи.
`,
    answer: `
\`\`\`
Exam(StudID, Part, Grade)          -- PK (StudID, Part), FK StudID → Student
covers(StudID, Part, Nr)           -- FK (StudID, Part) → Exam, Nr → Lecture
gives(StudID, Part, PersNr)        -- FK (StudID, Part) → Exam, PersNr → Professor
\`\`\`
`,
    solution: `
По правилу 5 ключ слабой сущности включает ключ владельца: (StudID, Part). Отношения связей covers и gives строятся по правилу 2 — из ключей участников, поэтому включают *составной* ключ экзамена. Схема совпадает со слайдом лекции.
`,
    theory: ['relational-model#rule5', 'relational-model#rule2'],
    source: [R('17'), EN('17')],
    basis: 'material',
  },
];
