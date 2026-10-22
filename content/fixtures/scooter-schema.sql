-- Мидтерм 2025, вариант Б: кикшеринг. Схема — решение задания 2.
-- Пространственных типов (PostGIS) в материалах курса нет, поэтому координаты хранятся
-- числами, парковочная зона упрощена до круга (центр + радиус), а расстояние считает
-- функция distance_m (формула гаверсинуса) — это дополнение составителя.
CREATE FUNCTION distance_m(lat1 double precision, lon1 double precision,
                           lat2 double precision, lon2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 2 * 6371000 * asin(sqrt(
           power(sin(radians(lat2 - lat1) / 2), 2) +
           cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)))
$$;

CREATE TABLE parking_zones (
  zone_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  center_lat double precision NOT NULL,
  center_lon double precision NOT NULL,
  radius_m   double precision NOT NULL CHECK (radius_m > 0)
);

CREATE TABLE scooters (
  scooter_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  serial_no     text NOT NULL UNIQUE,
  model         text NOT NULL,
  battery_level smallint NOT NULL CHECK (battery_level BETWEEN 0 AND 100),
  lat           double precision,
  lon           double precision,
  status        text NOT NULL CHECK (status IN ('available', 'in_use', 'charging', 'maintenance'))
);

-- История статусов и зарядок
CREATE TABLE scooter_status_history (
  scooter_id bigint REFERENCES scooters ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('available', 'in_use', 'charging', 'maintenance')),
  changed_at timestamptz NOT NULL,
  PRIMARY KEY (scooter_id, changed_at)
);

CREATE TABLE charge_history (
  charge_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scooter_id   bigint NOT NULL REFERENCES scooters ON DELETE CASCADE,
  started_at   timestamptz NOT NULL,
  finished_at  timestamptz,
  level_before smallint CHECK (level_before BETWEEN 0 AND 100),
  level_after  smallint CHECK (level_after BETWEEN 0 AND 100)
);

CREATE TABLE users (
  user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    text NOT NULL,
  phone   text NOT NULL UNIQUE
);

CREATE TABLE trips (
  trip_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users ON DELETE RESTRICT,
  scooter_id bigint NOT NULL REFERENCES scooters ON DELETE RESTRICT,
  started_at timestamptz NOT NULL,
  start_lat  double precision NOT NULL,
  start_lon  double precision NOT NULL,
  ended_at   timestamptz,                 -- NULL, пока поездка идёт
  end_lat    double precision,
  end_lon    double precision,
  CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- Телеметрия каждые 15 секунд: слабая сущность поездки
CREATE TABLE telemetry (
  trip_id     bigint REFERENCES trips ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  lat         double precision NOT NULL,
  lon         double precision NOT NULL,
  speed_kmh   real NOT NULL CHECK (speed_kmh >= 0),
  PRIMARY KEY (trip_id, recorded_at)
);

-- Счёт: ровно один на поездку (1:1 через UNIQUE)
CREATE TABLE bills (
  bill_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id     bigint NOT NULL UNIQUE REFERENCES trips ON DELETE RESTRICT,
  unlock_fee  numeric(8,2) NOT NULL CHECK (unlock_fee >= 0),
  minutes     integer NOT NULL CHECK (minutes >= 0),
  distance_km numeric(8,2) NOT NULL CHECK (distance_km >= 0),   -- пробег по телеметрии
  amount      numeric(10,2) NOT NULL CHECK (amount >= 0)
);

CREATE TABLE issues (
  issue_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scooter_id  bigint NOT NULL REFERENCES scooters ON DELETE CASCADE,
  user_id     bigint REFERENCES users ON DELETE SET NULL,
  description text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX trips_user_time_idx    ON trips(user_id, started_at);
CREATE INDEX trips_scooter_idx      ON trips(scooter_id);
CREATE INDEX charge_scooter_idx     ON charge_history(scooter_id);
CREATE INDEX issues_scooter_idx     ON issues(scooter_id);
