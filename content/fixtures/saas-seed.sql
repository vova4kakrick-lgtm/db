-- Тестовые данные варианта А. Даты заданы относительно начала текущего месяца (M0),
-- чтобы отчёты «за последние месяцы» давали стабильный результат.
INSERT INTO customers (name, email) VALUES
  ('Иванов',   'ivanov@example.com'),    -- 1
  ('Петров',   'petrov@example.com'),    -- 2
  ('Сидорова', 'sidorova@example.com');  -- 3

INSERT INTO organizations (customer_id, name) VALUES
  (1, 'Альфа'), (1, 'Бета'), (2, 'Гамма'), (3, 'Дельта');

INSERT INTO plans (name, monthly_price, max_users, max_storage_gb) VALUES
  ('Free', 0, 3, 1), ('Pro', 50, 5, 100), ('Enterprise', 500, 100, 1000);

CREATE TEMP TABLE m AS SELECT date_trunc('month', current_date)::date AS m0;

INSERT INTO subscriptions (org_id, plan_id, start_date, end_date, status)
SELECT org_id, plan_id, s, e, st FROM m, LATERAL (VALUES
  -- Альфа: Pro без перерывов больше 7 дней с M0-30 мес.
  (1, 2, (m0 - interval '30 months')::date,           (m0 - interval '18 months')::date - 1, 'cancelled'),
  (1, 2, (m0 - interval '18 months')::date + 3,       (m0 - interval '6 months')::date - 1,  'cancelled'),
  (1, 2, (m0 - interval '6 months')::date,            (m0 + interval '6 months')::date - 1,  'active'),
  -- Бета: бесплатный тариф
  (2, 1, (m0 - interval '12 months')::date,           (m0 + interval '12 months')::date - 1, 'active'),
  -- Гамма: Free -> Pro -> Enterprise
  (3, 1, (m0 - interval '20 months')::date,           (m0 - interval '8 months')::date - 1,  'cancelled'),
  (3, 2, (m0 - interval '8 months')::date,            (m0 - interval '2 months')::date - 1,  'cancelled'),
  (3, 3, (m0 - interval '2 months')::date,            (m0 + interval '10 months')::date - 1, 'active'),
  -- Дельта: Enterprise, перерыв 30 дней, последняя подписка закончилась в прошлом месяце
  (4, 3, (m0 - interval '40 months')::date,           (m0 - interval '25 months')::date - 1, 'cancelled'),
  (4, 3, (m0 - interval '25 months')::date + 30,      m0 - 10,                               'cancelled')
) AS v(org_id, plan_id, s, e, st);

INSERT INTO invoices (subscription_id, amount, issued_at, paid_at, status) VALUES
  (3, 50,  current_date - 40, current_date - 38, 'paid'),
  (3, 50,  current_date - 5,  NULL,              'pending'),   -- ещё не просрочен
  (7, 500, current_date - 15, NULL,              'failed'),    -- просрочен > 10 дней
  (9, 500, current_date - 45, current_date - 44, 'paid');

INSERT INTO users (name, email)
SELECT 'Пользователь ' || g, 'user' || g || '@example.com' FROM generate_series(1, 10) AS g;

INSERT INTO org_members (org_id, user_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),   -- Альфа (Pro, лимит 5): 6 участников
  (2, 7), (2, 8), (2, 9), (2, 10),                  -- Бета (Free, лимит 3): 4 участника
  (3, 1), (3, 7);                                   -- Гамма: 2 участника
