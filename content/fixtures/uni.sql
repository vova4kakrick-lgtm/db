-- Учебная Uni-DB из лекций «SQL в PostgreSQL I/II» (minor-DB-2026-lec05-RU.pdf, с. 4, 10, 13, 15).
-- Схема перенесена со слайдов без изменений. Тестовые данные составлены по мотивам
-- экземпляра Uni-DB из лекции 4 (те же профессора, курсы и посещения) и дополнены
-- курсами 'Databases'/'Algorithms' и студентами из примеров лекции по SQL.

CREATE TYPE professor_level AS ENUM ('assistant', 'associate', 'full');

CREATE TABLE professor (
  professor_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text NOT NULL,
  level        professor_level NOT NULL,
  room         text UNIQUE
);

CREATE TABLE student (
  student_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  semester   smallint CHECK (semester BETWEEN 1 AND 14)
);

CREATE TABLE course (
  course_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text NOT NULL,
  credits      smallint NOT NULL CHECK (credits BETWEEN 1 AND 12),
  professor_id bigint REFERENCES professor(professor_id)
                 ON UPDATE CASCADE
                 ON DELETE SET NULL
);

CREATE TABLE enrollment (
  student_id  bigint REFERENCES student ON DELETE CASCADE,
  course_id   bigint REFERENCES course  ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id)
);

CREATE TABLE course_prerequisite (
  course_id       bigint REFERENCES course ON DELETE CASCADE,
  prerequisite_id bigint REFERENCES course ON DELETE RESTRICT,
  PRIMARY KEY (course_id, prerequisite_id),
  CHECK (course_id <> prerequisite_id)
);

CREATE TABLE exam (
  student_id  bigint REFERENCES student ON DELETE CASCADE,
  course_id   bigint REFERENCES course  ON DELETE CASCADE,
  attempt_no  smallint NOT NULL DEFAULT 1 CHECK (attempt_no > 0),
  examiner_id bigint REFERENCES professor ON DELETE SET NULL,
  grade       numeric(3,1) CHECK (grade BETWEEN 0 AND 10),
  taken_at    timestamptz,
  PRIMARY KEY (student_id, course_id, attempt_no)
);
CREATE INDEX exam_examiner_idx ON exam(examiner_id);

INSERT INTO professor (professor_id, name, level, room) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Сократ',          'full',      '226'),
  (2, 'Рассел',          'full',      '232'),
  (3, 'Коперник',        'associate', '310'),
  (4, 'Поппер',          'associate', '52'),
  (5, 'Августин',        'associate', '309'),
  (6, 'Кюри',            'full',      '36'),
  (7, 'Кант',            'full',      '7'),
  (8, 'Edsger Dijkstra', 'full',      NULL);

INSERT INTO student (student_id, name, semester) OVERRIDING SYSTEM VALUE VALUES
  (1,  'Ксенократ',    14),
  (2,  'Йонас',        12),
  (3,  'Фихте',        10),
  (4,  'Аристоксен',    8),
  (5,  'Шопенгауэр',    6),
  (6,  'Карнап',        3),
  (7,  'Теофраст',      2),
  (8,  'Фейербах',      2),
  (9,  'Ada Lovelace',  1),
  (10, 'Alan Turing',   2);

INSERT INTO course (course_id, title, credits, professor_id) OVERRIDING SYSTEM VALUE VALUES
  (1,  'Основы',          4, 7),
  (2,  'Этика',           4, 1),
  (3,  'Теория познания', 3, 2),
  (4,  'Маевтика',        2, 1),
  (5,  'Логика',          4, 1),
  (6,  'Философия науки', 3, 2),
  (7,  'Биоэтика',        2, 2),
  (8,  'Венский кружок',  2, 4),
  (9,  'Вера и знание',   2, 5),
  (10, 'Три критики',     4, 7),
  (11, 'Databases',       6, 8),
  (12, 'Algorithms',      6, NULL);

INSERT INTO enrollment (student_id, course_id, enrolled_at) VALUES
  (3, 1,  '2026-09-01 10:00+00'), (5, 1,  '2026-09-01 10:05+00'), (5, 5,  '2026-09-02 09:00+00'),
  (6, 2,  '2026-09-01 11:00+00'), (6, 6,  '2026-09-02 11:00+00'), (6, 7,  '2026-09-03 11:00+00'),
  (6, 8,  '2026-09-04 11:00+00'), (7, 1,  '2026-09-01 12:00+00'), (7, 2,  '2026-09-02 12:00+00'),
  (7, 4,  '2026-09-03 12:00+00'), (8, 9,  '2026-09-01 13:00+00'), (2, 9,  '2026-09-01 14:00+00'),
  (9, 11, '2026-09-05 08:00+00'), (9, 12, '2026-09-05 08:30+00'), (10, 11, '2026-09-06 08:00+00'),
  (10, 12, '2026-09-06 08:30+00'), (6, 11, '2026-09-07 08:00+00');

INSERT INTO course_prerequisite (course_id, prerequisite_id) VALUES
  (2, 1), (3, 1), (4, 1), (7, 2), (6, 3), (6, 2), (8, 6), (11, 1);

INSERT INTO exam (student_id, course_id, attempt_no, examiner_id, grade, taken_at) VALUES
  (6,  1,  1, 2,    9.0,  '2026-01-15 10:00+00'),
  (2,  2,  1, 1,    8.0,  '2026-01-16 10:00+00'),
  (5,  10, 1, 7,    8.0,  '2026-01-17 10:00+00'),
  (9,  11, 1, 8,    10.0, '2026-06-10 10:00+00'),
  (10, 11, 1, 8,    7.5,  '2026-06-10 12:00+00'),
  (6,  11, 1, 8,    4.0,  '2026-06-11 10:00+00'),
  (6,  11, 2, 8,    6.5,  '2026-06-25 10:00+00'),
  (9,  12, 1, NULL, NULL, NULL);

-- Identity-последовательности продолжаются после вставленных вручную id.
SELECT setval(pg_get_serial_sequence('professor', 'professor_id'), (SELECT max(professor_id) FROM professor));
SELECT setval(pg_get_serial_sequence('student', 'student_id'), (SELECT max(student_id) FROM student));
SELECT setval(pg_get_serial_sequence('course', 'course_id'), (SELECT max(course_id) FROM course));
