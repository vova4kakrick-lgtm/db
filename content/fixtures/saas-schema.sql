-- Мидтерм 2025, вариант А: SaaS-сервис с подписками. Схема — решение задания 2.
CREATE TABLE customers (
  customer_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL UNIQUE
);

CREATE TABLE organizations (
  org_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES customers ON DELETE CASCADE,
  name        text NOT NULL
);

CREATE TABLE plans (
  plan_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           text NOT NULL UNIQUE CHECK (name IN ('Free', 'Pro', 'Enterprise')),
  monthly_price  numeric(10,2) NOT NULL CHECK (monthly_price >= 0),
  max_users      integer NOT NULL CHECK (max_users > 0),
  max_storage_gb integer NOT NULL CHECK (max_storage_gb > 0)
);

-- Продление = новая запись со сдвинутыми датами (история подписок сохраняется)
CREATE TABLE subscriptions (
  subscription_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id          bigint NOT NULL REFERENCES organizations ON DELETE CASCADE,
  plan_id         bigint NOT NULL REFERENCES plans ON DELETE RESTRICT,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  status          text NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled')),
  CHECK (end_date >= start_date)
);

CREATE TABLE invoices (
  invoice_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id bigint NOT NULL REFERENCES subscriptions ON DELETE CASCADE,
  amount          numeric(10,2) NOT NULL CHECK (amount >= 0),
  issued_at       date NOT NULL,
  paid_at         date,
  status          text NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
  CHECK ((status = 'paid') = (paid_at IS NOT NULL))
);

CREATE TABLE users (
  user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    text NOT NULL,
  email   text NOT NULL UNIQUE
);

-- Пользователь N:M Организация (приглашение к совместной работе)
CREATE TABLE org_members (
  org_id     bigint REFERENCES organizations ON DELETE CASCADE,
  user_id    bigint REFERENCES users ON DELETE CASCADE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX organizations_customer_idx ON organizations(customer_id);
CREATE INDEX subscriptions_org_idx      ON subscriptions(org_id, start_date);
CREATE INDEX subscriptions_plan_idx     ON subscriptions(plan_id);
CREATE INDEX invoices_subscription_idx  ON invoices(subscription_id);
CREATE INDEX org_members_user_idx       ON org_members(user_id);
-- Правило «пользователей не больше max_users тарифа» зависит от других таблиц:
-- декларативно не выражается, нужен триггер (или проверка в приложении).
