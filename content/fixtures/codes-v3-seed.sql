-- Тестовые данные для вкладки «Коды 2025», вариант 3 (каршеринг).
-- Схема создаётся кодом v3-ddl из content/codes-2025.js.
-- Точка отсчёта — (37.6173, 55.7558); ST_MakePoint(долгота, широта).
INSERT INTO Cars (license_plate, model, fuel_level, status, current_location) VALUES
  ('А001АА77', 'Kia Rio', 80, 'available',   ST_MakePoint(37.6200, 55.7560)),  -- ~170 м
  ('А002АА77', 'Kia Rio', 30, 'available',   ST_MakePoint(37.6180, 55.7559)),  -- мало топлива
  ('А003АА77', 'VW Polo', 90, 'in_use',      ST_MakePoint(37.6175, 55.7558)),  -- занят
  ('А004АА77', 'VW Polo', 90, 'available',   ST_MakePoint(37.7000, 55.8000));  -- далеко

INSERT INTO Customers (full_name) VALUES ('Нерешительный'), ('Обычный');

-- 1 клиент: 4 автоотмены за сутки; 2 клиент: 3 за сутки + 1 старая
INSERT INTO Reservations (customer_id, car_id, created_at, expires_at, status)
SELECT 1, 1, NOW() - g * INTERVAL '1 hour', NOW() - g * INTERVAL '1 hour' + INTERVAL '15 minutes', 'expired'
FROM generate_series(1, 4) AS g;
INSERT INTO Reservations (customer_id, car_id, created_at, expires_at, status)
SELECT 2, 2, NOW() - g * INTERVAL '1 hour', NOW() - g * INTERVAL '1 hour' + INTERVAL '15 minutes', 'expired'
FROM generate_series(1, 3) AS g;
INSERT INTO Reservations (customer_id, car_id, created_at, expires_at, status) VALUES
  (2, 2, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', 'expired'),
  (1, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 'converted'),   -- 9
  (2, 3, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 'converted'),   -- 10
  (1, 4, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day',  'converted');     -- 11

INSERT INTO Rentals (reservation_id, customer_id, car_id, start_time, end_time, start_location, end_location) VALUES
  -- 1: Kia Rio, 7 ч внутри прошлой недели
  (9, 1, 1,
   date_trunc('week', now()) - INTERVAL '6 days' + INTERVAL '10 hours',
   date_trunc('week', now()) - INTERVAL '6 days' + INTERVAL '17 hours',
   ST_MakePoint(37.6173, 55.7558), ST_MakePoint(37.6174, 55.7558)),
  -- 2: VW Polo, пересекает начало прошлой недели (в неделю попадает 1 ч)
  (10, 2, 3,
   date_trunc('week', now()) - INTERVAL '1 week' - INTERVAL '2 hours',
   date_trunc('week', now()) - INTERVAL '1 week' + INTERVAL '1 hour',
   ST_MakePoint(37.6173, 55.7558), ST_MakePoint(37.7000, 55.8000)),
  -- 3: «круговая»: туда ~2.7 км и обратно, финиш в ~50 м от старта
  (11, 1, 4,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '40 minutes',
   ST_MakePoint(37.6173, 55.7558), ST_MakePoint(37.6180, 55.7560));

-- Сегодняшняя телеметрия: в поездке 1 серия 130-135-140 (3 подряд) и серия из 2;
-- в поездке 2 нет трёх подряд.
INSERT INTO Telemetry (rental_id, recorded_at, location, speed_kmh)
SELECT 1, CURRENT_DATE::timestamptz + (i * INTERVAL '30 seconds'), ST_MakePoint(37.6173, 55.7558), s
FROM unnest(ARRAY[100, 130, 135, 140, 110, 125, 126]) WITH ORDINALITY AS u(s, i);
INSERT INTO Telemetry (rental_id, recorded_at, location, speed_kmh)
SELECT 2, CURRENT_DATE::timestamptz + (i * INTERVAL '30 seconds'), ST_MakePoint(37.6173, 55.7558), s
FROM unnest(ARRAY[130, 100, 130, 130, 100]) WITH ORDINALITY AS u(s, i);
INSERT INTO Telemetry (rental_id, recorded_at, location, speed_kmh) VALUES
  (3, NOW() - INTERVAL '1 day',                          ST_MakePoint(37.6173, 55.7558), 0),
  (3, NOW() - INTERVAL '1 day' + INTERVAL '20 minutes',  ST_MakePoint(37.6600, 55.7558), 60),
  (3, NOW() - INTERVAL '1 day' + INTERVAL '40 minutes',  ST_MakePoint(37.6180, 55.7560), 0);

-- Лог статусов: машина 1 свободна с позавчера до вчера 20:00 → 20 ч простоя вчера
INSERT INTO CarStatusLog (car_id, status, fuel_level, changed_at) VALUES
  (1, 'available',   80, (CURRENT_DATE - 2) + TIME '20:00'),
  (1, 'in_use',      80, (CURRENT_DATE - 1) + TIME '20:00'),
  (1, 'available',   75, CURRENT_DATE + TIME '01:00'),
  (2, 'available',   30, (CURRENT_DATE - 1) + TIME '10:00'),
  (2, 'in_use',      30, (CURRENT_DATE - 1) + TIME '15:00'),
  (3, 'maintenance', 90, (CURRENT_DATE - 3) + TIME '09:00'),
  (4, 'available',   90, (CURRENT_DATE - 1) + TIME '22:00');
