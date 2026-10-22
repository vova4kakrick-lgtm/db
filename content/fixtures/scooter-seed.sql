-- Тестовые данные варианта Б.
INSERT INTO parking_zones (name, center_lat, center_lon, radius_m) VALUES
  ('Центр', 55.7558, 37.6173, 300),
  ('Парк',  55.7300, 37.6000, 200);

INSERT INTO scooters (serial_no, model, battery_level, lat, lon, status) VALUES
  ('SC-001', 'Ninebot Max', 80, 55.7558, 37.6173, 'available'),
  ('SC-002', 'Ninebot Max', 10, 55.7700, 37.6500, 'available'),   -- брошенный
  ('SC-003', 'Xiaomi Pro',  12, 55.7300, 37.6000, 'available'),   -- свободен всего 3 часа
  ('SC-004', 'Xiaomi Pro',   5, 55.7300, 37.6000, 'charging');

INSERT INTO scooter_status_history VALUES
  (1, 'available', now() - interval '1 hour'),
  (2, 'in_use',    now() - interval '3 days'),
  (2, 'available', now() - interval '2 days'),
  (3, 'in_use',    now() - interval '4 hours'),
  (3, 'available', now() - interval '3 hours'),
  (4, 'charging',  now() - interval '1 day');

INSERT INTO users (name, phone) VALUES ('Ирина', '+70000000001'), ('Олег', '+70000000002'), ('Пётр', '+70000000003');

CREATE TEMP TABLE d AS SELECT date_trunc('day', now()) AS today;

INSERT INTO trips (user_id, scooter_id, started_at, start_lat, start_lon, ended_at, end_lat, end_lon)
SELECT * FROM (VALUES
  -- прошлые поездки с фиксированными датами (понедельник 05.10.2026 и вторник 06.10.2026)
  (1, 1, timestamptz '2026-10-05 08:10+00', 55.7558, 37.6173, timestamptz '2026-10-05 08:25+00', 55.7560, 37.6180),  -- 1
  (2, 2, timestamptz '2026-10-05 08:40+00', 55.7558, 37.6173, timestamptz '2026-10-05 08:55+00', 55.7700, 37.6500),  -- 2: вне зон
  (3, 3, timestamptz '2026-10-05 18:05+00', 55.7558, 37.6173, timestamptz '2026-10-05 18:20+00', 55.7300, 37.6000),  -- 3
  (1, 1, timestamptz '2026-10-06 19:00+00', 55.7300, 37.6000, timestamptz '2026-10-06 19:20+00', 55.7558, 37.6173),  -- 4
  (2, 2, timestamptz '2026-10-06 19:30+00', 55.7558, 37.6173, timestamptz '2026-10-06 19:50+00', 55.7300, 37.6001),  -- 5
  (3, 3, timestamptz '2026-10-06 09:00+00', 55.7558, 37.6173, timestamptz '2026-10-06 09:10+00', 55.7301, 37.6000)   -- 6
) AS v;

INSERT INTO trips (user_id, scooter_id, started_at, start_lat, start_lon, ended_at, end_lat, end_lon)
SELECT u, s, d.today + st, slat, slon, d.today + en, elat, elon FROM d, (VALUES
  (1, 1, interval '10:00', 55.7558, 37.6173, interval '10:10', 55.7570, 37.6200),   -- 7
  (1, 3, interval '10:13', 55.7574, 37.6205, interval '10:28', 55.7302, 37.6002),   -- 8: «пересадка» после 7
  (2, 2, interval '11:00', 55.7300, 37.6000, interval '11:10', 55.7700, 37.6500),   -- 9: вне зон
  (2, 1, interval '11:12', 55.7558, 37.6173, interval '11:20', 55.7559, 37.6175)    -- 10: далеко от конца 9
) AS v(u, s, st, slat, slon, en, elat, elon);

-- Ещё две прошлые поездки, чтобы пиковые часы понедельника и вторника были однозначны
INSERT INTO trips (user_id, scooter_id, started_at, start_lat, start_lon, ended_at, end_lat, end_lon) VALUES
  (3, 4, '2026-10-05 08:15+00', 55.7558, 37.6173, '2026-10-05 08:30+00', 55.7559, 37.6174),   -- 11
  (3, 4, '2026-10-06 19:40+00', 55.7300, 37.6000, '2026-10-06 19:55+00', 55.7301, 37.6001);   -- 12

-- Телеметрия сегодняшних поездок: точка каждые 15 секунд, скорость base + (g % 10)
INSERT INTO telemetry (trip_id, recorded_at, lat, lon, speed_kmh)
SELECT t.trip_id, t.started_at + g * interval '15 seconds', t.start_lat, t.start_lon, b.base + (g % 10)
FROM trips AS t
JOIN (VALUES (7, 13), (8, 9), (9, 16), (10, 6)) AS b(trip_id, base) ON b.trip_id = t.trip_id
CROSS JOIN generate_series(0, 30) AS g;

INSERT INTO bills (trip_id, unlock_fee, minutes, distance_km, amount) VALUES
  (1, 50, 15, 1.2, 200), (2, 50, 15, 2.5, 230), (3, 50, 15, 1.0, 190), (4, 50, 20, 1.5, 250),
  (5, 50, 20, 2.0, 260), (6, 50, 10, 0.8, 150), (7, 50, 10, 1.1, 160), (8, 50, 15, 0.9, 185),
  (9, 50, 10, 3.0, 200), (10, 50, 8, 0.5, 120);

INSERT INTO issues (scooter_id, user_id, description) VALUES (2, 2, 'сломан тормоз'), (4, 1, 'не работает фара');
