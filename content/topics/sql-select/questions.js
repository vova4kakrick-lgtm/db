const Q = (pages) => ({ doc: 'l06', pages });

export default [
  {
    id: 'sel-q-order',
    q: 'Назовите логический порядок выполнения частей SELECT.',
    a: 'FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → WINDOW → ORDER BY → LIMIT.',
    source: Q('2'),
    theory: ['sql-select#pipeline'],
  },
  {
    id: 'sel-q-pagination',
    q: 'Что нужно для корректной пагинации через LIMIT/OFFSET?',
    a: 'Детерминированный ORDER BY.',
    source: Q('4'),
    theory: ['sql-select#select-basics'],
  },
  {
    id: 'sel-q-null-eq',
    q: 'Чему равно `NULL = NULL` и как правильно проверять NULL?',
    a: 'UNKNOWN (не TRUE). Проверять через IS NULL / IS NOT NULL; для «безопасного» равенства — IS [NOT] DISTINCT FROM.',
    source: Q('6'),
    theory: ['sql-select#null'],
  },
  {
    id: 'sel-q-not-in',
    q: 'В чём ловушка NOT IN?',
    a: 'Если подзапрос содержит NULL, NOT IN даёт UNKNOWN, и запрос не вернёт строк. NOT EXISTS безопаснее.',
    source: Q('6'),
    theory: ['sql-select#null', 'sql-select#exists'],
  },
  {
    id: 'sel-q-natural',
    q: 'Почему лекция советует избегать NATURAL JOIN и синтаксиса через запятую?',
    a: 'NATURAL JOIN соединяет по всем одноимённым столбцам — добавление такого столбца незаметно меняет смысл запроса. Явный JOIN … ON понятнее старого синтаксиса через запятую.',
    source: [Q('8'), Q('9')],
    theory: ['sql-select#joins'],
  },
  {
    id: 'sel-q-where-having',
    q: 'Чем WHERE отличается от HAVING?',
    a: 'WHERE фильтрует строки до группировки (агрегаты в нём недоступны), HAVING — группы после GROUP BY, по агрегатам.',
    source: Q('2'),
    theory: ['sql-select#group-by', 'sql-select#pipeline'],
  },
  {
    id: 'sel-q-filter',
    q: 'Что делает конструкция FILTER у агрегата?',
    a: 'Ограничивает строки, по которым считается конкретный агрегат, позволяя посчитать несколько агрегатов с разными условиями за один проход: `count(*) FILTER (WHERE credits >= 6)`.',
    source: Q('13'),
    theory: ['sql-select#group-by'],
  },
  {
    id: 'sel-q-subquery-kinds',
    q: 'Какие формы подзапросов перечислены в лекции?',
    a: 'Скалярный (одно значение), IN / ANY / ALL (сравнение с множеством, осторожно с NULL), EXISTS (существование строки, semi-join), коррелированный (ссылается на строку внешнего запроса).',
    source: Q('15'),
    theory: ['sql-select#subqueries'],
  },
  {
    id: 'sel-q-union',
    q: 'Чем UNION отличается от UNION ALL? Как в SQL записывается разность?',
    a: 'UNION удаляет дубликаты, UNION ALL сохраняет. Разность — EXCEPT (не MINUS).',
    source: Q('17'),
    theory: ['sql-select#set-ops'],
  },
  {
    id: 'sel-q-like',
    q: 'Чем LIKE отличается от ILIKE и оператора `~`?',
    a: 'LIKE — шаблон с учётом регистра; ILIKE — без учёта регистра (PostgreSQL); `~` — регулярное выражение, `!~*` — отрицательное регулярное выражение без учёта регистра.',
    source: Q('7'),
    theory: ['sql-select#text-match'],
  },
];
