// Демо-вариант контрольной: блог-платформа (previous_years/demo1.txt).
const DEMO = { doc: 'demo' };
const G = 'Демо-вариант: блог-платформа';
const FX = ['blog-schema', 'blog-seed'];

export default [
  {
    id: 'demo-q1',
    group: G,
    title: 'Демо 1. Концептуальная модель блог-платформы [2 балла]',
    level: 2,
    statement: `
Пользователи публикуют Статьи (заголовок, содержание, дата публикации, статус 'draft'/'published'). Статьи помечаются несколькими Тегами. Пользователи лайкают статьи и оставляют Комментарии; комментарий может быть ответом на другой комментарий (дерево). Пользователи подписываются на авторов. Система фиксирует Просмотры: какой пользователь, какую статью и когда просмотрел.

Спроектируйте концептуальную модель: сущности, атрибуты, ключи, связи, кардинальность.
`,
    answer: `
**Сущности (ключ, атрибуты):**
- **User** (user_id; username, email — уникальны);
- **Article** (article_id; title, content, status ∈ {draft, published}, published_at);
- **Tag** (tag_id; name — уникально);
- **Comment** (comment_id; body, created_at);
- **View** (view_id; viewed_at) — событие просмотра.

**Связи:**
- User 1 : N Article — «пишет» (у статьи ровно один автор);
- Article N : M Tag — «помечена»;
- User N : M Article — «лайкает» (не более одного лайка на пару);
- User 1 : N Comment — «пишет»; Article 1 : N Comment — «к статье»;
- Comment 1 : N Comment — «ответ на» (рекурсивная связь, роли «родитель»/«ответ»);
- User N : M User — «подписан на» (роли «подписчик»/«автор»);
- View: User 1 : N View, Article 1 : N View (один пользователь может смотреть статью много раз, поэтому просмотр — отдельная сущность-событие, а не пара в N:M).
`,
    solution: `
Как рассуждать (по темам курса):
- Каждое существительное с собственной идентичностью и связями — сущность ([эвристики](topic:er-uml#rules-of-thumb)); статус и дата — атрибуты статьи.
- Теги, лайки и подписки — классические N:M; подписка — рекурсивная связь, поэтому нужны [роли](topic:er-uml#er-elements).
- Дерево комментариев — рекурсивная 1:N (как «требует» у курсов, но 1:N).
- Просмотры: если бы фиксировался только факт «смотрел», хватило бы N:M; но нужно «когда» и возможны повторы — значит, ключ пары (user, article) не уникален, и просмотр моделируется как сущность-событие.
- Ограничение «дата публикации есть только у опубликованных» — бизнес-правило, которое в DDL станет \`CHECK\`.

Модель можно сдать текстом, как выше, или ER/UML-диаграммой.
`,
    theory: ['er-uml#er-elements', 'er-uml#cardinality', 'er-uml#rules-of-thumb', 'exam-practice#design-checklist'],
    source: [DEMO],
    basis: 'derived',
  },
  {
    id: 'demo-q2',
    group: G,
    title: 'Демо 2. CREATE TABLE для блог-платформы [2 балла]',
    level: 2,
    statement: `Напишите \`CREATE TABLE\` скрипты для модели из задания 1.`,
    answer: `
Таблицы: \`users\`, \`articles\` (FK author_id, CHECK статуса и даты), \`tags\`, \`article_tags\` (PK из двух FK), \`likes\` (PK (user_id, article_id)), \`comments\` (FK parent_id на comments), \`subscriptions\` (PK (follower_id, author_id), CHECK follower ≠ author), \`views\` (суррогатный ключ + viewed_at). Полный скрипт — в решении.
`,
    solution: `
{{sql}}
Пояснения к решениям:
- N:M → таблицы связей с составным PK ([правило 2](topic:relational-model#rule2)); 1:N → FK на стороне N ([правило 3](topic:relational-model#rule3)).
- Статусы — \`CHECK (status IN (…))\` (альтернатива — \`enum\`); согласованность статуса и даты — табличный \`CHECK\`.
- Ссылочные действия: лайки, комментарии, просмотры — составные части, удаляются каскадом ([FK](topic:sql-ddl#fk-actions)).
- Индексы на FK и на \`(article_id, viewed_at)\` — под запросы про просмотры.
- Не выражено в DDL: «комментарий-ответ относится к той же статье, что и родитель» — нужен триггер или составной FK \`(parent_id, article_id)\` на \`UNIQUE (comment_id, article_id)\`.
`,
    sql: { fixture: [], file: 'blog-schema' },
    theory: ['sql-ddl#constraints', 'sql-ddl#fk-actions', 'relational-model#rule2', 'exam-practice#design-checklist'],
    source: [DEMO],
    basis: 'derived',
  },
  {
    id: 'demo-q3',
    group: G,
    title: 'Демо 3. Топ-5 тегов по лайкам [1 балл]',
    level: 1,
    statement: `Найдите 5 самых популярных тегов по суммарному количеству лайков у статей с этими тегами.`,
    answer: `\`tags ⋈ article_tags ⋈ likes\`, \`GROUP BY\` тега, \`ORDER BY count(*) DESC LIMIT 5\`. На тестовых данных: postgres — 6, sql — 6, design — 3.`,
    solution: `
Каждый лайк статьи засчитывается каждому её тегу. Второй ключ сортировки делает результат детерминированным при равенстве.
{{sql}}
Если нужны и теги без лайков (с нулём), используйте \`LEFT JOIN\` и \`count(l.user_id)\`.
`,
    sql: {
      fixture: FX,
      code: `SELECT t.name, count(*) AS total_likes
FROM tags AS t
JOIN article_tags AS at ON at.tag_id = t.tag_id
JOIN likes AS l ON l.article_id = at.article_id
GROUP BY t.tag_id, t.name
ORDER BY total_likes DESC, t.name
LIMIT 5;`,
      expect: [
        { name: 'postgres', total_likes: 6 },
        { name: 'sql', total_likes: 6 },
        { name: 'design', total_likes: 3 },
      ],
    },
    theory: ['sql-select#group-by', 'sql-select#joins', 'exam-practice#query-patterns'],
    source: [DEMO],
    basis: 'derived',
  },
  {
    id: 'demo-q4',
    group: G,
    title: 'Демо 4. «Вирусные» статьи [1 балл]',
    level: 1,
    statement: `Найдите статьи, которые набрали более 1000 просмотров в первые 24 часа после публикации.`,
    answer: `Условие окна времени — в \`ON\`/\`WHERE\`, порог — в \`HAVING count(*) > 1000\`. На тестовых данных: «ER-моделирование» (1001) и «Оконные функции» (1100); «Нормализация» с ровно 1000 не проходит.`,
    solution: `
Арифметика дат: \`published_at + interval '24 hours'\` ([функции даты](topic:sql-ddl#schema-objects)). Полуинтервал \`[published_at, published_at + 24h)\` не считает просмотр ровно через сутки дважды.
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT a.article_id, a.title, count(*) AS views_24h
FROM articles AS a
JOIN views AS v
  ON v.article_id = a.article_id
 AND v.viewed_at >= a.published_at
 AND v.viewed_at <  a.published_at + interval '24 hours'
WHERE a.status = 'published'
GROUP BY a.article_id, a.title
HAVING count(*) > 1000
ORDER BY views_24h DESC;`,
      expect: [
        { article_id: 42, title: 'Оконные функции', views_24h: 1100 },
        { article_id: 3, title: 'ER-моделирование', views_24h: 1001 },
      ],
    },
    theory: ['sql-select#group-by', 'sql-ddl#schema-objects', 'exam-practice#query-patterns'],
    source: [DEMO],
    basis: 'derived',
  },
  {
    id: 'demo-q5',
    group: G,
    title: 'Демо 5. Среднее число комментариев на статью автора [1 балл]',
    level: 1,
    statement: `Постройте отчёт: для каждого автора — среднее количество комментариев на одну его статью.`,
    answer: `Сначала число комментариев на каждую статью (с \`LEFT JOIN\`, чтобы статьи без комментариев дали 0), затем \`avg\` по автору. Тестовые данные: alice 0.50, bob 2.00, carol 6.00.`,
    solution: `
Типичная ошибка — \`count(*)\` с обычным JOIN: статьи без комментариев выпадут и среднее завысится. Учитываются только опубликованные статьи (допущение; черновики не комментируют).
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `WITH per_article AS (
  SELECT a.author_id, a.article_id, count(c.comment_id) AS n_comments
  FROM articles AS a
  LEFT JOIN comments AS c ON c.article_id = a.article_id
  WHERE a.status = 'published'
  GROUP BY a.author_id, a.article_id
)
SELECT u.username, round(avg(p.n_comments), 2)::text AS avg_comments
FROM per_article AS p
JOIN users AS u ON u.user_id = p.author_id
GROUP BY u.user_id, u.username
ORDER BY u.username;`,
      expect: [
        { username: 'alice', avg_comments: '0.50' },
        { username: 'bob', avg_comments: '2.00' },
        { username: 'carol', avg_comments: '6.00' },
      ],
    },
    theory: ['sql-select#joins', 'sql-select#null', 'sql-advanced#cte'],
    source: [DEMO],
    basis: 'derived',
  },
  {
    id: 'demo-q6',
    group: G,
    title: 'Демо 6. «Молчаливые» подписчики [1 балл]',
    level: 1,
    statement: `Найдите пользователей, которые подписаны на автора, но не поставили ни одного лайка и не оставили ни одного комментария к его статьям.`,
    answer: `Пары (подписчик, автор) из \`subscriptions\` + два \`NOT EXISTS\`: нет лайка и нет комментария к статьям этого автора. Тестовые данные: dave → alice, eve → alice.`,
    solution: `
Шаблон anti-join ([NOT EXISTS](topic:sql-select#exists)): «ни одного» = «не существует». Проверяется по каждой паре подписки отдельно — подписчик может быть активен у одного автора и молчать у другого (dave комментировал bob, но молчит у alice).
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT f.username AS follower, au.username AS author
FROM subscriptions AS s
JOIN users AS f  ON f.user_id  = s.follower_id
JOIN users AS au ON au.user_id = s.author_id
WHERE NOT EXISTS (
        SELECT 1 FROM likes AS l
        JOIN articles AS a ON a.article_id = l.article_id
        WHERE l.user_id = s.follower_id AND a.author_id = s.author_id)
  AND NOT EXISTS (
        SELECT 1 FROM comments AS c
        JOIN articles AS a ON a.article_id = c.article_id
        WHERE c.user_id = s.follower_id AND a.author_id = s.author_id)
ORDER BY follower, author;`,
      expect: [
        { follower: 'dave', author: 'alice' },
        { follower: 'eve', author: 'alice' },
      ],
    },
    theory: ['sql-select#exists', 'exam-practice#query-patterns'],
    source: [DEMO],
    basis: 'derived',
  },
  {
    id: 'demo-q7',
    group: G,
    title: 'Демо 7. Рекомендованная статья для каждого пользователя [2 балла]',
    level: 3,
    statement: `Для каждого пользователя найдите «рекомендованную» статью — самую популярную (по лайкам) статью от автора, на которого он подписан, но которую он ещё не просматривал.`,
    answer: `Кандидаты = статьи авторов из подписок, без просмотров этим пользователем (\`NOT EXISTS\`); число лайков; затем «лучший в группе» через \`DISTINCT ON (user_id)\` (или \`row_number()\`). Тестовые данные: alice → «Оконные функции», bob → «Нормализация», dave → «Основы SQL», eve → «Основы SQL»; у carol рекомендации нет.`,
    solution: `
{{sql}}
- Лайки считаются коррелированным подзапросом, чтобы статьи без лайков тоже были кандидатами (с 0).
- При равенстве лайков (у dave «Основы SQL» и «ER-моделирование» по 2) берётся меньший article_id — правило нужно оговорить в ответе.
- Если нужно показать и пользователей без рекомендации (carol), используйте \`users LEFT JOIN LATERAL (… LIMIT 1)\` ([LATERAL](topic:sql-advanced#pg-idioms)).
`,
    sql: {
      fixture: FX,
      code: `WITH candidates AS (
  SELECT s.follower_id AS user_id, a.article_id, a.title,
         (SELECT count(*) FROM likes AS l WHERE l.article_id = a.article_id) AS likes
  FROM subscriptions AS s
  JOIN articles AS a
    ON a.author_id = s.author_id AND a.status = 'published'
  WHERE NOT EXISTS (
    SELECT 1 FROM views AS v
    WHERE v.user_id = s.follower_id AND v.article_id = a.article_id
  )
)
SELECT DISTINCT ON (c.user_id)
       u.username, c.title, c.likes
FROM candidates AS c
JOIN users AS u ON u.user_id = c.user_id
ORDER BY c.user_id, c.likes DESC, c.article_id;`,
      expect: [
        { username: 'alice', title: 'Оконные функции', likes: 4 },
        { username: 'bob', title: 'Нормализация', likes: 1 },
        { username: 'dave', title: 'Основы SQL', likes: 2 },
        { username: 'eve', title: 'Основы SQL', likes: 2 },
      ],
    },
    theory: ['sql-advanced#pg-idioms', 'sql-advanced#window', 'sql-select#exists', 'sql-advanced#cte'],
    source: [DEMO],
    basis: 'derived',
  },
  {
    id: 'demo-q8',
    group: G,
    title: 'Демо 8. Дерево комментариев с путём (до 3 уровней) [2 балла]',
    level: 3,
    statement: `Выведите все комментарии к статье \`article_id = 42\` на глубину до 3 уровней вложенности, показывая путь от родительского комментария (например, 'Текст комментария 1' -> 'Текст ответа 1.1').`,
    answer: `\`WITH RECURSIVE\`: старт — корневые комментарии статьи (\`parent_id IS NULL\`, depth = 1, path = body); шаг — ответы (\`c.parent_id = t.comment_id\`), depth + 1, path || ' -> ' || body, пока depth < 3. Тестовые данные: 5 строк, «Четвёртый уровень» не выводится.`,
    solution: `
{{sql}}
- Ограничение глубины ставится в рекурсивной части (\`WHERE t.depth < 3\`) — так рекурсия не уходит глубже, а не только фильтрует результат.
- Сортировка по \`path\` выводит ветку сразу после родителя (как дерево). Для надёжной сортировки при одинаковых текстах путь лучше строить из id (массив), это пояснение составителя.
`,
    sql: {
      fixture: FX,
      code: `WITH RECURSIVE thread AS (
  SELECT comment_id, body, 1 AS depth, body AS path
  FROM comments
  WHERE article_id = 42 AND parent_id IS NULL
  UNION ALL
  SELECT c.comment_id, c.body, t.depth + 1, t.path || ' -> ' || c.body
  FROM thread AS t
  JOIN comments AS c ON c.parent_id = t.comment_id
  WHERE t.depth < 3
)
SELECT depth, path
FROM thread
ORDER BY path;`,
      expect: [
        { depth: 1, path: 'Вопрос' },
        { depth: 2, path: 'Вопрос -> Ответ' },
        { depth: 1, path: 'Отличная статья' },
        { depth: 2, path: 'Отличная статья -> Спасибо' },
        { depth: 3, path: 'Отличная статья -> Спасибо -> Пожалуйста' },
      ],
    },
    theory: ['sql-advanced#recursive', 'exam-practice#query-patterns'],
    source: [DEMO],
    basis: 'derived',
  },
];
