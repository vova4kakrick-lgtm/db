-- Тестовые данные для вкладки «Коды 2025», вариант 1 (логистический центр).
-- Схема создаётся кодом v1-ddl из content/codes-2025.js.
INSERT INTO Products (name, weight_kg, volume_m3) VALUES
  ('Кружка', 0.300, 0.002),
  ('Книга',  0.500, 0.003),
  ('Лампа',  1.200, 0.010),
  ('Кресло', 15.000, 0.300);

INSERT INTO StorageBins (bin_code, product_id, quantity, bin_type) VALUES
  ('A-01', 1, 0,  'automated'),   -- пусто, но не ручная
  ('M-01', 2, 10, 'manual'),
  ('M-02', 3, 0,  'manual'),      -- пусто и ручная → задание 4
  ('M-03', 4, 5,  'manual');

INSERT INTO Orders (created_at, delivery_address, status) VALUES
  (NOW() - INTERVAL '5 hours', 'Москва, ул. А, 1', 'picking'),   -- 1: дольше 3 ч
  (NOW() - INTERVAL '1 hour',  'Москва, ул. Б, 2', 'picking'),   -- 2: меньше 3 ч
  (NOW() - INTERVAL '1 day',   'Москва, ул. В, 3', 'shipped'),   -- 3: маленький, 2 коробки
  (NOW() - INTERVAL '1 day',   'Москва, ул. Г, 4', 'shipped'),   -- 4: большой, 2 коробки
  (NOW() - INTERVAL '2 hours', 'Москва, ул. Д, 5', 'packing');

INSERT INTO OrderItems (order_id, product_id, quantity) VALUES
  (1, 1, 2),
  (2, 1, 3),
  (3, 1, 2), (3, 2, 1),
  (4, 4, 1);

INSERT INTO Pickers (full_name) VALUES ('Иванов'), ('Петров'), ('Сидоров');

INSERT INTO PickingTasks (order_id, picker_id) VALUES (1, 1), (2, 2), (3, 1), (4, 3);

INSERT INTO Picks (task_id, bin_id, product_id, picker_id, quantity_picked, picked_at) VALUES
  -- задание 1 собрано верно
  (1, 1, 1, 1, 2, (CURRENT_DATE - 1) + TIME '10:00'),
  -- задание 2: недобор кружек и лишняя лампа
  (2, 1, 1, 2, 2, NOW() - INTERVAL '30 minutes'),
  (2, 3, 3, 2, 1, NOW() - INTERVAL '20 minutes'),
  -- задание 3: двое сборщиков в пределах часа
  (3, 1, 1, 1, 1, (CURRENT_DATE - 1) + TIME '11:00'),
  (3, 1, 1, 1, 1, (CURRENT_DATE - 1) + TIME '11:15'),
  (3, 2, 2, 2, 1, (CURRENT_DATE - 1) + TIME '11:30'),
  -- задание 4: один сборщик
  (4, 4, 4, 1, 1, (CURRENT_DATE - 1) + TIME '12:00');

INSERT INTO Packages (order_id, tracking_number) VALUES
  (3, 'TRK-0001'), (3, 'TRK-0002'),
  (4, 'TRK-0003'), (4, 'TRK-0004');
