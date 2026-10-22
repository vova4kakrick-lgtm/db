const Q = (pages) => ({ doc: 'l06', pages });

export default [
  {
    id: 'adv-q-cte',
    q: 'Зачем нужен CTE и что означают MATERIALIZED / NOT MATERIALIZED?',
    a: 'CTE даёт имя шагу запроса и делает его читаемым. PostgreSQL может встроить CTE без побочных эффектов в основной запрос; MATERIALIZED / NOT MATERIALIZED позволяют переопределить этот выбор.',
    source: Q('18'),
    theory: ['sql-advanced#cte'],
  },
  {
    id: 'adv-q-recursive',
    q: 'Из каких частей состоит рекурсивный CTE?',
    a: 'Из нерекурсивной (стартовой) части и рекурсивной части, ссылающейся на сам CTE, объединённых через UNION [ALL]; рекурсивный шаг повторяется, пока появляются новые строки.',
    source: Q('19'),
    theory: ['sql-advanced#recursive'],
  },
  {
    id: 'adv-q-window',
    q: 'Чем оконная функция отличается от агрегата с GROUP BY?',
    a: 'Оконная функция не схлопывает строки: каждая строка остаётся, а к ней добавляется значение, вычисленное по окну (OVER (PARTITION BY … ORDER BY …)).',
    source: Q('14'),
    theory: ['sql-advanced#window'],
  },
  {
    id: 'adv-q-for-all',
    q: 'Как в SQL записать запрос «для всех» без операции деления?',
    a: 'Двойным NOT EXISTS («нет такого X, для которого нет пары») или через счётчики: GROUP BY + HAVING count(DISTINCT …) = (SELECT count(*) …).',
    source: Q('20'),
    theory: ['sql-advanced#for-all'],
  },
  {
    id: 'adv-q-distinct-on',
    q: 'Что делает DISTINCT ON и какое требование к ORDER BY?',
    a: 'Оставляет первую строку каждой группы по указанным выражениям; ORDER BY должен начинаться с тех же выражений, а дальше задаёт, какая строка будет первой (например, taken_at DESC NULLS LAST — последняя по времени).',
    source: Q('21'),
    theory: ['sql-advanced#pg-idioms'],
  },
  {
    id: 'adv-q-lateral',
    q: 'Что даёт LATERAL?',
    a: 'Подзапрос в FROM вычисляется для каждой внешней строки и может ссылаться на её столбцы — удобно для «топ-1 на строку» (LEFT JOIN LATERAL (… LIMIT 1) ON true).',
    source: Q('21'),
    theory: ['sql-advanced#pg-idioms'],
  },
  {
    id: 'adv-q-view-vs-mat',
    q: 'Чем VIEW отличается от MATERIALIZED VIEW?',
    a: 'VIEW хранит запрос, а не строки (данные всегда актуальны; простые VIEW обновляемы). MATERIALIZED VIEW физически хранит результат и обновляется явно через REFRESH MATERIALIZED VIEW.',
    source: Q('22'),
    theory: ['sql-advanced#views'],
  },
  {
    id: 'adv-q-check-option',
    q: 'Что делает WITH CHECK OPTION у представления?',
    a: 'Запрещает через фильтрованное обновляемое представление INSERT/UPDATE/MERGE, после которых строка исчезла бы из представления.',
    source: Q('22'),
    theory: ['sql-advanced#views'],
  },
  {
    id: 'adv-q-view-uses',
    q: 'Для чего используют представления по конспекту лекции 7?',
    a: 'Для упрощения сложных запросов (спрятать JOIN за простым представлением) и для безопасности (дать доступ только к определённым столбцам и строкам).',
    source: { doc: 'ddl', pages: '7' },
    theory: ['sql-advanced#views'],
  },
  {
    id: 'adv-q-explain',
    q: 'Чем опасен EXPLAIN ANALYZE?',
    a: 'Он реально выполняет запрос, поэтому для изменяющих данные команд нужна осторожность.',
    source: Q('24'),
    theory: ['sql-advanced#explain'],
  },
];
