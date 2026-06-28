/**
 * Load environment from demos/.env (and an optional orchestrator/.env override) before any
 * other module reads process.env. Imported first in index.ts so config.ts sees the values.
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url)); // .../orchestrator/src
config({ path: join(here, '../../.env') }); // demos/.env  (shared)
config({ path: join(here, '../.env') }); // orchestrator/.env (optional override)
