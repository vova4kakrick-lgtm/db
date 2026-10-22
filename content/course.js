// Общие сведения о курсе: источники (учебные материалы) и порядок тем.
// Ключи источников используются в полях `source` тем, задач и вопросов.

export const course = {
  title: 'Базы данных: подготовка к контрольной',
  subtitle: 'Майнор «Интеллектуальный анализ данных», НИУ ВШЭ, 2026',
  lecturer: 'А. Брейман',
};

// pages — число страниц в PDF. Ссылка «с. N» в источнике — номер страницы PDF-файла
// (на некоторых слайдах напечатанный номер отличается на 1).
export const sources = {
  l01: {
    file: 'lectures/ИАД-DB-2026-lec01.pdf',
    title: 'Лекция 1. Организация курса, история, СУБД',
    pages: 39,
  },
  l02: {
    file: 'lectures/ИАД-DB-2026-lec02.pdf',
    title: 'Lecture 2. Data modeling in ER and UML (англ.)',
    pages: 44,
  },
  er: {
    file: 'lectures/ИАД-БД-2026-лекция3-ER.pdf',
    title: 'Лекция 3. Моделирование данных в ER и UML',
    pages: 43,
  },
  l03en: {
    file: 'lectures/ИАД-DB-2026-lec03.pdf',
    title: 'Lecture 3. Relational Data Model (англ.)',
    pages: 45,
    duplicates: ['lectures/ИАД-DB-2026-lec03 copy.pdf'],
  },
  l04: {
    file: 'lectures/minor-DB-2026-lec04-RU.pdf',
    title: 'Лекция 4. Реляционная модель данных',
    pages: 43,
  },
  l05: {
    file: 'lectures/minor-DB-2026-lec05-RU.pdf',
    title: 'SQL в PostgreSQL I: схема, типы, ограничения, изменение данных',
    pages: 23,
  },
  l06: {
    file: 'lectures/minor-DB-2026-lec06-RU.pdf',
    title: 'SQL в PostgreSQL II: запросы, JOIN, агрегация, CTE, окна, представления',
    pages: 26,
  },
  l07: {
    file: 'lectures/DB-2026-lec07-PostgreSQL-Queries-RU.pdf',
    title: 'SQL в PostgreSQL II (файл lec07; содержание совпадает с lec06 без слайда «Виды JOIN»)',
    pages: 25,
  },
  norm: {
    file: 'lectures/Лекция 5 Нормализация.pdf',
    title: 'Лекция 5. Нормализация реляционных баз данных',
    pages: 18,
  },
  hnf: {
    file: 'lectures/Лекция 6 Высшие нормальные формы.pdf',
    title: 'Лекция 6. Высшие нормальные формы (4НФ, 5НФ)',
    pages: 15,
    duplicates: ['lectures/Лекция 6 Высшие нормальные формы (1).pdf'],
  },
  ddl: {
    file: 'lectures/Лекция SQL DDL DML.pdf',
    title: 'Лекция 7. SQL DDL и DML (конспект)',
    pages: 11,
  },
  demo: {
    file: 'previous_years/demo1.txt',
    title: 'Демо-вариант контрольной (блог-платформа)',
  },
  varA: {
    file: 'previous_years/ПИ БД Мидтерм 25 17.11 Вар А.docx',
    title: 'Мидтерм 2025, вариант А (SaaS-подписки)',
  },
  varB: {
    file: 'previous_years/ПИ БД Мидтерм 25 17.11 Вар Б.docx',
    title: 'Мидтерм 2025, вариант Б (кикшеринг)',
  },
  varV: {
    file: 'previous_years/ПИ БД Мидтерм 25 17.11 Вар В.docx',
    title: 'Мидтерм 2025, вариант В (совместное редактирование документов)',
  },
};

// Порядок тем на сайте = порядок изучения в курсе.
export const topicOrder = [
  'intro',
  'er-uml',
  'relational-model',
  'relational-algebra',
  'normalization',
  'higher-nf',
  'sql-ddl',
  'sql-dml',
  'sql-select',
  'sql-advanced',
  'exam-practice',
];
