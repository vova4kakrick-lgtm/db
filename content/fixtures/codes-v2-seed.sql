-- Тестовые данные для вкладки «Коды 2025», вариант 2 (стриминг музыки).
-- Схема создаётся кодом v2-ddl из content/codes-2025.js.
INSERT INTO Artists (name) VALUES ('Artist A'), ('Artist B'), ('Artist C');

INSERT INTO Albums (title, release_date) VALUES
  ('Прошлогодний альбом', (date_trunc('year', now()) - INTERVAL '1 year' + INTERVAL '30 days')::date),
  ('Старый альбом', DATE '2020-01-01');

INSERT INTO Tracks (album_id, track_number, title, duration_seconds, audio_url) VALUES
  (1, 1, 'Трек 1', 200, 's3://audio/1.mp3'),
  (1, 2, 'Трек 2', 200, 's3://audio/2.mp3'),
  (1, 3, 'Трек 3', 100, 's3://audio/3.mp3'),
  (2, 1, 'Трек 4', 180, 's3://audio/4.mp3'),
  (2, 2, 'Трек 5', 180, 's3://audio/5.mp3'),
  (2, 3, 'Трек 6', 180, 's3://audio/6.mp3'),
  (2, 4, 'Трек 7', 180, 's3://audio/7.mp3'),
  (2, 5, 'Трек 8', 180, 's3://audio/8.mp3');

INSERT INTO TrackArtists VALUES (1, 1), (2, 1), (3, 2), (4, 1), (5, 2), (6, 3), (7, 3), (8, 3);

INSERT INTO Users (username) VALUES ('u1'), ('u2'), ('u3');

-- 1: только Artist A; 2 и 3: пять одинаковых треков разных артистов
INSERT INTO Playlists (user_id, name) VALUES (1, 'Только A'), (2, 'Микс'), (3, 'Микс 2');
INSERT INTO PlaylistTracks VALUES
  (1, 1, 1), (1, 2, 2),
  (2, 1, 1), (2, 3, 2), (2, 4, 3), (2, 5, 4), (2, 6, 5),
  (3, 1, 1), (3, 3, 2), (3, 4, 3), (3, 5, 4), (3, 6, 5);

-- ещё 49 плейлистов с треком 6 → всего 51 плейлист
INSERT INTO Playlists (user_id, name)
SELECT 3, 'Трек 6 #' || g FROM generate_series(1, 49) AS g;
INSERT INTO PlaylistTracks (playlist_id, track_id, position)
SELECT playlist_id, 6, 1 FROM Playlists WHERE playlist_id > 3;

INSERT INTO ListenEvents (user_id, track_id, started_at, listened_seconds) VALUES
  -- u1 дослушал весь прошлогодний альбом
  (1, 1, NOW() - INTERVAL '1 minute', 190),
  (1, 1, NOW() - INTERVAL '2 minutes', 195),
  (1, 2, NOW() - INTERVAL '3 minutes', 199),
  (1, 3, NOW() - INTERVAL '4 minutes', 90),
  -- u2 начал альбом, но дослушал только первый трек
  (2, 1, NOW() - INTERVAL '5 minutes', 170),
  (2, 3, NOW() - INTERVAL '6 minutes', 10),
  -- старый альбом
  (1, 5, NOW() - INTERVAL '7 minutes', 170),
  (1, 6, NOW() - INTERVAL '8 minutes', 170),
  (1, 7, NOW() - INTERVAL '9 minutes', 170),
  (2, 6, NOW() - INTERVAL '10 minutes', 20);
