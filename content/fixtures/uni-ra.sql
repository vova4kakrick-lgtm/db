-- Uni-DB в виде, использованном в лекциях по реляционной модели и алгебре
-- (лекция 4, с. 11 и 18; Lecture 3 англ., с. 19). Данные перенесены со слайдов;
-- русские имена — как в русской версии лекции 4, области ассистентов переведены.
-- Используется для проверки ответов к задачам по реляционной алгебре (SQL-эквиваленты).

CREATE TABLE professor (
  persnr integer PRIMARY KEY,
  name   text NOT NULL,
  level  text NOT NULL,          -- FP / AP, как на слайдах
  room   integer
);

CREATE TABLE student (
  studid   integer PRIMARY KEY,
  name     text NOT NULL,
  semester integer
);

CREATE TABLE lecture (
  nr     integer PRIMARY KEY,
  title  text NOT NULL,
  cp     integer,
  persnr integer REFERENCES professor
);

CREATE TABLE assistant (
  persnr integer PRIMARY KEY,
  name   text NOT NULL,
  area   text,
  boss   integer REFERENCES professor
);

CREATE TABLE attends (
  studid integer REFERENCES student,
  nr     integer REFERENCES lecture,
  PRIMARY KEY (studid, nr)
);

CREATE TABLE requires (
  prerequisite integer REFERENCES lecture,
  followup     integer REFERENCES lecture,
  PRIMARY KEY (prerequisite, followup)
);

CREATE TABLE tests (
  studid integer REFERENCES student,
  nr     integer REFERENCES lecture,
  persnr integer REFERENCES professor,
  grade  numeric,
  PRIMARY KEY (studid, nr)
);

INSERT INTO professor VALUES
  (2125, 'Сократ', 'FP', 226),
  (2126, 'Рассел', 'FP', 232),
  (2127, 'Коперник', 'AP', 310),
  (2133, 'Поппер', 'AP', 52),
  (2134, 'Августин', 'AP', 309),
  (2136, 'Кюри', 'FP', 36),
  (2137, 'Кант', 'FP', 7);

INSERT INTO student VALUES
  (24002, 'Ксенократ', 18),
  (25403, 'Йонас', 12),
  (26120, 'Фихте', 10),
  (26830, 'Аристоксен', 8),
  (27550, 'Шопенгауэр', 6),
  (28106, 'Карнап', 3),
  (29120, 'Теофраст', 2),
  (29555, 'Фейербах', 2);

INSERT INTO lecture VALUES
  (5001, 'Основы', 4, 2137),
  (5041, 'Этика', 4, 2125),
  (5043, 'Теория познания', 3, 2126),
  (5049, 'Маевтика', 2, 2125),
  (4052, 'Логика', 4, 2125),
  (5052, 'Философия науки', 3, 2126),
  (5216, 'Биоэтика', 2, 2126),
  (5259, 'Венский кружок', 2, 2133),
  (5022, 'Вера и знание', 2, 2134),
  (4630, 'Три критики', 4, 2137);

INSERT INTO assistant VALUES
  (3002, 'Платон', 'Учение об идеях', 2125),
  (3003, 'Аристотель', 'Силлогистика', 2125),
  (3004, 'Витгенштейн', 'Теория языка', 2126),
  (3005, 'Ретик', 'Движение планет', 2127),
  (3006, 'Ньютон', 'Законы Кеплера', 2127),
  (3007, 'Спиноза', 'Бог и природа', 2126);

INSERT INTO attends VALUES
  (26120, 5001), (27550, 5001), (27550, 4052), (28106, 5041),
  (28106, 5052), (28106, 5216), (28106, 5259), (29120, 5001),
  (29120, 5041), (29120, 5049), (29555, 5022), (25403, 5022);

INSERT INTO requires VALUES
  (5001, 5041), (5001, 5043), (5001, 5049), (5041, 5216),
  (5043, 5052), (5041, 5052), (5052, 5259);

INSERT INTO tests VALUES
  (28106, 5001, 2126, 1),
  (25403, 5041, 2125, 2),
  (27550, 4630, 2137, 2);
