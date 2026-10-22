const P = (pages) => ({ doc: 'l05', pages });
const D = (pages) => ({ doc: 'ddl', pages });

export default [
  {
    id: 'ddl-q-money',
    q: 'Какой тип выбрать для денег и почему не double precision?',
    a: '`numeric(p,s)` — точные десятичные числа без ошибок округления. `real`/`double precision` — плавающая точка для приближённых измерений; деньги в них хранить нельзя.',
    source: [P('5–6'), D('2')],
    theory: ['sql-ddl#types'],
  },
  {
    id: 'ddl-q-timestamptz',
    q: 'Чем `timestamp` отличается от `timestamptz`?',
    a: '`timestamp` — дата и время без семантики часового пояса («наивное», местное время). `timestamptz` — момент времени: хранится в UTC, конвертируется из часового пояса сессии при вставке и обратно при выборке. Для событий и аудита — `timestamptz`.',
    source: [P('8'), D('2')],
    theory: ['sql-ddl#types'],
  },
  {
    id: 'ddl-q-pk-unique',
    q: 'Чем PRIMARY KEY отличается от UNIQUE?',
    a: 'PRIMARY KEY = UNIQUE + NOT NULL и канонический идентификатор строки (один на таблицу). UNIQUE задаёт альтернативный ключ и по умолчанию допускает несколько NULL (если не указать NULLS NOT DISTINCT).',
    source: [P('12'), D('5')],
    theory: ['sql-ddl#constraints'],
  },
  {
    id: 'ddl-q-fk-actions',
    q: 'Перечислите ссылочные действия FOREIGN KEY. Какое действует по умолчанию?',
    a: 'NO ACTION (по умолчанию), RESTRICT, CASCADE, SET NULL, SET DEFAULT.',
    source: P('13'),
    theory: ['sql-ddl#fk-actions'],
  },
  {
    id: 'ddl-q-fk-index',
    q: 'Создаёт ли PostgreSQL индекс на столбце внешнего ключа автоматически?',
    a: 'Нет. PostgreSQL индексирует целевые PK/UNIQUE, но индекс на ссылающемся FK нужно создать самому (пример: `CREATE INDEX exam_examiner_idx ON exam(examiner_id)`).',
    source: [P('14'), P('15')],
    theory: ['sql-ddl#fk-actions'],
  },
  {
    id: 'ddl-q-identity-unique',
    q: 'Гарантирует ли identity-столбец уникальность значений?',
    a: 'Нет: identity означает NOT NULL, но уникальность обеспечивает только PRIMARY KEY или UNIQUE.',
    source: P('11'),
    theory: ['sql-ddl#identity'],
  },
  {
    id: 'ddl-q-uuid',
    q: 'Когда выбирать UUID вместо IDENTITY/SERIAL? Какие у UUID минусы?',
    a: 'Для распределённых систем, микросервисов, офлайн-режима и когда нельзя «перебирать» ID в URL: UUID глобально уникален, генерируется в приложении и не раскрывает порядок и количество записей. Минусы: 16 байт против 4/8 (больше индексы), чуть медленнее JOIN, неудобен человеку.',
    source: D('8'),
    theory: ['sql-ddl#identity'],
  },
  {
    id: 'ddl-q-truncate',
    q: 'Чем DELETE без WHERE отличается от TRUNCATE и DROP TABLE?',
    a: 'DELETE удаляет все строки по одной (медленно, откатывается в транзакции, триггеры срабатывают). TRUNCATE быстро «обнуляет» таблицу, триггеры удаления не срабатывают (в конспекте: в большинстве СУБД не откатывается). DROP TABLE удаляет и строки, и саму структуру таблицы.',
    source: D('6'),
    theory: ['sql-ddl#alter-drop'],
  },
  {
    id: 'ddl-q-trigger',
    q: 'Почему триггеры — «последний рубеж» для ограничений?',
    a: 'Сначала правило пытаются выразить через CHECK / UNIQUE / FK / EXCLUDE: триггеры хуже видны, сложнее тестируются и взаимодействуют друг с другом.',
    source: P('17'),
    theory: ['sql-ddl#triggers'],
  },
  {
    id: 'ddl-q-arrays',
    q: 'Когда в PostgreSQL уместны массивы и jsonb, а когда нет?',
    a: 'Массивы — для действительно атомарных списков, но не для скрытых связей M:N. jsonb — для гибких атрибутов, его можно запрашивать и индексировать, но он не заменяет реляционную модель.',
    source: P('9'),
    theory: ['sql-ddl#types'],
  },
  {
    id: 'ddl-q-migrations',
    q: 'Что такое «управление схемой как кодом»?',
    a: 'Изменения схемы оформляются миграционными скриптами (001_create_users_table.sql …), хранятся в Git вместе с кодом и применяются инструментами (Flyway, Liquibase, Alembic), а не руками в production-консоли.',
    source: D('8'),
    theory: ['sql-ddl#schema-objects'],
  },
];
