// Мидтерм 2025, вариант Б: кикшеринг.
const VB = { doc: 'varB' };
const G = 'Вариант Б (2025): кикшеринг';
const FX = ['scooter-schema', 'scooter-seed'];

export default [
  {
    id: 'vb-q1',
    group: G,
    title: 'Б1. Концептуальная модель кикшеринга [2 балла]',
    level: 2,
    statement: `
В городе есть Парковочные зоны, где начинают и завершают аренду. Самокаты: уникальный номер, модель, уровень заряда, геолокация, статус ('available', 'in_use', 'charging', 'maintenance'); история статусов и зарядок логируется. Пользователи совершают Поездки (пользователь, самокат, время и место начала и окончания). Во время поездки каждые 15 секунд пишется Телеметрия (координаты, скорость). После поездки выставляется Счёт (зависит от разблокировки, длительности и пробега; пробег — по телеметрии). Пользователи сообщают о Проблемах с самокатами.

Спроектируйте концептуальную модель.
`,
    answer: `
- **ParkingZone** (zone_id; name, геометрия зоны).
- **Scooter** (scooter_id; serial_no — уникален, model, battery_level, lat/lon, status).
- **StatusHistory** (scooter + changed_at; status) и **ChargeHistory** (charge_id; started_at, finished_at, level_before, level_after) — Scooter 1 : N каждой.
- **User** (user_id; name, phone).
- **Trip** (trip_id; started_at, start point, ended_at, end point): User 1 : N Trip, Scooter 1 : N Trip.
- **Telemetry** (trip + recorded_at; lat, lon, speed) — *слабая сущность* поездки: Trip 1 : N Telemetry.
- **Bill** (bill_id; unlock_fee, minutes, distance_km, amount): Trip 1 : 1 Bill.
- **Issue** (issue_id; description, created_at, resolved_at): Scooter 1 : N Issue, User 1 : N Issue.
`,
    solution: `
- История статусов и зарядок — отдельные сущности-события (текущее значение статуса хранится в Scooter, история — в логе).
- Телеметрия не имеет смысла без поездки и идентифицируется моментом внутри поездки — классическая [слабая сущность](topic:er-uml#weak-entities).
- Счёт 1:1 с поездкой: в таблицах — \`UNIQUE\` на FK ([связь 1:1](topic:sql-ddl#one-to-one)).
- Принадлежность точки зоне можно не хранить связью, а вычислять по координатам; если хранить — Trip N : 1 ParkingZone (две связи: зона начала и зона окончания, с ролями).
`,
    theory: ['er-uml#weak-entities', 'er-uml#cardinality', 'sql-ddl#one-to-one', 'exam-practice#design-checklist'],
    source: [VB],
    basis: 'derived',
  },
  {
    id: 'vb-q2',
    group: G,
    title: 'Б2. CREATE TABLE для кикшеринга [2 балла]',
    level: 2,
    statement: `Напишите \`CREATE TABLE\` скрипты для модели из задания Б1.`,
    answer: `Таблицы \`parking_zones\`, \`scooters\`, \`scooter_status_history\`, \`charge_history\`, \`users\`, \`trips\`, \`telemetry\` (PK (trip_id, recorded_at)), \`bills\` (UNIQUE trip_id), \`issues\`. Полный скрипт — в решении.`,
    solution: `
{{sql}}
- **Пространственные типы** (PostGIS \`geography\`, полигоны зон) в материалах курса **не найдены**. Поэтому координаты — \`double precision\` (измерения, не деньги — см. [типы](topic:sql-ddl#types)), зона упрощена до круга, а для расстояний добавлена функция \`distance_m\` (формула гаверсинуса) — это дополнение составителя.
- \`telemetry\` — ключ слабой сущности (trip_id, recorded_at) ([правило 5](topic:relational-model#rule5)).
- Поездки и счета не удаляются каскадно вместе с пользователем — \`RESTRICT\` (финансовая история).
`,
    sql: { fixture: [], file: 'scooter-schema' },
    theory: ['sql-ddl#constraints', 'sql-ddl#types', 'relational-model#rule5', 'exam-practice#beyond-materials'],
    source: [VB],
    basis: 'derived',
  },
  {
    id: 'vb-q3',
    group: G,
    title: 'Б3. Топ-10 «уставших» самокатов [1 балл]',
    level: 1,
    statement: `Найдите 10 самых «уставших» самокатов (с наибольшим суммарным пробегом за всё время).`,
    answer: `Сумма \`bills.distance_km\` (пробег поездки, рассчитанный по телеметрии) по самокату, \`ORDER BY … DESC LIMIT 10\`. Тестовые данные: SC-002 — 7.50 км, SC-001 — 4.30, SC-003 — 2.70.`,
    solution: `
Пробег поездки уже сохранён в счёте (по условию он рассчитывается по телеметрии), поэтому достаточно агрегировать счета:
{{sql}}
Если считать пробег прямо по телеметрии, нужно сложить расстояния между соседними точками поездки: соединить точку со следующей (\`t2.recorded_at = t1.recorded_at + interval '15 seconds'\`) или использовать оконную \`lag\` (её в лекциях нет).
`,
    sql: {
      fixture: FX,
      code: `SELECT s.serial_no, sum(b.distance_km)::text AS total_km
FROM scooters AS s
JOIN trips AS t ON t.scooter_id = s.scooter_id
JOIN bills AS b ON b.trip_id = t.trip_id
GROUP BY s.scooter_id, s.serial_no
ORDER BY sum(b.distance_km) DESC
LIMIT 10;`,
      expect: [
        { serial_no: 'SC-002', total_km: '7.50' },
        { serial_no: 'SC-001', total_km: '4.30' },
        { serial_no: 'SC-003', total_km: '2.70' },
      ],
    },
    theory: ['sql-select#group-by', 'exam-practice#query-patterns'],
    source: [VB],
    basis: 'derived',
  },
  {
    id: 'vb-q4',
    group: G,
    title: 'Б4. Поездки, завершённые вне парковочных зон [1 балл]',
    level: 2,
    statement: `Найдите всех пользователей, которые завершили хотя бы одну поездку за пределами официальных парковочных зон (требуется пространственный \`JOIN\`).`,
    answer: `Поездка «вне зон», если **не существует** зоны, в которую попадает точка окончания: \`NOT EXISTS (… distance_m(end, center) <= radius_m)\`; пользователей — через \`EXISTS\`/\`DISTINCT\`. Тестовые данные: Олег.`,
    solution: `
Пространственный JOIN (PostGIS: \`ST_Contains\`, \`ST_DWithin\` и т. п.) в материалах курса не разбирается. Логика запроса при этом — обычный anti-join ([NOT EXISTS](topic:sql-select#exists)); ниже зона упрощена до круга, а принадлежность проверяется функцией расстояния из схемы:
{{sql}}
С PostGIS условие выглядело бы как \`NOT EXISTS (SELECT 1 FROM parking_zones z WHERE ST_Contains(z.area, t.end_point))\`.
`,
    sql: {
      fixture: FX,
      code: `SELECT DISTINCT u.name
FROM trips AS t
JOIN users AS u ON u.user_id = t.user_id
WHERE t.ended_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM parking_zones AS z
    WHERE distance_m(t.end_lat, t.end_lon, z.center_lat, z.center_lon) <= z.radius_m
  )
ORDER BY u.name;`,
      expect: [{ name: 'Олег' }],
    },
    theory: ['sql-select#exists', 'exam-practice#beyond-materials'],
    source: [VB],
    basis: 'not-found',
  },
  {
    id: 'vb-q5',
    group: G,
    title: 'Б5. Пиковые часы по дням недели [1 балл]',
    level: 2,
    statement: `Постройте отчёт, показывающий пиковые часы использования самокатов (по часам в сутках) для каждого дня недели.`,
    answer: `Посчитать поездки по паре (\`EXTRACT(ISODOW …)\`, \`EXTRACT(HOUR …)\`), затем для каждого дня недели оставить час с максимумом (\`DISTINCT ON\` или \`row_number\`). Тестовые данные: понедельник — 8 ч (3 поездки), вторник — 19 ч (3 поездки).`,
    solution: `
\`EXTRACT(DOW …)\` упоминается в конспекте (день недели: 0 — воскресенье); \`ISODOW\` даёт 1 — понедельник … 7 — воскресенье. Час — \`EXTRACT(HOUR …)\`. Время берём в часовом поясе сервиса (здесь UTC).
{{sql}}
Если нужен не только пик, а вся «тепловая карта» (7 × 24), достаточно первого CTE.
`,
    sql: {
      fixture: FX,
      code: `WITH by_hour AS (
  SELECT EXTRACT(ISODOW FROM started_at)::int AS dow,
         EXTRACT(HOUR FROM started_at)::int   AS hour,
         count(*) AS trips
  FROM trips
  GROUP BY 1, 2
)
SELECT DISTINCT ON (dow) dow, hour, trips
FROM by_hour
ORDER BY dow, trips DESC, hour;`,
      expectSubset: [
        { dow: 1, hour: 8, trips: 3 },
        { dow: 2, hour: 19, trips: 3 },
      ],
    },
    theory: ['sql-select#group-by', 'sql-advanced#pg-idioms', 'sql-ddl#schema-objects'],
    source: [VB, { doc: 'ddl', pages: '3' }],
    basis: 'derived',
  },
  {
    id: 'vb-q6',
    group: G,
    title: 'Б6. «Брошенные» самокаты [1 балл]',
    level: 1,
    statement: `Найдите «брошенные» самокаты: находятся в статусе 'available' более 24 часов и при этом их заряд ниже 15%.`,
    answer: `Последняя запись истории статусов самоката — 'available' и сделана раньше \`now() - interval '24 hours'\`, плюс \`battery_level < 15\`. Тестовые данные: SC-002 (свободен 2 дня, заряд 10%); SC-003 с зарядом 12% свободен лишь 3 часа.`,
    solution: `
Длительность пребывания в статусе берём из истории: последний статус каждого самоката — через \`DISTINCT ON\` ([идиомы PostgreSQL](topic:sql-advanced#pg-idioms)).
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `WITH last_status AS (
  SELECT DISTINCT ON (scooter_id) scooter_id, status, changed_at
  FROM scooter_status_history
  ORDER BY scooter_id, changed_at DESC
)
SELECT s.serial_no, s.battery_level
FROM scooters AS s
JOIN last_status AS ls ON ls.scooter_id = s.scooter_id
WHERE ls.status = 'available'
  AND ls.changed_at < now() - interval '24 hours'
  AND s.battery_level < 15;`,
      expect: [{ serial_no: 'SC-002', battery_level: 10 }],
    },
    theory: ['sql-advanced#pg-idioms', 'sql-ddl#schema-objects'],
    source: [VB],
    basis: 'derived',
  },
  {
    id: 'vb-q7',
    group: G,
    title: 'Б7. Максимальная скорость и топ-5 быстрых поездок за сегодня [2 балла]',
    level: 2,
    statement: `Для каждой поездки рассчитайте максимальную зафиксированную скорость и найдите топ-5 самых быстрых поездок за сегодня.`,
    answer: `\`max(speed_kmh)\` по телеметрии с \`GROUP BY trip_id\`; фильтр поездок, начатых сегодня (\`started_at >= current_date\` и \`< current_date + 1\`); \`ORDER BY … DESC LIMIT 5\`. Тестовые данные: поездки 9 (25), 7 (22), 8 (18), 10 (15).`,
    solution: `
{{sql}}
Фильтр по диапазону \`[current_date, current_date + 1)\` лучше, чем \`started_at::date = current_date\`: он может использовать индекс по \`started_at\` (пояснение составителя).
`,
    sql: {
      fixture: FX,
      code: `SELECT t.trip_id, u.name, max(tm.speed_kmh) AS max_speed
FROM trips AS t
JOIN users AS u ON u.user_id = t.user_id
JOIN telemetry AS tm ON tm.trip_id = t.trip_id
WHERE t.started_at >= current_date
  AND t.started_at <  current_date + 1
GROUP BY t.trip_id, u.name
ORDER BY max_speed DESC
LIMIT 5;`,
      expect: [
        { trip_id: 9, max_speed: 25 },
        { trip_id: 7, max_speed: 22 },
        { trip_id: 8, max_speed: 18 },
        { trip_id: 10, max_speed: 15 },
      ],
    },
    theory: ['sql-select#group-by', 'sql-ddl#schema-objects'],
    source: [VB],
    basis: 'derived',
  },
  {
    id: 'vb-q8',
    group: G,
    title: 'Б8. «Пересадки» в пределах 5 минут и 100 метров [2 балла]',
    level: 3,
    statement: `Найдите все случаи «пересадки»: пользователь завершает одну поездку и в течение 5 минут начинает новую, причём точка начала новой поездки находится в радиусе 100 метров от точки окончания предыдущей.`,
    answer: `Self-join \`trips\` по пользователю: \`next.started_at BETWEEN prev.ended_at AND prev.ended_at + interval '5 minutes'\` и \`distance_m(prev.end, next.start) <= 100\`. Тестовые данные: Ирина, поездка 7 → 8 (через 3 минуты, ~54 м).`,
    solution: `
Временная часть — обычный self-join с интервалами ([self-join](topic:sql-select#joins)). Расстояние между точками — функция из схемы (пространственных функций в материалах нет, см. [вне материалов](topic:exam-practice#beyond-materials)). Поездка 10 Олега начинается через 2 минуты, но далеко от конца поездки 9 — не пересадка.
{{sql}}
`,
    sql: {
      fixture: FX,
      code: `SELECT u.name, prev.trip_id AS from_trip, nxt.trip_id AS to_trip,
       round(distance_m(prev.end_lat, prev.end_lon, nxt.start_lat, nxt.start_lon)) AS meters
FROM trips AS prev
JOIN trips AS nxt
  ON nxt.user_id = prev.user_id
 AND nxt.trip_id <> prev.trip_id
 AND nxt.started_at BETWEEN prev.ended_at AND prev.ended_at + interval '5 minutes'
JOIN users AS u ON u.user_id = prev.user_id
WHERE distance_m(prev.end_lat, prev.end_lon, nxt.start_lat, nxt.start_lon) <= 100;`,
      expect: [{ name: 'Ирина', from_trip: 7, to_trip: 8 }],
    },
    theory: ['sql-select#joins', 'exam-practice#beyond-materials'],
    source: [VB],
    basis: 'not-found',
  },
];
