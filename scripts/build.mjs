// Сборка сайта: node scripts/build.mjs -> dist/
import { build } from '../src/build.js';

const t0 = Date.now();
const r = await build();
console.log(`Собрано за ${Date.now() - t0} мс: тем ${r.topics}, задач ${r.tasks}, вопросов ${r.questions} -> ${r.dist}`);
