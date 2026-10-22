-- Демо-вариант: блог-платформа. Схема — решение задания 2 (CREATE TABLE).
CREATE TABLE users (
  user_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username   text NOT NULL UNIQUE,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE articles (
  article_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id    bigint NOT NULL REFERENCES users ON DELETE CASCADE,
  title        text NOT NULL,
  content      text NOT NULL,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  -- дата публикации есть ровно у опубликованных статей
  CHECK ((status = 'published') = (published_at IS NOT NULL))
);

CREATE TABLE tags (
  tag_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name   text NOT NULL UNIQUE
);

-- Статья N:M Тег
CREATE TABLE article_tags (
  article_id bigint REFERENCES articles ON DELETE CASCADE,
  tag_id     bigint REFERENCES tags ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Пользователь N:M Статья («лайкает»); лайк один на пару
CREATE TABLE likes (
  user_id    bigint REFERENCES users ON DELETE CASCADE,
  article_id bigint REFERENCES articles ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

-- Комментарии образуют дерево: parent_id ссылается на ту же таблицу
CREATE TABLE comments (
  comment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id bigint NOT NULL REFERENCES articles ON DELETE CASCADE,
  user_id    bigint NOT NULL REFERENCES users ON DELETE CASCADE,
  parent_id  bigint REFERENCES comments ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Подписка: рекурсивная связь Пользователь N:M Пользователь (подписчик → автор)
CREATE TABLE subscriptions (
  follower_id bigint REFERENCES users ON DELETE CASCADE,
  author_id   bigint REFERENCES users ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, author_id),
  CHECK (follower_id <> author_id)
);

-- Просмотры: событие (кто, что, когда); один пользователь может смотреть статью много раз
CREATE TABLE views (
  view_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users ON DELETE CASCADE,
  article_id bigint NOT NULL REFERENCES articles ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now()
);

-- PostgreSQL не индексирует ссылающиеся FK автоматически
CREATE INDEX articles_author_idx     ON articles(author_id);
CREATE INDEX article_tags_tag_idx    ON article_tags(tag_id);
CREATE INDEX likes_article_idx       ON likes(article_id);
CREATE INDEX comments_article_idx    ON comments(article_id);
CREATE INDEX comments_parent_idx     ON comments(parent_id);
CREATE INDEX subscriptions_author_idx ON subscriptions(author_id);
CREATE INDEX views_article_time_idx  ON views(article_id, viewed_at);
CREATE INDEX views_user_idx          ON views(user_id);
