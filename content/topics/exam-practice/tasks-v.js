// Мидтерм 2025, вариант В: совместное редактирование документов.
const VV = { doc: 'varV' };
const G = 'Вариант В (2025): совместное редактирование документов';
const FX = ['docs-schema', 'docs-seed'];

export default [
  {
    id: 'vv-q1',
    group: G,
    title: 'В1. Концептуальная модель сервиса документов [2 балла]',
    level: 2,
    statement: `
Пользователи создают Документы (заголовок, содержимое). Каждое изменение не перезаписывает документ, а создаёт новую Версию (полное содержимое, автор изменения, метка времени). Пользователи выдают Права доступа другим пользователям или группам ('viewer', 'commenter', 'editor'). Пользователи оставляют Комментарии к документу; комментарий может быть привязан к фрагменту текста (начальный и конечный индекс), может быть «разрешён» (resolved) и может быть ответом на другой комментарий.

Спроектируйте концептуальную модель.
`,
    answer: `
- **User** (user_id; name, email); **Group** (group_id; name); User N : M Group — «состоит в».
- **Document** (document_id; title, content, created_at); User 1 : N Document — «создал» (владелец).
- **DocumentVersion** (version_id; content, created_at): Document 1 : N Version, User 1 : N Version — «автор изменения». Можно моделировать как слабую сущность документа (ключ document_id + номер версии) — или с собственным id.
- **Permission** (role ∈ {viewer, commenter, editor}): связь Document с **либо** User, **либо** Group — две связи N:M с атрибутом role или одна сущность с ограничением «ровно один получатель».
- **Comment** (comment_id; body, start_idx, end_idx, created_at, resolved_at): Document 1 : N Comment, User 1 : N Comment, Comment 1 : N Comment — «ответ на».
`,
    solution: `
- Версии — история изменений: сущность с меткой времени, а не атрибут документа. Поле \`content\` в Document — текущее состояние; это осознанная избыточность (копия последней версии), см. [денормализацию](topic:normalization#denormalization). Можно его не хранить и брать последнюю версию.
- «Пользователям или группам» — получатель права бывает двух типов. Варианты: две таблицы прав (user_permissions, group_permissions) или одна таблица с двумя nullable FK и \`CHECK\` «ровно один». Альтернатива через [обобщение](topic:er-uml#generalization): общий надтип «Субъект доступа».
- «Разрешён» — атрибут resolved_at (NULL = не разрешён) — сразу даёт время жизни для задания 5.
`,
    theory: ['er-uml#cardinality', 'er-uml#weak-entities', 'er-uml#generalization', 'exam-practice#design-checklist'],
    source: [VV],
    basis: 'derived',
  },
  {
    id: 'vv-q2',
    group: G,
    title: 'В2. CREATE TABLE для сервиса документов [2 балла]',
    level: 2,
    statement: `Напишите \`CREATE TABLE\` скрипты для модели из задания В1.`,
    answer: `Таблицы \`users\`, \`groups\`, \`group_members\`, \`documents\`, \`document_versions\`, \`permissions\` (user_id или group_id, CHECK «ровно один»), \`comments\` (parent_id, индексы фрагмента, resolved_at). Полный скрипт — в решении.`,
    solution: `
{{sql}}
- \`CHECK (num_nonnulls(user_id, group_id) = 1)\` — получатель права ровно один (функция \`num_nonnulls\` на слайдах не встречается; эквивалент: \`(user_id IS NULL) <> (group_id IS NULL)\`).
- \`UNIQUE NULLS NOT DISTINCT\` — одно право на пару «документ — получатель», несмотря на NULL ([UNIQUE и NULL](topic:sql-ddl#constraints)).
- \`CHECK\` для индексов фрагмента и \`resolved_at >= created_at\`.
- Документ с версиями удалять каскадом; автора версии — \`RESTRICT\` (история не должна терять авторов).
`,
    sql: { fixture: [], file: 'docs-schema' },
    theory: ['sql-ddl#constraints', 'sql-ddl#fk-actions'],
    source: [VV],
    basis: 'derived',
  },
  {
    id: 'vv-q3',
    group: G,
    title: 'В3. Топ-10 активно редактируемых документов за месяц [1 балл]',
    level: 1,
    statement: `Найдите 10 самых активно редактируемых документов (по количеству версий за последний месяц).`,
    answer: `Фильтр \`created_at >= now() - interval '1 month'\`, \`GROUP BY\` документа, \`ORDER BY count(*) DESC LIMIT 10\`. Тестовые данные: «Спецификация» — 7, «План» — 3, «Отчёт» — 2 («война правок» 40 дней назад не считается).`,
    solution: `
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT d.document_id, d.title, count(*) AS versions
FROM document_versions AS v
JOIN documents AS d ON d.document_id = v.document_id
WHERE v.created_at >= now() - interval '1 month'
GROUP BY d.document_id, d.title
ORDER BY versions DESC, d.document_id
LIMIT 10;`,
      expect: [
        { document_id: 123, title: 'Спецификация', versions: 7 },
        { document_id: 1, title: 'План', versions: 3 },
        { document_id: 2, title: 'Отчёт', versions: 2 },
      ],
    },
    theory: ['sql-select#group-by', 'sql-ddl#schema-objects'],
    source: [VV],
    basis: 'derived',
  },
  {
    id: 'vv-q4',
    group: G,
    title: 'В4. Редакторы более чем 20 чужих документов [1 балл]',
    level: 2,
    statement: `Найдите всех пользователей, у которых есть доступ 'editor' к более чем 20 документам, которые они не создавали.`,
    answer: `Объединить права, выданные напрямую, и права через группы (\`UNION\`), отбросить свои документы, посчитать \`count(DISTINCT document_id) > 20\`. Тестовые данные: Борис — 22, Вера — 21, Глеб — 21 (документ 200 у Глеба и напрямую, и через группу — считается один раз).`,
    solution: `
{{sql}}
- Доступ через группу — частый подвох: без него Вера и Глеб не попали бы в ответ.
- \`count(DISTINCT …)\` защищает от двойного учёта одного документа ([шаблон «для всех»](topic:sql-advanced#for-all) использует ту же идею).
`,
    sql: {
      fixture: FX,
      code: `WITH editor_access AS (
  SELECT p.user_id, p.document_id
  FROM permissions AS p
  WHERE p.role = 'editor' AND p.user_id IS NOT NULL
  UNION
  SELECT gm.user_id, p.document_id
  FROM permissions AS p
  JOIN group_members AS gm ON gm.group_id = p.group_id
  WHERE p.role = 'editor'
)
SELECT u.name, count(DISTINCT ea.document_id) AS docs
FROM editor_access AS ea
JOIN documents AS d ON d.document_id = ea.document_id
JOIN users AS u ON u.user_id = ea.user_id
WHERE d.owner_id <> ea.user_id
GROUP BY u.user_id, u.name
HAVING count(DISTINCT ea.document_id) > 20
ORDER BY docs DESC, u.name;`,
      expect: [
        { name: 'Борис', docs: 22 },
        { name: 'Вера', docs: 21 },
        { name: 'Глеб', docs: 21 },
      ],
    },
    theory: ['sql-select#set-ops', 'sql-select#group-by', 'sql-advanced#cte'],
    source: [VV],
    basis: 'derived',
  },
  {
    id: 'vv-q5',
    group: G,
    title: 'В5. Среднее время жизни комментария до resolve [1 балл]',
    level: 1,
    statement: `Постройте отчёт: среднее время «жизни» неразрешённого комментария (от создания до «resolve») в разрезе документов.`,
    answer: `Для разрешённых комментариев (\`resolved_at IS NOT NULL\`) — \`avg(resolved_at - created_at)\` по документу. Тестовые данные: «План» — 6 часов, «Спецификация» — 1 день 12 часов.`,
    solution: `
Разность двух \`timestamptz\` — \`interval\`, по нему работает \`avg\`. Комментарии, которые ещё не разрешены, время жизни пока не имеют — они исключаются (их можно учесть отдельно, подставив \`now()\`: \`COALESCE(resolved_at, now())\`).
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT d.title, avg(c.resolved_at - c.created_at)::text AS avg_lifetime
FROM comments AS c
JOIN documents AS d ON d.document_id = c.document_id
WHERE c.resolved_at IS NOT NULL
GROUP BY d.document_id, d.title
ORDER BY d.document_id;`,
      expect: [
        { title: 'План', avg_lifetime: '06:00:00' },
        { title: 'Спецификация', avg_lifetime: '1 day 12:00:00' },
      ],
    },
    theory: ['sql-select#group-by', 'sql-ddl#types'],
    source: [VV],
    basis: 'derived',
  },
  {
    id: 'vv-q6',
    group: G,
    title: 'В6. «Войны правок» пользователей 1 и 2 [1 балл]',
    level: 3,
    statement: `Найдите «войны правок» — документы, в которых два пользователя (user_id = 1 и user_id = 2) внесли более 5 правок каждый в течение одного часа.`,
    answer: `Кандидаты на начало часового окна — моменты правок этих пользователей; для окна \`[t, t + 1 час]\` считаем правки каждого (\`FILTER\`) и требуем > 5 у обоих. Тестовые данные: «Отчёт» (по 6 правок Анны и Бориса за 48 минут); в «Плане» у Бориса только 3 правки.`,
    solution: `
{{sql}}
- Окно привязывается к каждой правке пользователей 1 и 2 (self-join таблицы версий с условием по времени) — так перебираются все часовые интервалы, где что-то происходило.
- \`FILTER\` считает правки каждого пользователя за один проход ([FILTER](topic:sql-select#group-by)).
`,
    sql: {
      fixture: FX,
      code: `SELECT DISTINCT d.document_id, d.title
FROM document_versions AS w                     -- начало окна
JOIN document_versions AS v
  ON v.document_id = w.document_id
 AND v.created_at BETWEEN w.created_at AND w.created_at + interval '1 hour'
 AND v.author_id IN (1, 2)
JOIN documents AS d ON d.document_id = w.document_id
WHERE w.author_id IN (1, 2)
GROUP BY d.document_id, d.title, w.version_id
HAVING count(*) FILTER (WHERE v.author_id = 1) > 5
   AND count(*) FILTER (WHERE v.author_id = 2) > 5;`,
      expect: [{ document_id: 2, title: 'Отчёт' }],
    },
    theory: ['sql-select#group-by', 'sql-select#joins'],
    source: [VV],
    basis: 'derived',
  },
  {
    id: 'vv-q7',
    group: G,
    title: 'В7. Авторы изменений между версиями 10 и 15 [2 балла]',
    level: 2,
    statement: `Для документа \`document_id = 123\` и двух его версий (\`version_id = 10\` и \`version_id = 15\`) найдите всех пользователей, которые внесли хотя бы одно изменение между этими версиями (включительно).`,
    answer: `Взять моменты создания версий 10 и 15 и выбрать различных авторов версий документа 123 с \`created_at\` между ними. Тестовые данные: Анна, Борис, Вера (Глеб правил после версии 15).`,
    solution: `
«Между версиями» надёжнее определять по времени создания, а не по числовым id: суррогатный ключ не обязан отражать порядок (например, при импорте). Если гарантировано, что id растут со временем, можно и \`version_id BETWEEN 10 AND 15\`.
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT DISTINCT u.name
FROM document_versions AS v
JOIN users AS u ON u.user_id = v.author_id
WHERE v.document_id = 123
  AND v.created_at BETWEEN
        (SELECT created_at FROM document_versions WHERE version_id = 10 AND document_id = 123)
    AND (SELECT created_at FROM document_versions WHERE version_id = 15 AND document_id = 123)
ORDER BY u.name;`,
      expect: [{ name: 'Анна' }, { name: 'Борис' }, { name: 'Вера' }],
    },
    theory: ['sql-select#subqueries'],
    source: [VV],
    basis: 'derived',
  },
  {
    id: 'vv-q8',
    group: G,
    title: 'В8. Самые длинные цепочки ответов [2 балла]',
    level: 3,
    statement: `Найдите самые длинные цепочки ответов в комментариях (наибольшая глубина вложенности) по всей системе.`,
    answer: `Рекурсивный CTE от корневых комментариев (\`parent_id IS NULL\`) с \`depth + 1\` на каждом шаге; выбрать цепочки с \`depth = max(depth)\`. Тестовые данные: документ 123, цепочка 1 → 5 → 6 → 7, глубина 4.`,
    solution: `
{{sql}}
- Сохраняем корень (\`root_id\`) и путь, чтобы показать саму цепочку.
- «Самые длинные» — все цепочки с максимальной глубиной (может быть несколько), поэтому сравнение с \`max\` в подзапросе, а не \`LIMIT 1\`.
`,
    sql: {
      fixture: FX,
      code: `WITH RECURSIVE chain AS (
  SELECT comment_id, document_id, comment_id AS root_id,
         1 AS depth, comment_id::text AS path
  FROM comments
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.comment_id, c.document_id, ch.root_id,
         ch.depth + 1, ch.path || ' -> ' || c.comment_id
  FROM chain AS ch
  JOIN comments AS c ON c.parent_id = ch.comment_id
)
SELECT document_id, root_id, comment_id AS leaf_id, depth, path
FROM chain
WHERE depth = (SELECT max(depth) FROM chain);`,
      expect: [{ document_id: 123, root_id: 1, leaf_id: 7, depth: 4, path: '1 -> 5 -> 6 -> 7' }],
    },
    theory: ['sql-advanced#recursive'],
    source: [VV],
    basis: 'derived',
  },
];
