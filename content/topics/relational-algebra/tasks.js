const R = (pages) => ({ doc: 'l04', pages });
const EN = (pages) => ({ doc: 'l03en', pages });

const DATA_NOTE = 'Данные — экземпляр Uni-DB со слайдов лекции 4 (с. 11, 18) и Lecture 3 (с. 19).';

export default [
  {
    id: 'ra-selection',
    title: 'Выборка и проекция на Uni-DB',
    level: 1,
    statement: `
${DATA_NOTE}
1. Вычислите \`σ_{Semester > 10}(Student)\`.
2. Вычислите \`π_{Level}(Professor)\`. Сколько строк в результате и почему?
`,
    answer: `
1. Ксенократ (24002, 18), Йонас (25403, 12).
2. Две строки — **FP** и **AP**: проекция в классической алгебре удаляет дубликаты, хотя профессоров семь.
`,
    solution: `
SQL-эквивалент второго выражения (в SQL дубликаты удаляет только \`DISTINCT\`):
{{sql}}
`,
    sql: {
      fixture: 'uni-ra',
      code: 'SELECT DISTINCT level FROM professor ORDER BY level DESC;',
      expect: [{ level: 'FP' }, { level: 'AP' }],
    },
    theory: ['relational-algebra#selection-projection'],
    source: [R('21'), EN('22')],
    basis: 'material',
  },
  {
    id: 'ra-join-names',
    title: 'Кто читает курсы по 4 CP',
    level: 1,
    statement: `
${DATA_NOTE}
Запишите выражение реляционной алгебры: имена профессоров, которые читают хотя бы один курс на 4 CP. Вычислите результат.
`,
    answer: `
\`π_{Name}(Professor ⋈ σ_{CP = 4}(Lecture))\` → {**Кант**, **Сократ**}.
`,
    solution: `
Курсы на 4 CP: 5001 (Кант), 5041 (Сократ), 4052 (Сократ), 4630 (Кант). Естественное соединение идёт по общему атрибуту PersNr; проекция убирает повторы. Важно: у Professor и Lecture нет других одноимённых атрибутов (Name есть только у Professor), иначе естественное соединение добавило бы лишнее условие — поэтому в SQL лучше явный \`JOIN … ON\`:
{{sql}}
`,
    sql: {
      fixture: 'uni-ra',
      code: `SELECT DISTINCT p.name
FROM professor AS p
JOIN lecture AS l ON l.persnr = p.persnr
WHERE l.cp = 4
ORDER BY p.name;`,
      expect: [{ name: 'Кант' }, { name: 'Сократ' }],
    },
    theory: ['relational-algebra#product-join', 'relational-algebra#selection-projection'],
    source: [R('24–26')],
    basis: 'derived',
  },
  {
    id: 'ra-grandparents',
    title: 'Пререквизиты второго уровня (ρ и self-join)',
    level: 2,
    statement: `
${DATA_NOTE}
Найдите пререквизиты второго уровня («дедушек») курса 5216 с помощью переименования. Вычислите результат по таблице requires.
`,
    answer: `
\`π_{L1.Prerequisite}(σ_{L2.FollowUp = 5216 ∧ L1.FollowUp = L2.Prerequisite}(ρ_{L1}(requires) × ρ_{L2}(requires)))\` → **5001** («Основы»).
`,
    solution: `
Прямой пререквизит 5216 — 5041 (строка (5041, 5216)). Пререквизит 5041 — 5001 (строка (5001, 5041)). Переименование создаёт две логические копии requires, без него нельзя сослаться на одно отношение дважды. SQL-эквивалент — self-join:
{{sql}}
Все уровни сразу (транзитивное замыкание) алгеброй одной формулой не выразить — для этого в SQL есть [рекурсивный CTE](topic:sql-advanced#recursive).
`,
    sql: {
      fixture: 'uni-ra',
      code: `SELECT l1.prerequisite
FROM requires AS l1
JOIN requires AS l2 ON l1.followup = l2.prerequisite
WHERE l2.followup = 5216;`,
      expect: [{ prerequisite: 5001 }],
    },
    theory: ['relational-algebra#rename'],
    source: [R('31'), EN('32')],
    basis: 'material',
  },
  {
    id: 'ra-intersection',
    title: 'Пересечение через разность',
    level: 1,
    statement: `
${DATA_NOTE}
Вычислите \`π_{PersNr}(Lecture) ∩ π_{PersNr}(σ_{Level="FP"}(Professor))\` и перепишите выражение без ∩.
`,
    answer: `
Результат: {**2125, 2126, 2137**} (Сократ, Рассел, Кант). Без ∩: \`A − (A − B)\`, где A = \`π_{PersNr}(Lecture)\`, B = \`π_{PersNr}(σ_{Level="FP"}(Professor))\`.
`,
    solution: `
A = {2137, 2125, 2126, 2133, 2134} — кто читает курсы; B = {2125, 2126, 2136, 2137} — профессора FP. Пересечение: {2125, 2126, 2137}. Кюри (2136) — FP, но курсов не читает. Тождество \`R ∩ S = R − (R − S)\` — со слайда лекции. SQL:
{{sql}}
`,
    sql: {
      fixture: 'uni-ra',
      code: `SELECT persnr FROM lecture
INTERSECT
SELECT persnr FROM professor WHERE level = 'FP'
ORDER BY persnr;`,
      expect: [{ persnr: 2125 }, { persnr: 2126 }, { persnr: 2137 }],
    },
    theory: ['relational-algebra#set-ops'],
    source: [R('32'), EN('33')],
    basis: 'derived',
  },
  {
    id: 'ra-division-empty',
    title: 'Деление: все курсы по 4 CP',
    level: 2,
    statement: `
${DATA_NOTE}
Вычислите \`attends ÷ π_{Nr}(σ_{CP=4}(Lecture))\` — студентов, посещающих **все** курсы по 4 CP. Объясните результат.
`,
    answer: `
**Пустое множество.** Курсы по 4 CP: 5001, 5041, 4052, 4630; курс 4630 («Три критики») не посещает никто, поэтому ни один студент не связан со всеми четырьмя.
`,
    solution: `
Пошагово по формуле \`R ÷ S = π_{R−S}(R) − π_{R−S}((π_{R−S}(R) × S) − R)\`: кандидаты — все 7 студентов из attends; каждому не хватает как минимум курса 4630, поэтому шаг 4 даёт всех кандидатов, а разность — пустое множество. Это иллюстрирует вопрос лекции «что будет, если курсов или посещений нет?»: деление чувствительно к содержимому S. SQL-шаблон «для всех» (двойной \`NOT EXISTS\`):
{{sql}}
`,
    sql: {
      fixture: 'uni-ra',
      code: `SELECT s.studid
FROM student AS s
WHERE EXISTS (SELECT 1 FROM attends a0 WHERE a0.studid = s.studid)
  AND NOT EXISTS (
    SELECT 1 FROM lecture AS l
    WHERE l.cp = 4
      AND NOT EXISTS (
        SELECT 1 FROM attends AS a
        WHERE a.studid = s.studid AND a.nr = l.nr
      )
  );`,
      expect: [],
    },
    theory: ['relational-algebra#division', 'sql-advanced#for-all'],
    source: [R('33–35'), EN('34–36')],
    basis: 'derived',
  },
  {
    id: 'ra-division-steps',
    title: 'Деление по шагам: все продолжения курса 5041',
    level: 3,
    statement: `
${DATA_NOTE}
Пусть S = \`π_{FollowUp}(σ_{Prerequisite = 5041}(requires))\` (курсы, для которых 5041 — пререквизит). Найдите \`attends ÷ ρ_{Nr ← FollowUp}(S)\`, выписав результат каждого из пяти шагов построения деления через π, × и −.
`,
    answer: `
S = {5216, 5052}. Результат деления: {**28106**} (Карнап).
`,
    solution: `
1. Кандидаты \`π_{StudID}(attends)\` = {26120, 27550, 28106, 29120, 29555, 25403}.
2. Кандидаты × S — 12 пар (каждый кандидат с 5216 и с 5052).
3. Минус attends: у 28106 есть и 5052, и 5216 — его пары исчезают; у остальных остаются обе пары.
4. Проекция на StudID: {26120, 27550, 29120, 29555, 25403} — тем, кому не хватает хотя бы одного курса.
5. Кандидаты − шаг 4 = {28106}.

Переименование \`ρ_{Nr ← FollowUp}\` нужно, чтобы у делителя был тот же атрибут, что и в attends. Проверка через счётчики:
{{sql}}
`,
    sql: {
      fixture: 'uni-ra',
      code: `SELECT a.studid
FROM attends AS a
JOIN requires AS r ON r.followup = a.nr AND r.prerequisite = 5041
GROUP BY a.studid
HAVING count(DISTINCT a.nr) = (SELECT count(*) FROM requires WHERE prerequisite = 5041);`,
      expect: [{ studid: 28106 }],
    },
    theory: ['relational-algebra#division', 'relational-algebra#rename'],
    source: [R('35'), EN('35–36')],
    basis: 'derived',
  },
  {
    id: 'ra-outer-semi',
    title: 'Внешнее соединение и полусоединение',
    level: 2,
    statement: `
${DATA_NOTE}
1. Сколько строк в \`Professor ⟕ Lecture\` (по PersNr)? Какие строки содержат NULL?
2. Каких профессоров вернёт \`Professor ⋉ Lecture\`, а каких — «антисоединение» (профессора без курсов)?
`,
    answer: `
1. **12 строк:** 10 курсов (у каждого ровно один профессор) + по строке с NULL в атрибутах Lecture для **Коперника** и **Кюри**, у которых нет курсов.
2. \`⋉\`: Сократ, Рассел, Поппер, Августин, Кант (5 профессоров). Без курсов: Коперник и Кюри.
`,
    solution: `
Левое внешнее соединение сохраняет все строки левого отношения и дополняет несовпавшие NULL. Полусоединение возвращает только строки левого отношения, у которых есть совпадение, без столбцов правого. В SQL: \`LEFT JOIN\`, \`EXISTS\` и \`NOT EXISTS\`:
{{sql}}
`,
    sql: {
      fixture: 'uni-ra',
      code: `SELECT p.name
FROM professor AS p
WHERE NOT EXISTS (SELECT 1 FROM lecture AS l WHERE l.persnr = p.persnr)
ORDER BY p.name;`,
      expect: [{ name: 'Коперник' }, { name: 'Кюри' }],
    },
    theory: ['relational-algebra#outer-semi', 'sql-select#exists'],
    source: [R('27–30'), EN('28–31')],
    basis: 'derived',
  },
  {
    id: 'ra-product-size',
    title: 'Размер декартова произведения',
    level: 1,
    statement: `
${DATA_NOTE}
Сколько кортежей в \`Professor × attends\`? А в \`σ_{Professor.PersNr = Lecture.PersNr}(Professor × Lecture)\`?
`,
    answer: `
\`Professor × attends\`: 7 · 12 = **84** кортежа. Соединение Professor с Lecture по PersNr: **10** кортежей (у каждого курса один профессор).
`,
    solution: `
\`|L × R| = n·m\`. Большинство из 84 пар бессмысленны — поэтому произведение используют как промежуточный шаг соединения: выборка по условию связи превращает × в ⋈.
`,
    theory: ['relational-algebra#product-join'],
    source: [R('22–23')],
    basis: 'derived',
  },
  {
    id: 'ra-trc-write',
    title: 'Записать запрос в кортежном исчислении',
    level: 2,
    statement: `
Запишите в кортежном реляционном исчислении:
1. Профессора, у которых нет ни одного курса.
2. Студенты, посещающие все курсы, которые читает Сократ.
`,
    answer: `
1. \`{ p | p ∈ Professor ∧ ¬∃l ∈ Lecture: l.PersNr = p.PersNr }\`
2. \`{ s | s ∈ Student ∧ ∀l ∈ Lecture: (∃p ∈ Professor: p.PersNr = l.PersNr ∧ p.Name = "Сократ") ⇒ ∃a ∈ attends: a.Nr = l.Nr ∧ a.StudID = s.StudID }\`
`,
    solution: `
Оба выражения безопасны: свободная переменная пробегает существующее отношение (Professor, Student). Второе построено по образцу запроса лекции «все курсы по 4 CP» (∀ с импликацией). На данных Uni-DB первый запрос даёт Коперника и Кюри; второй — пустое множество: курсы Сократа 5041, 5049, 4052, и ни один студент не посещает все три.
`,
    theory: ['relational-algebra#calculus', 'relational-algebra#safety'],
    source: [R('36–38'), EN('37–38')],
    basis: 'derived',
  },
  {
    id: 'ra-safety',
    title: 'Безопасно ли выражение?',
    level: 1,
    statement: `
Какие выражения безопасны?
1. \`{ n | ¬(n ∈ Professor) }\`
2. \`{ p | p ∈ Professor ∧ ¬(p.Level = "FP") }\`
3. \`{ [p, n, l, r] | ¬([p, n, l, r] ∈ Professor) }\`
`,
    answer: `1 и 3 — **небезопасны**, 2 — **безопасно**.`,
    solution: `
1 и 3 — примеры небезопасных выражений из лекции: они описывают «всё, что не является строкой Professor», т. е. зависят от бесконечного универсального домена. В 2 переменная p ограничена отношением Professor, отрицание лишь фильтрует его строки, результат лежит в активном домене.
`,
    theory: ['relational-algebra#safety'],
    source: [R('39'), R('41'), EN('40'), EN('42')],
    basis: 'derived',
  },
];
