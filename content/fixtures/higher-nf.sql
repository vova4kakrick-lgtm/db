-- Данные со слайдов лекции 6 «Высшие нормальные формы» (с. 3 и 7–8).

-- 4НФ: единая таблица навыков и языков.
CREATE TABLE employee_skills_languages (
  employee_id integer,
  skill       text,
  language    text,
  PRIMARY KEY (employee_id, skill, language)
);
INSERT INTO employee_skills_languages VALUES
  (101, 'Java', 'English'),
  (101, 'Java', 'German'),
  (101, 'Python', 'English'),
  (101, 'Python', 'German'),
  (102, 'SQL', 'French');

-- 5НФ: предложения агентов и проекции, показанные на слайде 8.
CREATE TABLE offerings (
  agent   text,
  company text,
  product text,
  PRIMARY KEY (agent, company, product)
);
INSERT INTO offerings VALUES
  ('Смит', 'Acme', 'Пылесосы'),
  ('Смит', 'Stark', 'Тостеры'),
  ('Джонс', 'Acme', 'Пылесосы'),
  ('Джонс', 'Acme', 'Гаджеты');

CREATE TABLE agent_company (agent text, company text, PRIMARY KEY (agent, company));
CREATE TABLE company_product (company text, product text, PRIMARY KEY (company, product));
CREATE TABLE agent_product (agent text, product text, PRIMARY KEY (agent, product));

INSERT INTO agent_company VALUES ('Смит', 'Acme'), ('Смит', 'Stark'), ('Джонс', 'Acme');
INSERT INTO company_product VALUES ('Acme', 'Пылесосы'), ('Acme', 'Гаджеты'), ('Stark', 'Тостеры');
INSERT INTO agent_product VALUES
  ('Смит', 'Пылесосы'), ('Смит', 'Тостеры'), ('Джонс', 'Пылесосы'), ('Джонс', 'Гаджеты');
