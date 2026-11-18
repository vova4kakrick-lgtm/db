// Вкладка «Коды 2025»: все SQL-коды трёх вариантов контрольной 2025
// (логистика, музыкальный стриминг, каршеринг) с кратким пояснением.
// Каждый код выполняется скриптом scripts/check-codes.mjs на тестовых данных
// content/fixtures/codes-v<N>-seed.sql (для варианта 3 PostGIS заменяется заглушкой).

export default {
  title: 'Коды 2025: три варианта контрольной',
  short: 'Коды 2025',
  intro: `
Все коды по трём вариантам 2025 года: логистический центр, стриминг музыки, каршеринг. У каждого кода есть пояснение: **что он делает** и **зачем нужен** (основная идея, которую стоит запомнить).

Коды взяты из разбора вариантов. Ошибки в разборе исправлены, у таких мест есть пометка **«Исправлено»** с объяснением. Каждый запрос выполнен в PostgreSQL на тестовых данных (скрипт \`npm run check:codes\`).
`,
  variants: [
    // ───────────────────────────── Вариант 1 ─────────────────────────────
    {
      id: 'v1',
      title: 'Вариант 1. Логистический центр E-commerce',
      fixture: 'codes-v1-seed',
      er: `
- **Product** (product_id; name, weight_kg, volume_m3).
- **StorageBin** (bin_id; bin_code, bin_type, quantity) — N : 1 Product (в ячейке один тип товара).
- **Order** (order_id; created_at, delivery_address, status) — 1 : N **OrderItem** (product, quantity).
- **Picker** — сотрудник; **PickingTask** — задание на сборку: Order 1 : N PickingTask, Picker 1 : N PickingTask.
- **Pick** — скан: PickingTask 1 : N Pick, StorageBin 1 : N Pick, Picker 1 : N Pick, Product 1 : N Pick (+ время).
- **Package** (package_id; tracking_number) — Order 1 : N Package.
`,
      items: [
        {
          id: 'v1-ddl',
          title: '1.2. CREATE TABLE',
          about: 'Создаёт 9 таблиц склада: товары, ячейки, заказы и их позиции, сборщиков, задания, сканы (Picks), коробки.',
          why: 'Это логическая модель для всех запросов ниже. Статусы заказа хранятся в CHECK: paid → picking → packing → shipped (оплачен → на сборке → на упаковке → отправлен). Уникальность ячейки и трек-номера задана через UNIQUE.',
          fix: 'В разборе сотрудник хранился только в PickingTasks, поэтому задание 8 («пары сотрудников в одном задании») нельзя было решить: у задания один сотрудник. В условии сказано, что каждое сканирование фиксирует, *каким сотрудником* взят товар, поэтому в Picks добавлен picker_id.',
          code: `CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    weight_kg  NUMERIC(8, 3)  CHECK (weight_kg > 0),
    volume_m3  NUMERIC(10, 6) CHECK (volume_m3 > 0)
);

CREATE TABLE StorageBins (
    bin_id     SERIAL PRIMARY KEY,
    bin_code   VARCHAR(50) UNIQUE NOT NULL,
    product_id INT REFERENCES Products(product_id),   -- один тип товара в ячейке
    quantity   INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    bin_type   VARCHAR(20) NOT NULL CHECK (bin_type IN ('manual', 'automated'))
);

CREATE TABLE Orders (
    order_id         SERIAL PRIMARY KEY,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_address TEXT NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'paid'
                     CHECK (status IN ('paid', 'picking', 'packing', 'shipped'))
);

CREATE TABLE OrderItems (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INT NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
    product_id    INT NOT NULL REFERENCES Products(product_id),
    quantity      INT NOT NULL CHECK (quantity > 0),
    UNIQUE (order_id, product_id)
);

CREATE TABLE Pickers (
    picker_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL
);

CREATE TABLE PickingTasks (
    task_id      SERIAL PRIMARY KEY,
    order_id     INT NOT NULL REFERENCES Orders(order_id),
    picker_id    INT REFERENCES Pickers(picker_id),     -- кому выдано задание
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE Picks (
    pick_id         SERIAL PRIMARY KEY,
    task_id         INT NOT NULL REFERENCES PickingTasks(task_id),
    bin_id          INT NOT NULL REFERENCES StorageBins(bin_id),
    product_id      INT NOT NULL REFERENCES Products(product_id),
    picker_id       INT NOT NULL REFERENCES Pickers(picker_id),  -- кто сканировал
    quantity_picked INT NOT NULL CHECK (quantity_picked > 0),
    picked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Packages (
    package_id      SERIAL PRIMARY KEY,
    order_id        INT NOT NULL REFERENCES Orders(order_id),
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    packed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
        },
        {
          id: 'v1-q3',
          title: '1.3. Заказы «на сборке» дольше 3 часов',
          about: 'Выводит заказы со статусом picking, созданные больше 3 часов назад, и время ожидания.',
          why: 'Простая фильтрация по статусу и времени: NOW() − INTERVAL. Такой запрос нужен, чтобы находить «зависшие» заказы.',
          code: `SELECT order_id,
       created_at,
       NOW() - created_at AS waiting
FROM Orders
WHERE status = 'picking'
  AND created_at < NOW() - INTERVAL '3 hours'
ORDER BY created_at;`,
          expectSubset: [{ order_id: 1 }],
          expectAbsent: [{ order_id: 2 }],
        },
        {
          id: 'v1-q4',
          title: '1.4. Закончившиеся товары в «ручных» ячейках',
          about: 'Находит товары, у которых в ячейке типа manual количество равно 0, и выводит код этой ячейки.',
          why: 'JOIN двух таблиц и фильтр по двум условиям. Сигнал, что ручную ячейку пора пополнить.',
          code: `SELECT p.product_id, p.name, sb.bin_code
FROM StorageBins sb
JOIN Products p ON p.product_id = sb.product_id
WHERE sb.bin_type = 'manual'
  AND sb.quantity = 0
ORDER BY p.product_id;`,
          expectSubset: [{ bin_code: 'M-02' }],
          expectAbsent: [{ bin_code: 'A-01' }],
        },
        {
          id: 'v1-q5',
          title: '1.5. Ошибки сборки: собрано ≠ заказано',
          about: 'Для каждого задания и товара сравнивает, сколько штук нужно по OrderItems и сколько отсканировано в Picks. Выводит строки, где числа не совпадают.',
          why: 'Сначала агрегируем каждую сторону отдельно (два CTE), потом соединяем. Если сделать JOIN до агрегации, суммы умножатся. Через FULL JOIN видны оба вида ошибок: недобор и лишний товар, которого нет в заказе.',
          fix: 'В разборе был LEFT JOIN от позиций заказа, поэтому лишний (не тот) товар не попадал в отчёт. Заменено на FULL JOIN.',
          code: `WITH required AS (            -- сколько нужно собрать
    SELECT pt.task_id, oi.product_id, SUM(oi.quantity) AS required_qty
    FROM PickingTasks pt
    JOIN OrderItems oi ON oi.order_id = pt.order_id
    GROUP BY pt.task_id, oi.product_id
),
picked AS (                   -- сколько реально отсканировано
    SELECT task_id, product_id, SUM(quantity_picked) AS picked_qty
    FROM Picks
    GROUP BY task_id, product_id
)
SELECT COALESCE(r.task_id, p.task_id)       AS task_id,
       COALESCE(r.product_id, p.product_id) AS product_id,
       COALESCE(r.required_qty, 0)          AS required_qty,
       COALESCE(p.picked_qty, 0)            AS picked_qty
FROM required r
FULL JOIN picked p
       ON p.task_id = r.task_id AND p.product_id = r.product_id
WHERE COALESCE(r.required_qty, 0) <> COALESCE(p.picked_qty, 0)
ORDER BY task_id, product_id;`,
          expectSubset: [{ task_id: 2, product_id: 1, required_qty: 3, picked_qty: 2 }, { task_id: 2, product_id: 3, required_qty: 0, picked_qty: 1 }],
          expectAbsent: [{ task_id: 1 }],
        },
        {
          id: 'v1-q6',
          title: '1.6. «Неэффективно упакованные» заказы',
          about: 'Находит отправленные заказы, которые лежат больше чем в одной коробке, хотя общий объём товаров меньше 0.125 м³.',
          why: 'Объём заказа равен сумме volume × quantity по позициям, число коробок считается через COUNT по Packages. Обе агрегации делаются отдельно, потом соединяются.',
          fix: 'Добавлено условие status = \'shipped\': в условии сказано «были отправлены».',
          code: `WITH order_volume AS (
    SELECT oi.order_id, SUM(p.volume_m3 * oi.quantity) AS total_volume
    FROM OrderItems oi
    JOIN Products p ON p.product_id = oi.product_id
    GROUP BY oi.order_id
),
package_count AS (
    SELECT order_id, COUNT(*) AS packages
    FROM Packages
    GROUP BY order_id
)
SELECT o.order_id, ov.total_volume, pc.packages
FROM Orders o
JOIN order_volume  ov ON ov.order_id = o.order_id
JOIN package_count pc ON pc.order_id = o.order_id
WHERE o.status = 'shipped'
  AND pc.packages > 1
  AND ov.total_volume < 0.125;`,
          expectSubset: [{ order_id: 3, packages: 2 }],
          expectAbsent: [{ order_id: 4 }],
        },
        {
          id: 'v1-q7',
          title: '1.7. Производительность сборщиков за вчера (сканов в час)',
          about: 'Для каждого сборщика считает число сканов за вчерашний день и делит его на часы между первым и последним сканом.',
          why: 'Вчерашний день задаётся полуинтервалом [CURRENT_DATE − 1, CURRENT_DATE). EXTRACT(EPOCH …) / 3600 переводит разницу во времени в часы. HAVING убирает сборщиков с одним сканом, иначе было бы деление на 0.',
          fix: 'Сотрудник берётся из Picks.picker_id, то есть тот, кто реально сканировал, а не тот, кому выдано задание.',
          code: `SELECT pk.picker_id,
       pk.full_name,
       COUNT(*) AS picks,
       ROUND(COUNT(*) / (EXTRACT(EPOCH FROM MAX(p.picked_at) - MIN(p.picked_at)) / 3600.0), 2)
           AS picks_per_hour
FROM Picks p
JOIN Pickers pk ON pk.picker_id = p.picker_id
WHERE p.picked_at >= CURRENT_DATE - 1
  AND p.picked_at <  CURRENT_DATE
GROUP BY pk.picker_id, pk.full_name
HAVING MAX(p.picked_at) > MIN(p.picked_at)   -- защита от деления на 0
ORDER BY picks_per_hour DESC;`,
          expectSubset: [{ picker_id: 1, picks: 4 }],
        },
        {
          id: 'v1-q8',
          title: '1.8. Пары сотрудников в одном задании в пределах часа',
          about: 'Находит пары сборщиков, которые сканировали товары для одного задания с разницей во времени не больше часа.',
          why: 'Self-join таблицы Picks по одному task_id. Условие a.picker_id < b.picker_id убирает пары «сам с собой» и дубли вида (A, B) и (B, A). DISTINCT оставляет одну строку на пару и задание.',
          fix: 'В разборе обе стороны брали сотрудника из одного и того же PickingTask, поэтому p1 и p2 всегда совпадали и условие p1 < p2 давало пустой результат. Теперь сотрудник берётся из каждого скана.',
          code: `SELECT DISTINCT
       a.picker_id AS picker1_id,
       b.picker_id AS picker2_id,
       a.task_id,
       t.order_id
FROM Picks a
JOIN Picks b
  ON  b.task_id = a.task_id
  AND a.picker_id < b.picker_id
  AND b.picked_at BETWEEN a.picked_at - INTERVAL '1 hour'
                      AND a.picked_at + INTERVAL '1 hour'
JOIN PickingTasks t ON t.task_id = a.task_id
ORDER BY a.task_id, picker1_id, picker2_id;`,
          expectSubset: [{ picker1_id: 1, picker2_id: 2, task_id: 3 }],
          expectAbsent: [{ task_id: 4 }],
        },
      ],
    },

    // ───────────────────────────── Вариант 2 ─────────────────────────────
    {
      id: 'v2',
      title: 'Вариант 2. Платформа для стриминга музыки',
      fixture: 'codes-v2-seed',
      er: `
- **Artist**, **Album** (release_date), **Track** (title, duration, audio_url, номер в альбоме): Album 1 : N Track; Track N : M Artist (TrackArtists).
- **User** 1 : N **Playlist** (name, created_at); Playlist N : M Track с атрибутом связи **position** — порядок треков.
- **ListenEvent** (user, track, started_at, listened_seconds): «завершено», если прослушано больше 80% длительности.
- **Follow**: User N : M Artist.
`,
      items: [
        {
          id: 'v2-ddl',
          title: '2.2. CREATE TABLE + представление «завершённые прослушивания»',
          about: 'Создаёт таблицы музыкального сервиса и представление CompletedListens, в котором остаются только прослушивания больше 80% трека.',
          why: 'Связи N:M (трек–артист, плейлист–трек, подписки) хранятся в отдельных таблицах с составным ключом. Порядок треков хранится в столбце position с UNIQUE (playlist_id, position). Правило «> 80%» записано один раз в VIEW, и задания 3, 5, 7 его используют.',
          fix: 'В разборе в таблицах не было столбцов, которые нужны запросам: audio_url, номер трека в альбоме (задание 5), длительность прослушивания (без неё «завершённость» не вычислить, разбор проверял её через NOW()). Дата выпуска хранится у альбома.',
          code: `CREATE TABLE Artists (
    artist_id SERIAL PRIMARY KEY,
    name      VARCHAR(255) NOT NULL
);

CREATE TABLE Albums (
    album_id     SERIAL PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    release_date DATE NOT NULL
);

CREATE TABLE Tracks (
    track_id         SERIAL PRIMARY KEY,
    album_id         INT NOT NULL REFERENCES Albums(album_id),
    track_number     INT NOT NULL CHECK (track_number > 0),   -- номер в альбоме
    title            VARCHAR(255) NOT NULL,
    duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
    audio_url        TEXT NOT NULL,
    UNIQUE (album_id, track_number)
);

CREATE TABLE TrackArtists (                 -- N:M трек–артист
    track_id  INT REFERENCES Tracks(track_id),
    artist_id INT REFERENCES Artists(artist_id),
    PRIMARY KEY (track_id, artist_id)
);

CREATE TABLE Users (
    user_id  SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE Playlists (
    playlist_id SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES Users(user_id),
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE PlaylistTracks (               -- N:M с порядком
    playlist_id INT NOT NULL REFERENCES Playlists(playlist_id) ON DELETE CASCADE,
    track_id    INT NOT NULL REFERENCES Tracks(track_id),
    position    INT NOT NULL CHECK (position > 0),
    PRIMARY KEY (playlist_id, track_id),
    UNIQUE (playlist_id, position)
);

CREATE TABLE ListenEvents (
    event_id         BIGSERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES Users(user_id),
    track_id         INT NOT NULL REFERENCES Tracks(track_id),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    listened_seconds INT NOT NULL DEFAULT 0 CHECK (listened_seconds >= 0)
);

CREATE TABLE UserFollows (                  -- подписки, N:M
    user_id     INT NOT NULL REFERENCES Users(user_id),
    artist_id   INT NOT NULL REFERENCES Artists(artist_id),
    followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, artist_id)
);

-- «Завершённое» прослушивание: больше 80% длительности трека
CREATE VIEW CompletedListens AS
SELECT le.*
FROM ListenEvents le
JOIN Tracks t ON t.track_id = le.track_id
WHERE le.listened_seconds > 0.8 * t.duration_seconds;`,
        },
        {
          id: 'v2-q3',
          title: '2.3. Топ-10 треков текущего месяца по завершённым прослушиваниям',
          about: 'Считает завершённые прослушивания каждого трека с начала текущего месяца и выводит 10 самых популярных.',
          why: 'date_trunc(\'month\', now()) даёт начало месяца. Дальше обычная схема: GROUP BY, ORDER BY по счётчику и LIMIT. Второй ключ сортировки (track_id) делает результат однозначным при равных счётчиках.',
          fix: 'Вместо условия с NOW() из разбора используется представление CompletedListens.',
          code: `SELECT t.track_id, t.title, COUNT(*) AS completed_listens
FROM CompletedListens cl
JOIN Tracks t ON t.track_id = cl.track_id
WHERE cl.started_at >= date_trunc('month', now())
  AND cl.started_at <  date_trunc('month', now()) + INTERVAL '1 month'
GROUP BY t.track_id, t.title
ORDER BY completed_listens DESC, t.track_id
LIMIT 10;`,
          expectFirst: { track_id: 1 },
        },
        {
          id: 'v2-q4',
          title: '2.4. Пользователи с плейлистом из треков одного артиста',
          about: 'Находит пользователей, у которых есть хотя бы один плейлист, где у всех треков один и тот же исполнитель.',
          why: 'Внутри EXISTS идёт группировка по плейлисту и условие HAVING COUNT(DISTINCT artist_id) = 1. Если в плейлисте встречается второй артист, плейлист не подходит.',
          code: `SELECT u.user_id, u.username
FROM Users u
WHERE EXISTS (
    SELECT 1
    FROM Playlists pl
    JOIN PlaylistTracks pt ON pt.playlist_id = pl.playlist_id
    JOIN TrackArtists  ta ON ta.track_id    = pt.track_id
    WHERE pl.user_id = u.user_id
    GROUP BY pl.playlist_id
    HAVING COUNT(DISTINCT ta.artist_id) = 1
);`,
          expectSubset: [{ user_id: 1 }],
          expectAbsent: [{ user_id: 2 }],
        },
        {
          id: 'v2-q5',
          title: '2.5. Коэффициент удержания альбомов прошлого года',
          about: 'Для каждого альбома прошлого года делит число пользователей, дослушавших все треки альбома, на число пользователей, начавших первый трек.',
          why: '«Прослушал альбом целиком» значит, что у пары (альбом, пользователь) число разных завершённых треков равно числу треков в альбоме. Поэтому группировка идёт по паре, а не по альбому. Прошлый год задан полуинтервалом от date_trunc(\'year\').',
          fix: 'В разборе HAVING считал треки по всем пользователям сразу (группировка только по альбому), поэтому «целиком» проверялось неверно. Кроме того, год был вписан вручную (2022).',
          code: `WITH album_size AS (
    SELECT album_id, COUNT(*) AS n_tracks
    FROM Tracks
    GROUP BY album_id
),
started AS (                 -- начали слушать первый трек
    SELECT t.album_id, COUNT(DISTINCT le.user_id) AS n_started
    FROM ListenEvents le
    JOIN Tracks t ON t.track_id = le.track_id
    WHERE t.track_number = 1
    GROUP BY t.album_id
),
finished AS (                -- дослушали все треки альбома
    SELECT album_id, COUNT(*) AS n_finished
    FROM (
        SELECT t.album_id, cl.user_id
        FROM CompletedListens cl
        JOIN Tracks t ON t.track_id = cl.track_id
        GROUP BY t.album_id, cl.user_id
        HAVING COUNT(DISTINCT t.track_id) =
               (SELECT n_tracks FROM album_size s WHERE s.album_id = t.album_id)
    ) AS full_listeners
    GROUP BY album_id
)
SELECT a.album_id,
       a.title,
       s.n_started,
       COALESCE(f.n_finished, 0) AS n_finished,
       ROUND(COALESCE(f.n_finished, 0)::numeric / s.n_started, 3) AS retention_rate
FROM Albums a
JOIN started s       ON s.album_id = a.album_id
LEFT JOIN finished f ON f.album_id = a.album_id
WHERE a.release_date >= date_trunc('year', now()) - INTERVAL '1 year'
  AND a.release_date <  date_trunc('year', now());`,
          expectSubset: [{ album_id: 1, n_started: 2, n_finished: 1 }],
          expectAbsent: [{ album_id: 2 }],
        },
        {
          id: 'v2-q6',
          title: '2.6. «Недооценённые» треки',
          about: 'Находит треки, выпущенные больше года назад, у которых меньше 1000 прослушиваний, но которые есть больше чем в 50 плейлистах.',
          why: 'Каждый счётчик считается в своём CTE, потом они соединяются с треками. LEFT JOIN и COALESCE нужны, чтобы трек с 0 прослушиваний тоже попал в результат.',
          fix: 'В разборе у Tracks не было release_date. Здесь дата берётся из альбома.',
          code: `WITH listens AS (
    SELECT track_id, COUNT(*) AS n
    FROM ListenEvents
    GROUP BY track_id
),
in_playlists AS (
    SELECT track_id, COUNT(*) AS n
    FROM PlaylistTracks
    GROUP BY track_id
)
SELECT t.track_id, t.title, a.release_date,
       COALESCE(l.n, 0) AS listens,
       p.n              AS playlists
FROM Tracks t
JOIN Albums a        ON a.album_id = t.album_id
JOIN in_playlists p  ON p.track_id = t.track_id
LEFT JOIN listens l  ON l.track_id = t.track_id
WHERE a.release_date < CURRENT_DATE - INTERVAL '1 year'
  AND COALESCE(l.n, 0) < 1000
  AND p.n > 50;`,
          expectSubset: [{ track_id: 6, playlists: 51 }],
        },
        {
          id: 'v2-q7',
          title: '2.7. Топ-3 любимых артиста каждого пользователя',
          about: 'Для каждого пользователя считает завершённые прослушивания по артистам и оставляет трёх лидеров.',
          why: 'Это задача «топ-N в каждой группе»: оконная функция ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY …) нумерует артистов внутри пользователя, внешний запрос оставляет rn ≤ 3. Окно вычисляется после GROUP BY, поэтому внутри можно писать ORDER BY COUNT(*).',
          fix: 'В разборе не было условия «завершённости», теперь используется CompletedListens. DENSE_RANK заменён на ROW_NUMBER: при равенстве DENSE_RANK может вернуть больше трёх артистов.',
          code: `WITH user_artist AS (
    SELECT cl.user_id,
           ta.artist_id,
           COUNT(*) AS listens,
           ROW_NUMBER() OVER (PARTITION BY cl.user_id
                              ORDER BY COUNT(*) DESC, ta.artist_id) AS rn
    FROM CompletedListens cl
    JOIN TrackArtists ta ON ta.track_id = cl.track_id
    GROUP BY cl.user_id, ta.artist_id
)
SELECT ua.user_id, ua.rn AS place, ar.name AS artist, ua.listens
FROM user_artist ua
JOIN Artists ar ON ar.artist_id = ua.artist_id
WHERE ua.rn <= 3
ORDER BY ua.user_id, ua.rn;`,
          expectSubset: [{ user_id: 1, place: 1, artist: 'Artist A' }],
          maxPerKey: { key: 'user_id', max: 3 },
        },
        {
          id: 'v2-q8',
          title: '2.8. Пары пользователей с «похожими вкусами» (≥ 5 общих треков)',
          about: 'Находит пары пользователей, которые добавили в свои плейлисты не меньше 5 одних и тех же треков.',
          why: 'Сначала строится множество пар (пользователь, трек) по всем его плейлистам, с DISTINCT. Потом self-join по track_id с условием a.user_id < b.user_id и HAVING COUNT(*) ≥ 5.',
          fix: 'В разборе в PlaylistTracks брался user_id, которого в этой таблице нет: пользователя нужно получать через Playlists. Без DISTINCT трек, добавленный в два плейлиста одного пользователя, считался бы дважды.',
          code: `WITH user_tracks AS (
    SELECT DISTINCT pl.user_id, pt.track_id
    FROM Playlists pl
    JOIN PlaylistTracks pt ON pt.playlist_id = pl.playlist_id
)
SELECT a.user_id AS user1_id,
       b.user_id AS user2_id,
       COUNT(*)  AS common_tracks
FROM user_tracks a
JOIN user_tracks b
  ON b.track_id = a.track_id
 AND a.user_id < b.user_id
GROUP BY a.user_id, b.user_id
HAVING COUNT(*) >= 5
ORDER BY common_tracks DESC;`,
          expectSubset: [{ user1_id: 2, user2_id: 3, common_tracks: 5 }],
          expectAbsent: [{ user1_id: 1 }],
        },
      ],
    },

    // ───────────────────────────── Вариант 3 ─────────────────────────────
    {
      id: 'v3',
      title: 'Вариант 3. Система каршеринга',
      fixture: 'codes-v3-seed',
      postgis: true,
      er: `
- **Car** (car_id; license_plate — уникален, model, fuel_level, status, current_location) — 1 : N **CarStatusLog** (status, fuel_level, changed_at).
- **Customer** (customer_id; full_name, rating).
- **Reservation** (created_at, expires_at = +15 мин, status: active / expired / converted / cancelled): Customer 1 : N, Car 1 : N.
- **Rental** — поездка: Reservation 1 : 0..1 Rental; время и точки начала и конца.
- **Telemetry** (recorded_at, location, speed) — слабая сущность поездки, Rental 1 : N.
- **Invoice** — Rental 1 : 1 (длительность, пробег, сумма).
`,
      items: [
        {
          id: 'v3-ddl',
          title: '3.2. CREATE TABLE (PostgreSQL + PostGIS)',
          about: 'Создаёт таблицы каршеринга. Координаты хранятся в типе GEOGRAPHY(POINT, 4326), расстояния по нему считаются в метрах.',
          why: 'Текущий статус и топливо лежат в Cars, а история их изменений в отдельном логе CarStatusLog (событийная таблица). Автоотмена резерва хранится как status = \'expired\'. У Telemetry составной ключ (rental_id, recorded_at). Связи 1:1 (резерв → поездка, поездка → счёт) заданы через UNIQUE на FK.',
          fix: 'Для задания 3 в Cars добавлен current_location: разбор его использовал, но в таблице его не было. Столбец timestamp переименован в changed_at / recorded_at, чтобы имя не совпадало с названием типа.',
          code: `CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE Cars (
    car_id           SERIAL PRIMARY KEY,
    license_plate    VARCHAR(15) UNIQUE NOT NULL,
    model            VARCHAR(100) NOT NULL,
    fuel_level       NUMERIC(5, 2) NOT NULL CHECK (fuel_level BETWEEN 0 AND 100),
    status           VARCHAR(20) NOT NULL
                     CHECK (status IN ('available', 'in_use', 'maintenance')),
    current_location GEOGRAPHY(POINT, 4326)
);

CREATE TABLE CarStatusLog (                 -- история статуса и топлива
    log_id     BIGSERIAL PRIMARY KEY,
    car_id     INT NOT NULL REFERENCES Cars(car_id),
    status     VARCHAR(20) NOT NULL
               CHECK (status IN ('available', 'in_use', 'maintenance')),
    fuel_level NUMERIC(5, 2),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Customers (
    customer_id SERIAL PRIMARY KEY,
    full_name   VARCHAR(150) NOT NULL,
    rating      NUMERIC(3, 2) NOT NULL DEFAULT 5.0 CHECK (rating BETWEEN 0 AND 5)
);

CREATE TABLE Reservations (
    reservation_id SERIAL PRIMARY KEY,
    customer_id    INT NOT NULL REFERENCES Customers(customer_id),
    car_id         INT NOT NULL REFERENCES Cars(car_id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    status         VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'expired', 'converted', 'cancelled'))
);

CREATE TABLE Rentals (
    rental_id      SERIAL PRIMARY KEY,
    reservation_id INT UNIQUE NOT NULL REFERENCES Reservations(reservation_id),
    customer_id    INT NOT NULL REFERENCES Customers(customer_id),
    car_id         INT NOT NULL REFERENCES Cars(car_id),
    start_time     TIMESTAMPTZ NOT NULL,
    end_time       TIMESTAMPTZ CHECK (end_time > start_time),
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    end_location   GEOGRAPHY(POINT, 4326)
);

CREATE TABLE Telemetry (                    -- каждые 30 секунд
    rental_id   INT NOT NULL REFERENCES Rentals(rental_id),
    recorded_at TIMESTAMPTZ NOT NULL,
    location    GEOGRAPHY(POINT, 4326) NOT NULL,
    speed_kmh   INT CHECK (speed_kmh >= 0),
    PRIMARY KEY (rental_id, recorded_at)
);

CREATE TABLE Invoices (
    invoice_id   SERIAL PRIMARY KEY,
    rental_id    INT UNIQUE NOT NULL REFERENCES Rentals(rental_id),
    duration_min NUMERIC(8, 2) NOT NULL,
    distance_km  NUMERIC(8, 2) NOT NULL,
    amount       NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
        },
        {
          id: 'v3-q3',
          title: '3.3. Доступные машины в радиусе 1 км с топливом > 50%',
          about: 'Находит свободные машины с топливом больше 50%, которые стоят не дальше 1000 м от заданной точки, и сортирует их по расстоянию.',
          why: 'ST_DWithin(a, b, метры) проверяет «в радиусе». Для GEOGRAPHY расстояние измеряется в метрах. В ST_MakePoint сначала идёт долгота, потом широта. Здесь стоит точка у Кремля (37.6173, 55.7558), на экзамене вместо неё подставляются параметры.',
          code: `SELECT car_id, license_plate, model, fuel_level,
       ROUND(ST_Distance(current_location,
                         ST_MakePoint(37.6173, 55.7558)::geography)) AS distance_m
FROM Cars
WHERE status = 'available'
  AND fuel_level > 50
  AND ST_DWithin(current_location,
                 ST_MakePoint(37.6173, 55.7558)::geography,  -- (долгота, широта)
                 1000)                                         -- метры
ORDER BY distance_m;`,
          expectSubset: [{ car_id: 1 }],
          expectAbsent: [{ car_id: 2 }, { car_id: 3 }, { car_id: 4 }],
        },
        {
          id: 'v3-q4',
          title: '3.4. «Нерешительные» клиенты (> 3 автоотмен за сутки)',
          about: 'Находит клиентов, у которых за последние 24 часа больше трёх резервов отменились автоматически, по таймауту.',
          why: 'WHERE отбирает строки (expired, последние сутки), HAVING фильтрует группы по COUNT(*). Это стандартная связка, которую часто спрашивают.',
          code: `SELECT c.customer_id, c.full_name, COUNT(*) AS expired_reservations
FROM Reservations r
JOIN Customers c ON c.customer_id = r.customer_id
WHERE r.status = 'expired'
  AND r.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY c.customer_id, c.full_name
HAVING COUNT(*) > 3;`,
          expectSubset: [{ customer_id: 1, expired_reservations: 4 }],
          expectAbsent: [{ customer_id: 2 }],
        },
        {
          id: 'v3-q5',
          title: '3.5. Среднее время использования машины в день по моделям за прошлую неделю',
          about: 'Для каждой модели берёт часы поездок за прошлую календарную неделю и делит их на число машин этой модели и на 7 дней. Получается среднее число часов в день на одну машину.',
          why: 'Поездку, которая выходит за границы недели, нужно обрезать: LEAST(конец) − GREATEST(начало). Деление на число машин и на 7 превращает сумму в «в среднем в день». LEFT JOIN от Cars нужен, чтобы простаивавшие машины учитывались в знаменателе.',
          fix: 'В разборе считалось AVG длительности одной поездки за последние 7 дней. Это средняя длина поездки, а в задании просят время использования в день.',
          code: `WITH bounds AS (
    SELECT date_trunc('week', now()) - INTERVAL '1 week' AS w_start,
           date_trunc('week', now())                     AS w_end
),
usage AS (                   -- часть каждой поездки внутри прошлой недели
    SELECT r.car_id,
           EXTRACT(EPOCH FROM LEAST(r.end_time, b.w_end)
                            - GREATEST(r.start_time, b.w_start)) / 3600 AS hours
    FROM Rentals r
    CROSS JOIN bounds b
    WHERE r.start_time < b.w_end
      AND r.end_time   > b.w_start
)
SELECT c.model,
       COUNT(DISTINCT c.car_id) AS cars,
       ROUND(COALESCE(SUM(u.hours), 0) / COUNT(DISTINCT c.car_id) / 7, 2)
           AS avg_hours_per_car_per_day
FROM Cars c
LEFT JOIN usage u ON u.car_id = c.car_id
GROUP BY c.model
ORDER BY c.model;`,
          expectSubset: [{ model: 'Kia Rio', cars: 2, avg_hours_per_car_per_day: '0.50' }],
        },
        {
          id: 'v3-q6',
          title: '3.6. «Опасное вождение» сегодня: > 120 км/ч больше двух раз подряд',
          about: 'Находит в сегодняшней телеметрии серии из трёх и более подряд идущих точек одной поездки со скоростью выше 120 км/ч.',
          why: 'Это классическая задача «gaps and islands». Разница двух ROW_NUMBER (по всей поездке и по поездке вместе с признаком fast) одинакова у всех точек одной непрерывной серии. По этой разнице группируем и считаем длину серии.',
          fix: 'В разборе быстрые точки отфильтровывались до LAG, после чего считалось общее число «пар». Так не проверяется «подряд» и не различаются отдельные серии. Кроме того, «больше двух раз» значит 3 и больше, а не 2.',
          code: `WITH today AS (
    SELECT rental_id, recorded_at, speed_kmh,
           speed_kmh > 120 AS fast
    FROM Telemetry
    WHERE recorded_at >= CURRENT_DATE
),
islands AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY rental_id ORDER BY recorded_at)
         - ROW_NUMBER() OVER (PARTITION BY rental_id, fast ORDER BY recorded_at) AS grp
    FROM today
)
SELECT rental_id,
       MIN(recorded_at) AS from_time,
       MAX(recorded_at) AS to_time,
       COUNT(*)         AS points_in_row,
       MAX(speed_kmh)   AS max_speed
FROM islands
WHERE fast
GROUP BY rental_id, grp
HAVING COUNT(*) > 2
ORDER BY rental_id, from_time;`,
          expectSubset: [{ rental_id: 1, points_in_row: 3 }],
          expectAbsent: [{ rental_id: 2 }],
        },
        {
          id: 'v3-q7',
          title: '3.7. Топ-5 простаивающих машин за вчера',
          about: 'По логу статусов строит интервалы «статус действует с … до …», обрезает их по границам вчерашнего дня и суммирует часы в статусе available. Выводит 5 машин с наибольшей суммой.',
          why: 'LEAD(changed_at) даёт конец интервала, то есть момент следующей записи. Важно учесть статус, установленный ещё до вчерашнего дня: машина могла стоять свободной с позавчера. Поэтому лог по дате до LEAD не фильтруется, а интервалы обрезаются через GREATEST и LEAST.',
          fix: 'В разборе лог сначала фильтровался по вчерашней дате. Из-за этого терялось время от полуночи до первой записи за день.',
          code: `WITH bounds AS (
    SELECT (CURRENT_DATE - 1)::timestamptz AS d_start,
           CURRENT_DATE::timestamptz       AS d_end
),
intervals AS (
    SELECT car_id, status,
           changed_at AS from_ts,
           LEAD(changed_at) OVER (PARTITION BY car_id ORDER BY changed_at) AS to_ts
    FROM CarStatusLog
),
clipped AS (
    SELECT i.car_id,
           GREATEST(i.from_ts, b.d_start)                 AS s,
           LEAST(COALESCE(i.to_ts, now()), b.d_end)       AS e
    FROM intervals i
    CROSS JOIN bounds b
    WHERE i.status = 'available'
      AND i.from_ts < b.d_end
      AND COALESCE(i.to_ts, now()) > b.d_start
)
SELECT c.car_id, c.license_plate,
       ROUND(SUM(EXTRACT(EPOCH FROM cl.e - cl.s)) / 3600, 2) AS idle_hours
FROM clipped cl
JOIN Cars c ON c.car_id = cl.car_id
GROUP BY c.car_id, c.license_plate
ORDER BY idle_hours DESC
LIMIT 5;`,
          expectFirst: { car_id: 1, idle_hours: '20.00' },
        },
        {
          id: 'v3-q8',
          title: '3.8. «Круговые» поездки: финиш ≤ 200 м от старта, пробег > 5 км',
          about: 'Считает пробег каждой поездки как сумму расстояний между соседними точками телеметрии и находит поездки, которые закончились не дальше 200 м от старта при пробеге больше 5 км.',
          why: 'По условию пробег вычисляется по телеметрии, поэтому LAG(location) даёт предыдущую точку, а SUM(ST_Distance) даёт длину пути. Близость старта и финиша проверяется через ST_DWithin(…, 200).',
          fix: 'В разборе использовался готовый столбец mileage_km, хотя условие требует вычислять пробег по телеметрии.',
          code: `WITH steps AS (
    SELECT rental_id,
           ST_Distance(location,
                       LAG(location) OVER (PARTITION BY rental_id
                                           ORDER BY recorded_at)) AS step_m
    FROM Telemetry
),
mileage AS (
    SELECT rental_id, SUM(step_m) / 1000 AS km      -- первая точка: NULL, SUM её пропускает
    FROM steps
    GROUP BY rental_id
)
SELECT r.rental_id, r.customer_id, r.car_id,
       ROUND(m.km::numeric, 2)                                    AS mileage_km,
       ROUND(ST_Distance(r.start_location, r.end_location)::numeric) AS start_to_end_m
FROM Rentals r
JOIN mileage m ON m.rental_id = r.rental_id
WHERE r.end_time IS NOT NULL
  AND ST_DWithin(r.start_location, r.end_location, 200)
  AND m.km > 5;`,
          expectSubset: [{ rental_id: 3 }],
          expectAbsent: [{ rental_id: 1 }, { rental_id: 2 }],
        },
      ],
    },
  ],
};
