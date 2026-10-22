-- Тестовые данные для запросов демо-варианта (время задано относительно now()).
INSERT INTO users (username, email) VALUES
  ('alice', 'alice@example.com'),   -- 1
  ('bob',   'bob@example.com'),     -- 2
  ('carol', 'carol@example.com'),   -- 3
  ('dave',  'dave@example.com'),    -- 4
  ('eve',   'eve@example.com'),     -- 5
  ('guest', 'guest@example.com');   -- 6: «массовые» просмотры

INSERT INTO articles (article_id, author_id, title, content, status, published_at) OVERRIDING SYSTEM VALUE VALUES
  (1,  1, 'Основы SQL',        '...', 'published', now() - interval '10 days'),
  (2,  1, 'Нормализация',      '...', 'published', now() - interval '5 days'),
  (3,  2, 'ER-моделирование',  '...', 'published', now() - interval '3 days'),
  (4,  2, 'Черновик',          '...', 'draft',     NULL),
  (42, 3, 'Оконные функции',   '...', 'published', now() - interval '2 days');
SELECT setval(pg_get_serial_sequence('articles', 'article_id'), 100);

INSERT INTO tags (name) VALUES ('sql'), ('design'), ('postgres');
INSERT INTO article_tags VALUES (1, 1), (1, 3), (2, 2), (3, 2), (42, 1), (42, 3);

INSERT INTO likes (user_id, article_id) VALUES
  (2, 1), (3, 1),                 -- «Основы SQL»: 2 лайка
  (2, 2),                         -- «Нормализация»: 1
  (1, 3), (3, 3),                 -- «ER-моделирование»: 2
  (1, 42), (2, 42), (4, 42), (5, 42);  -- «Оконные функции»: 4

INSERT INTO comments (article_id, user_id, parent_id, body) VALUES
  (42, 2, NULL, 'Отличная статья'),   -- 1
  (42, 1, 1,    'Спасибо'),           -- 2
  (42, 2, 2,    'Пожалуйста'),        -- 3
  (42, 4, 3,    'Четвёртый уровень'), -- 4 (глубже 3 уровней)
  (42, 5, NULL, 'Вопрос'),            -- 5
  (42, 3, 5,    'Ответ'),             -- 6
  (1,  3, NULL, 'Полезно'),           -- 7
  (3,  1, NULL, 'Хорошо'),            -- 8
  (3,  4, NULL, 'Согласен');          -- 9

INSERT INTO subscriptions (follower_id, author_id) VALUES
  (2, 1), (3, 1), (4, 1), (5, 1),  -- на alice
  (1, 3), (5, 3),                  -- на carol
  (4, 2);                          -- на bob

-- Просмотры «реальных» пользователей
INSERT INTO views (user_id, article_id, viewed_at) VALUES
  (2, 1,  now() - interval '9 days'),
  (3, 1,  now() - interval '9 days'),
  (3, 2,  now() - interval '4 days'),
  (5, 42, now() - interval '1 day');

-- Массовые просмотры для задачи о «вирусных» статьях (пользователь guest)
INSERT INTO views (user_id, article_id, viewed_at)
SELECT 6, 3, a.published_at + g * interval '1 minute'          -- 1001 за первые сутки
FROM articles a, generate_series(1, 1001) g WHERE a.article_id = 3;
INSERT INTO views (user_id, article_id, viewed_at)
SELECT 6, 42, a.published_at + g * interval '1 minute'         -- 1100 за первые сутки
FROM articles a, generate_series(1, 1100) g WHERE a.article_id = 42;
INSERT INTO views (user_id, article_id, viewed_at)
SELECT 6, 2, a.published_at + g * interval '1 minute'          -- ровно 1000 за сутки
FROM articles a, generate_series(1, 1000) g WHERE a.article_id = 2;
INSERT INTO views (user_id, article_id, viewed_at)
SELECT 6, 2, a.published_at + interval '2 days' + g * interval '1 minute'  -- и 50 позже
FROM articles a, generate_series(1, 50) g WHERE a.article_id = 2;
INSERT INTO views (user_id, article_id, viewed_at)
SELECT 6, 1, a.published_at + g * interval '1 minute'          -- 900 за сутки
FROM articles a, generate_series(1, 900) g WHERE a.article_id = 1;
INSERT INTO views (user_id, article_id, viewed_at)
SELECT 6, 1, a.published_at + interval '30 hours' + g * interval '1 minute'  -- 300 позже
FROM articles a, generate_series(1, 300) g WHERE a.article_id = 1;
