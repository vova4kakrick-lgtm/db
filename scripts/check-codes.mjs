// Проверяет SQL вкладки «Коды 2025» (content/codes-2025.js) в PostgreSQL 18 (PGlite).
// Для каждого варианта: чистая БД → DDL варианта → тестовые данные
// content/fixtures/<fixture>.sql → каждый запрос варианта.
// PostGIS в PGlite нет, поэтому для варианта 3 тип GEOGRAPHY и функции
// ST_MakePoint / ST_Distance / ST_DWithin подменяются заглушкой (сфера, метры).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { CONTENT_DIR } from '../src/content.js';
import codes from '../content/codes-2025.js';

const POSTGIS_STUB = `
CREATE TYPE geography AS (lon float8, lat float8);
CREATE FUNCTION ST_MakePoint(lon float8, lat float8) RETURNS geography
  LANGUAGE sql IMMUTABLE AS $$ SELECT ROW(lon, lat)::geography $$;
CREATE FUNCTION ST_Distance(a geography, b geography) RETURNS float8
  LANGUAGE sql IMMUTABLE AS $$
    SELECT 2 * 6371008.8 * asin(sqrt(
      power(sin(radians((b).lat - (a).lat) / 2), 2)
      + cos(radians((a).lat)) * cos(radians((b).lat))
      * power(sin(radians((b).lon - (a).lon) / 2), 2))) $$;
CREATE FUNCTION ST_DWithin(a geography, b geography, d float8) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$ SELECT ST_Distance(a, b) <= d $$;
`;

const stubPostgis = (sql) =>
  sql.replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '').replace(/GEOGRAPHY\(POINT,\s*4326\)/gi, 'geography');

function normalize(rows) {
  return rows.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v instanceof Date ? v.toISOString() : v])),
  );
}
const matches = (row, want) => Object.keys(want).every((k) => JSON.stringify(row[k]) === JSON.stringify(want[k]));

let failed = 0;
for (const variant of codes.variants) {
  const db = await PGlite.create();
  const prep = (sql) => (variant.postgis ? stubPostgis(sql) : sql);
  try {
    await db.exec("SET TIME ZONE 'UTC';");
    if (variant.postgis) await db.exec(POSTGIS_STUB);
    const [ddl, ...queries] = variant.items;
    await db.exec(prep(ddl.code));
    console.log(`ok   ${ddl.id} (схема создана)`);
    await db.exec(prep(await readFile(path.join(CONTENT_DIR, 'fixtures', `${variant.fixture}.sql`), 'utf8')));
    for (const item of queries) {
      try {
        const res = await db.exec(prep(item.code));
        const rows = normalize(res[res.length - 1]?.rows || []);
        if (!rows.length) throw new Error('пустой результат на тестовых данных');
        for (const want of item.expectSubset || []) {
          if (!rows.some((r) => matches(r, want))) throw new Error(`нет строки ${JSON.stringify(want)}`);
        }
        for (const bad of item.expectAbsent || []) {
          if (rows.some((r) => matches(r, bad))) throw new Error(`лишняя строка ${JSON.stringify(bad)}`);
        }
        if (item.expectFirst && !matches(rows[0], item.expectFirst)) throw new Error(`первая строка не ${JSON.stringify(item.expectFirst)}`);
        if (item.maxPerKey) {
          const cnt = {};
          for (const r of rows) cnt[r[item.maxPerKey.key]] = (cnt[r[item.maxPerKey.key]] || 0) + 1;
          if (Object.values(cnt).some((n) => n > item.maxPerKey.max)) throw new Error(`больше ${item.maxPerKey.max} строк на ${item.maxPerKey.key}`);
        }
        if (process.env.SHOW) console.log(`  ${item.id}:`, JSON.stringify(rows));
        console.log(`ok   ${item.id} — строк: ${rows.length}`);
      } catch (e) {
        failed++;
        console.error(`FAIL ${item.id}: ${e.message}`);
      }
    }
  } catch (e) {
    failed++;
    console.error(`FAIL ${variant.id}: ${e.message}`);
  } finally {
    await db.close();
  }
}
if (failed) {
  console.error(`\nОшибок: ${failed}`);
  process.exit(1);
}
console.log('\nВсе коды вкладки «Коды 2025» выполнены успешно.');
