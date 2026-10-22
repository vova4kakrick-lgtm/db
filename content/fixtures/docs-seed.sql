-- Тестовые данные варианта В (время — относительно now()).
INSERT INTO users (name, email) VALUES
  ('Анна',  'anna@example.com'),   -- 1
  ('Борис', 'boris@example.com'),  -- 2
  ('Вера',  'vera@example.com'),   -- 3
  ('Глеб',  'gleb@example.com');   -- 4

INSERT INTO groups (name) VALUES ('Редакция');
INSERT INTO group_members VALUES (1, 3), (1, 4);   -- Вера и Глеб

INSERT INTO documents (document_id, owner_id, title, created_at) OVERRIDING SYSTEM VALUE VALUES
  (1,   1, 'План',          now() - interval '200 days'),
  (2,   2, 'Отчёт',         now() - interval '100 days'),
  (3,   3, 'Заметки',       now() - interval '90 days'),
  (123, 1, 'Спецификация',  now() - interval '60 days');
-- 26 документов Анны для задания о правах доступа
INSERT INTO documents (document_id, owner_id, title) OVERRIDING SYSTEM VALUE
SELECT g, 1, 'Документ ' || g FROM generate_series(200, 225) AS g;
SELECT setval(pg_get_serial_sequence('documents', 'document_id'), 1000);

-- Версии документа 123 с заданными id (для задания 7)
INSERT INTO document_versions (version_id, document_id, author_id, content, created_at) OVERRIDING SYSTEM VALUE VALUES
  (10, 123, 1, 'v10', now() - interval '20 days'),
  (11, 123, 2, 'v11', now() - interval '19 days'),
  (12, 123, 2, 'v12', now() - interval '18 days'),
  (13, 123, 3, 'v13', now() - interval '17 days'),
  (14, 123, 1, 'v14', now() - interval '16 days'),
  (15, 123, 2, 'v15', now() - interval '15 days'),
  (16, 123, 4, 'v16', now() - interval '14 days');
SELECT setval(pg_get_serial_sequence('document_versions', 'version_id'), 100);

-- «План»: 3 версии за последний месяц и 6 правок Анны три месяца назад (у Бориса только 3)
INSERT INTO document_versions (document_id, author_id, content, created_at) VALUES
  (1, 1, 'a', now() - interval '3 days'),
  (1, 3, 'b', now() - interval '2 days'),
  (1, 1, 'c', now() - interval '1 day');
INSERT INTO document_versions (document_id, author_id, content, created_at)
SELECT 1, 1, 'old', now() - interval '90 days' + g * interval '5 minutes' FROM generate_series(1, 6) AS g;
INSERT INTO document_versions (document_id, author_id, content, created_at)
SELECT 1, 2, 'old', now() - interval '90 days' + g * interval '7 minutes' FROM generate_series(1, 3) AS g;

-- «Отчёт»: 2 версии за последний месяц и «война правок» 40 дней назад: по 6 правок Анны и Бориса за 50 минут
INSERT INTO document_versions (document_id, author_id, content, created_at) VALUES
  (2, 2, 'x', now() - interval '5 days'),
  (2, 2, 'y', now() - interval '4 days');
INSERT INTO document_versions (document_id, author_id, content, created_at)
SELECT 2, CASE WHEN g % 2 = 0 THEN 1 ELSE 2 END, 'war',
       now() - interval '40 days' + g * interval '4 minutes'
FROM generate_series(1, 12) AS g;

-- Права: Борис — editor напрямую на 22 документа Анны; группа «Редакция» — editor на 21 документ
INSERT INTO permissions (document_id, user_id, role, granted_by)
SELECT g, 2, 'editor', 1 FROM generate_series(200, 221) AS g;
INSERT INTO permissions (document_id, group_id, role, granted_by)
SELECT g, 1, 'editor', 1 FROM generate_series(200, 220) AS g;
INSERT INTO permissions (document_id, user_id, role, granted_by) VALUES
  (200, 4, 'editor', 1),      -- Глеб: тот же документ и напрямую, и через группу
  (3,   3, 'editor', 3),      -- Вера — редактор своего документа (не считается)
  (123, 2, 'viewer', 1);

INSERT INTO comments (document_id, author_id, parent_id, body, created_at, resolved_at) VALUES
  (123, 2, NULL, 'Уточнить раздел 2', now() - interval '10 days', now() - interval '8 days'),                 -- 1
  (123, 3, NULL, 'Опечатка',          now() - interval '5 days',  now() - interval '4 days'),                 -- 2
  (1,   2, NULL, 'Добавить сроки',    now() - interval '3 days',  now() - interval '3 days' + interval '6 hours'), -- 3
  (1,   4, NULL, 'Кто отвечает?',     now() - interval '2 days',  NULL),                                      -- 4
  (123, 1, 1,    'Уточнила',          now() - interval '9 days',  NULL),                                      -- 5
  (123, 2, 5,    'Нужно ещё',         now() - interval '9 days',  NULL),                                      -- 6
  (123, 1, 6,    'Готово',            now() - interval '8 days',  NULL),                                      -- 7
  (1,   1, 3,    'Добавила',          now() - interval '2 days',  NULL);                                      -- 8
