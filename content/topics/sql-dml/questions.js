const P = (pages) => ({ doc: 'l05', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default [
  {
    id: 'dml-q-returning',
    q: 'Зачем нужен RETURNING?',
    a: 'Чтобы получить данные изменённых строк (например, сгенерированный ключ) в том же запросе, без второго обращения `SELECT CURRVAL(…)`, которое не всегда безопасно в конкурентной среде.',
    source: [P('19'), D('9')],
    theory: ['sql-dml#insert'],
  },
  {
    id: 'dml-q-race',
    q: 'Почему «SELECT, затем UPDATE или INSERT» — плохая реализация UPSERT?',
    a: 'Между SELECT и UPDATE/INSERT может вклиниться параллельная транзакция (состояние гонки). INSERT … ON CONFLICT выполняет операцию атомарно.',
    source: D('10–11'),
    theory: ['sql-dml#upsert'],
  },
  {
    id: 'dml-q-excluded',
    q: 'Что такое EXCLUDED в ON CONFLICT DO UPDATE?',
    a: 'Специальная ссылка на строку, которую пытались вставить; уже существующая строка доступна по имени таблицы.',
    source: D('11'),
    theory: ['sql-dml#upsert'],
  },
  {
    id: 'dml-q-merge-vs-upsert',
    q: 'Чем MERGE отличается от INSERT … ON CONFLICT?',
    a: 'MERGE — стандарт SQL с ветками WHEN MATCHED / WHEN NOT MATCHED, синтаксис сложнее. ON CONFLICT — специфичный для PostgreSQL компактный идиом UPSERT, требующий уникального ограничения для определения конфликта.',
    source: [P('20'), D('11')],
    theory: ['sql-dml#merge'],
  },
  {
    id: 'dml-q-pg-syntax',
    q: 'Какие расширения синтаксиса PostgreSQL для UPDATE и DELETE упомянуты в лекции?',
    a: '`UPDATE … FROM` и `DELETE … USING` — изменение строк по условию, использующему другие таблицы.',
    source: P('21'),
    theory: ['sql-dml#update', 'sql-dml#delete'],
  },
  {
    id: 'dml-q-soft',
    q: 'Перечислите плюсы и минусы «мягкого» удаления.',
    a: 'Плюсы: сохранение истории, лёгкое восстановление, сохранение ссылочной целостности. Минусы: усложнение запросов (везде WHERE DeletedAt IS NULL), «раздувание» таблиц, необходимость архивации.',
    source: D('10'),
    theory: ['sql-dml#delete'],
  },
  {
    id: 'dml-q-insert-select',
    q: 'Для чего используют INSERT … SELECT?',
    a: 'Для копирования и трансформации данных: архивация старых строк, построение агрегированных отчётных таблиц (например, продажи по месяцам).',
    source: D('10'),
    theory: ['sql-dml#insert'],
  },
  {
    id: 'dml-q-transaction',
    q: 'Зачем нужны транзакции BEGIN / COMMIT / ROLLBACK?',
    a: 'Для набора изменений, который должен выполниться целиком или не выполниться вообще.',
    source: P('22'),
    theory: ['sql-dml#transactions'],
  },
  {
    id: 'dml-q-isolation',
    q: 'Какие уровни изоляции транзакций существуют и чем они отличаются?',
    a: 'Уровни изоляции в просмотренных лекциях не разбираются (они относятся ко второй части курса «БД — взгляд изнутри»).',
    basis: 'not-found',
    source: { doc: 'l01', pages: '4' },
    theory: ['sql-dml#transactions'],
  },
];
