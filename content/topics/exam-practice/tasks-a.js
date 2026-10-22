// Мидтерм 2025, вариант А: SaaS-подписки.
const VA = { doc: 'varA' };
const G = 'Вариант А (2025): SaaS-сервис с подписками';
const FX = ['saas-schema', 'saas-seed'];

export default [
  {
    id: 'va-q1',
    group: G,
    title: 'А1. Концептуальная модель SaaS-сервиса [2 балла]',
    level: 2,
    statement: `
Клиенты регистрируются; у клиента несколько Организаций. Организация подписывается на один из Тарифных планов (название 'Free'/'Pro'/'Enterprise', месячная стоимость, ограничения \`max_users\`, \`max_storage_gb\`). Подписка связывает организацию с планом: дата начала, дата окончания, статус ('active', 'past_due', 'cancelled'); при продлении создаётся новая запись Subscription со сдвинутыми датами. Ежемесячно для каждой активной подписки генерируется Счёт (сумма, дата выставления, дата оплаты, статус 'pending'/'paid'/'failed'). В организацию приглашают Пользователей; их число не должно превышать лимит плана.

Спроектируйте концептуальную модель.
`,
    answer: `
- **Customer** (customer_id; name, email) 1 : N **Organization** (org_id; name).
- **Plan** (plan_id; name ∈ {Free, Pro, Enterprise}, monthly_price, max_users, max_storage_gb).
- **Subscription** (subscription_id; start_date, end_date, status): Organization 1 : N Subscription, Plan 1 : N Subscription. Это не просто связь N:M «организация — план»: у одной пары может быть много подписок во времени (продления), поэтому подписка — сущность со своим ключом.
- **Invoice** (invoice_id; amount, issued_at, paid_at, status): Subscription 1 : N Invoice.
- **User** (user_id; name, email) N : M Organization — «участник» (атрибут связи: invited_at).
- Ограничение «число пользователей ≤ max_users плана» — бизнес-правило между несколькими сущностями; в схеме данных не выражается кардинальностью.
`,
    solution: `
Ключевое решение — история подписок: «продление создаёт новую запись», значит, Subscription — сущность-событие с датами, а не атрибут организации и не N:M-пара. Текущий план организации вычисляется как подписка, покрывающая сегодняшнюю дату. Правило о лимите пользователей нельзя обеспечить ключами и доменами (см. [ДК/НФ](topic:higher-nf#dknf)) — его проверяют триггером или запросом (задание 3).
`,
    theory: ['er-uml#cardinality', 'er-uml#rules-of-thumb', 'higher-nf#dknf', 'exam-practice#design-checklist'],
    source: [VA],
    basis: 'derived',
  },
  {
    id: 'va-q2',
    group: G,
    title: 'А2. CREATE TABLE для SaaS-сервиса [2 балла]',
    level: 2,
    statement: `Напишите \`CREATE TABLE\` скрипты для модели из задания А1.`,
    answer: `Таблицы \`customers\`, \`organizations\`, \`plans\`, \`subscriptions\`, \`invoices\`, \`users\`, \`org_members\` с PK, FK, CHECK для статусов и дат. Полный скрипт — в решении.`,
    solution: `
{{sql}}
- Деньги — \`numeric(10,2)\`; даты подписок и счетов — \`date\` ([типы](topic:sql-ddl#types)).
- Статусы и названия планов — \`CHECK (… IN (…))\`; согласованность «оплачен ⇔ есть дата оплаты» — табличный \`CHECK\`.
- \`plans\` удалять при наличии подписок нельзя — \`ON DELETE RESTRICT\`.
- Лимит пользователей — только триггером ([триггеры](topic:sql-ddl#triggers)).
`,
    sql: { fixture: [], file: 'saas-schema' },
    theory: ['sql-ddl#constraints', 'sql-ddl#fk-actions', 'sql-ddl#triggers'],
    source: [VA],
    basis: 'derived',
  },
  {
    id: 'va-q3',
    group: G,
    title: 'А3. Организации на Pro, превысившие лимит пользователей [1 балл]',
    level: 1,
    statement: `Найдите все организации на тарифе 'Pro', которые превысили лимит по количеству пользователей.`,
    answer: `Текущая подписка на Pro (покрывает \`current_date\`) + число участников > \`max_users\`. Тестовые данные: «Альфа» — 6 участников при лимите 5.`,
    solution: `
«На тарифе» — значит, действующая сейчас подписка: \`current_date BETWEEN start_date AND end_date\` (статус можно дополнительно проверить). Число участников — агрегат, условие на него — в \`HAVING\`.
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT o.name, p.max_users, count(m.user_id) AS members
FROM organizations AS o
JOIN subscriptions AS s
  ON s.org_id = o.org_id
 AND current_date BETWEEN s.start_date AND s.end_date
JOIN plans AS p ON p.plan_id = s.plan_id AND p.name = 'Pro'
JOIN org_members AS m ON m.org_id = o.org_id
GROUP BY o.org_id, o.name, p.max_users
HAVING count(m.user_id) > p.max_users;`,
      expect: [{ name: 'Альфа', max_users: 5, members: 6 }],
    },
    theory: ['sql-select#group-by', 'sql-select#joins'],
    source: [VA],
    basis: 'derived',
  },
  {
    id: 'va-q4',
    group: G,
    title: 'А4. Клиенты с просроченным платежом [1 балл]',
    level: 1,
    statement: `Найдите всех клиентов, у которых есть хотя бы одна организация с просроченным платежом (счёт в статусе 'pending' или 'failed' более 10 дней).`,
    answer: `\`EXISTS\` по цепочке организация → подписка → счёт со статусом \`IN ('pending', 'failed')\` и \`issued_at < current_date - 10\`. Тестовые данные: Петров (счёт «Гаммы» failed 15 дней назад); pending-счёт «Альфы» 5-дневной давности не просрочен.`,
    solution: `
«Хотя бы одна» — semi-join через \`EXISTS\`, без дублей клиентов ([EXISTS](topic:sql-select#exists)). Для \`date\` вычитание целого числа даёт дату на столько дней раньше.
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT c.name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM organizations AS o
  JOIN subscriptions AS s ON s.org_id = o.org_id
  JOIN invoices AS i ON i.subscription_id = s.subscription_id
  WHERE o.customer_id = c.customer_id
    AND i.status IN ('pending', 'failed')
    AND i.issued_at < current_date - 10
)
ORDER BY c.name;`,
      expect: [{ name: 'Петров' }],
    },
    theory: ['sql-select#exists', 'sql-ddl#schema-objects'],
    source: [VA],
    basis: 'derived',
  },
  {
    id: 'va-q5',
    group: G,
    title: 'А5. Отчёт MRR за последние 6 месяцев [1 балл]',
    level: 2,
    statement: `Постройте отчёт «Ежемесячный повторяющийся доход» (MRR) за последние 6 месяцев. MRR за месяц — суммарная стоимость всех подписок, которые были активны в этом месяце.`,
    answer: `Сгенерировать 6 месяцев (текущий и 5 предыдущих), для каждого сложить \`monthly_price\` подписок, интервал которых пересекается с месяцем: \`start_date <= конец месяца AND end_date >= начало месяца\`. Тестовые данные: 600, 600, 600, 1050, 1050, 550.`,
    solution: `
{{sql}}
- «Активна в месяце» = интервалы пересекаются; статус не используем, т. к. завершённая сейчас подписка («cancelled») могла быть активна в прошлом.
- \`LEFT JOIN\` нужен, чтобы месяц без подписок дал 0, а не исчез (\`COALESCE\`).
- **Допущение:** «последние 6 месяцев» = текущий и 5 предыдущих; если имеются в виду 6 завершённых месяцев — сдвиньте ряд на месяц.
- \`generate_series\` для ряда месяцев в лекциях **не встречается** (В материалах курса не найдено) — это функция PostgreSQL. Без неё ряд месяцев можно получить рекурсивным CTE ([WITH RECURSIVE](topic:sql-advanced#recursive)): старт \`date_trunc('month', current_date) - interval '5 months'\`, шаг \`+ interval '1 month'\`.
`,
    sql: {
      fixture: FX,
      code: `WITH months AS (
  SELECT g::date AS month_start,
         (g + interval '1 month')::date - 1 AS month_end
  FROM generate_series(date_trunc('month', current_date) - interval '5 months',
                       date_trunc('month', current_date),
                       interval '1 month') AS g
)
SELECT m.month_start,
       COALESCE(sum(p.monthly_price), 0) AS mrr
FROM months AS m
LEFT JOIN subscriptions AS s
  ON s.start_date <= m.month_end AND s.end_date >= m.month_start
LEFT JOIN plans AS p ON p.plan_id = s.plan_id
GROUP BY m.month_start
ORDER BY m.month_start;`,
      expect: [
        { mrr: '600.00' },
        { mrr: '600.00' },
        { mrr: '600.00' },
        { mrr: '1050.00' },
        { mrr: '1050.00' },
        { mrr: '550.00' },
      ],
    },
    theory: ['sql-select#group-by', 'sql-advanced#cte', 'sql-advanced#recursive', 'exam-practice#beyond-materials'],
    source: [VA],
    basis: 'derived',
  },
  {
    id: 'va-q6',
    group: G,
    title: 'А6. Отток клиентов за прошлый месяц [1 балл]',
    level: 2,
    statement: `Найдите «отток» клиентов (Churn): «оттёкшим» в прошлом месяце считается клиент, чья последняя активная подписка закончилась в прошлом месяце, и новая не была начата.`,
    answer: `Для каждого клиента — максимальная \`end_date\` по подпискам всех его организаций; она должна попасть в прошлый месяц, и не должно быть подписки, начавшейся после неё. Тестовые данные: Сидорова.`,
    solution: `
{{sql}}
- Уровень — **клиент**, а не организация: у клиента может быть несколько организаций.
- Прошлый месяц: \`[date_trunc('month', current_date) - interval '1 month', date_trunc('month', current_date))\`.
- Условие «новая не начата» здесь следует из того, что \`max(end_date)\` уже в прошлом месяце (любая новая подписка закончилась бы позже); для наглядности можно добавить \`NOT EXISTS\` по подпискам со \`start_date > max(end_date)\`.
`,
    sql: {
      fixture: FX,
      code: `WITH last_sub AS (
  SELECT o.customer_id, max(s.end_date) AS last_end
  FROM organizations AS o
  JOIN subscriptions AS s ON s.org_id = o.org_id
  GROUP BY o.customer_id
)
SELECT c.name, l.last_end
FROM last_sub AS l
JOIN customers AS c USING (customer_id)
WHERE l.last_end >= date_trunc('month', current_date) - interval '1 month'
  AND l.last_end <  date_trunc('month', current_date);`,
      expect: [{ name: 'Сидорова' }],
    },
    theory: ['sql-advanced#cte', 'sql-select#group-by', 'sql-ddl#schema-objects'],
    source: [VA],
    basis: 'derived',
  },
  {
    id: 'va-q7',
    group: G,
    title: 'А7. Переходы клиентов между тарифами [2 балла]',
    level: 3,
    statement: `Постройте отчёт о «движении» клиентов между тарифами: колонки \`старый_тариф\`, \`новый_тариф\`, \`количество_переходов\` за всё время.`,
    answer: `Для каждой подписки найти **следующую** подписку той же организации (по \`start_date\`) — через \`LATERAL (… ORDER BY start_date LIMIT 1)\`; сгруппировать пары планов, где план изменился. Тестовые данные: Free → Pro — 1, Pro → Enterprise — 1 (продления Pro → Pro не считаются переходом).`,
    solution: `
{{sql}}
- «Следующая подписка» — классическая задача «для каждой строки найти одну связанную»; в курсе для этого есть \`LATERAL\` ([идиомы PostgreSQL](topic:sql-advanced#pg-idioms)). Короче — оконная функция \`lead(plan_id) OVER (PARTITION BY org_id ORDER BY start_date)\`, но \`lead\` на слайдах не разбирается.
- **Допущение:** продление на том же тарифе — не «движение»; если считать и его, уберите условие \`cur.plan_id <> nxt.plan_id\`.
`,
    sql: {
      fixture: FX,
      code: `SELECT p_old.name AS "старый_тариф",
       p_new.name AS "новый_тариф",
       count(*)   AS "количество_переходов"
FROM subscriptions AS cur
JOIN LATERAL (
  SELECT s.plan_id
  FROM subscriptions AS s
  WHERE s.org_id = cur.org_id AND s.start_date > cur.start_date
  ORDER BY s.start_date
  LIMIT 1
) AS nxt ON true
JOIN plans AS p_old ON p_old.plan_id = cur.plan_id
JOIN plans AS p_new ON p_new.plan_id = nxt.plan_id
WHERE cur.plan_id <> nxt.plan_id
GROUP BY p_old.name, p_new.name
ORDER BY 3 DESC, 1, 2;`,
      expect: [
        { 'старый_тариф': 'Free', 'новый_тариф': 'Pro', 'количество_переходов': 1 },
        { 'старый_тариф': 'Pro', 'новый_тариф': 'Enterprise', 'количество_переходов': 1 },
      ],
    },
    theory: ['sql-advanced#pg-idioms', 'sql-select#group-by', 'exam-practice#beyond-materials'],
    source: [VA],
    basis: 'derived',
  },
  {
    id: 'va-q8',
    group: G,
    title: 'А8. Непрерывно платные более 730 дней (перерывы ≤ 7 дней) [2 балла]',
    level: 3,
    statement: `Найдите все организации, которые непрерывно являются платными клиентами (любой тариф, кроме 'Free') более двух лет (730 дней) подряд, даже если у них были перерывы в подписках не более 7 дней.`,
    answer: `Склеить платные подписки организации в «цепочки», где следующая начинается не позже чем через 7 дней после окончания предыдущей (рекурсивный CTE), и выбрать цепочки, которые покрывают сегодняшний день и длятся больше 730 дней. Тестовые данные: «Альфа» (Pro с перерывом 3 дня, около 30 месяцев).`,
    solution: `
{{sql}}
- Перерыв в днях между подписками: \`next.start_date - prev.end_date - 1\`; «не более 7» ⇔ \`next.start_date <= prev.end_date + 8\`.
- Начало цепочки — платная подписка, перед которой нет платной, закончившейся не раньше чем за 7 дней (\`NOT EXISTS\`).
- Рекурсивный шаг продлевает \`chain_end\`, пока находится следующая подписка; \`chain_end\` строго растёт, поэтому рекурсия конечна.
- **Допущение:** «являются» — в настоящем времени: цепочка должна покрывать \`current_date\`, длительность считается до сегодня.
- Это задача типа «gaps and islands»; в общем виде её решают оконными функциями (\`lag\`, накопительная сумма), которых на слайдах нет — поэтому здесь использован рекурсивный CTE из лекции.
`,
    sql: {
      fixture: FX,
      code: `WITH RECURSIVE paid AS (
  SELECT s.org_id, s.start_date, s.end_date
  FROM subscriptions AS s
  JOIN plans AS p ON p.plan_id = s.plan_id
  WHERE p.name <> 'Free'
),
chain AS (
  SELECT a.org_id, a.start_date AS chain_start, a.end_date AS chain_end
  FROM paid AS a
  WHERE NOT EXISTS (
    SELECT 1 FROM paid AS b
    WHERE b.org_id = a.org_id
      AND b.start_date < a.start_date
      AND b.end_date >= a.start_date - 8
  )
  UNION
  SELECT c.org_id, c.chain_start, n.end_date
  FROM chain AS c
  JOIN paid AS n
    ON n.org_id = c.org_id
   AND n.start_date >  c.chain_start
   AND n.start_date <= c.chain_end + 8
   AND n.end_date   >  c.chain_end
)
SELECT o.name,
       min(c.chain_start) AS paid_since,
       current_date - min(c.chain_start) + 1 AS days_paid
FROM chain AS c
JOIN organizations AS o USING (org_id)
WHERE c.chain_end >= current_date
  AND c.chain_start <= current_date
GROUP BY o.org_id, o.name
HAVING current_date - min(c.chain_start) + 1 > 730;`,
      expect: [{ name: 'Альфа' }],
    },
    theory: ['sql-advanced#recursive', 'sql-select#exists', 'exam-practice#beyond-materials'],
    source: [VA],
    basis: 'derived',
  },
];
