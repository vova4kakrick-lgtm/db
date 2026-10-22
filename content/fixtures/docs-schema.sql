-- Мидтерм 2025, вариант В: совместное редактирование документов. Схема — решение задания 2.
CREATE TABLE users (
  user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    text NOT NULL,
  email   text NOT NULL UNIQUE
);

CREATE TABLE groups (
  group_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name     text NOT NULL UNIQUE
);

CREATE TABLE group_members (
  group_id bigint REFERENCES groups ON DELETE CASCADE,
  user_id  bigint REFERENCES users ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE documents (
  document_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id    bigint NOT NULL REFERENCES users ON DELETE RESTRICT,
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',   -- текущее содержимое (копия последней версии)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Каждое изменение — новая версия с полным содержимым
CREATE TABLE document_versions (
  version_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES documents ON DELETE CASCADE,
  author_id   bigint NOT NULL REFERENCES users ON DELETE RESTRICT,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Право выдаётся либо пользователю, либо группе (ровно одно из двух)
CREATE TABLE permissions (
  permission_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id   bigint NOT NULL REFERENCES documents ON DELETE CASCADE,
  user_id       bigint REFERENCES users ON DELETE CASCADE,
  group_id      bigint REFERENCES groups ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('viewer', 'commenter', 'editor')),
  granted_by    bigint REFERENCES users ON DELETE SET NULL,
  CHECK (num_nonnulls(user_id, group_id) = 1),
  UNIQUE NULLS NOT DISTINCT (document_id, user_id, group_id)
);

CREATE TABLE comments (
  comment_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES documents ON DELETE CASCADE,
  author_id   bigint NOT NULL REFERENCES users ON DELETE CASCADE,
  parent_id   bigint REFERENCES comments ON DELETE CASCADE,
  body        text NOT NULL,
  start_idx   integer,   -- привязка к фрагменту текста (необязательная)
  end_idx     integer,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK ((start_idx IS NULL) = (end_idx IS NULL)),
  CHECK (start_idx >= 0 AND end_idx >= start_idx),
  CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

CREATE INDEX versions_doc_time_idx   ON document_versions(document_id, created_at);
CREATE INDEX versions_author_idx     ON document_versions(author_id);
CREATE INDEX permissions_user_idx    ON permissions(user_id);
CREATE INDEX permissions_group_idx   ON permissions(group_id);
CREATE INDEX comments_document_idx   ON comments(document_id);
CREATE INDEX comments_parent_idx     ON comments(parent_id);
