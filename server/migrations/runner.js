/**
 * DB Migration Runner
 *
 * - server/migrations/ 안의 SQL 파일을 번호 순서대로 실행
 * - schema_migrations 테이블에 실행 이력 기록
 * - 이미 실행된 마이그레이션은 건너뜀
 *
 * Usage:
 *   node server/migrations/runner.js          # 모든 미실행 마이그레이션 실행
 *   node server/migrations/runner.js --status # 현재 상태 출력
 *   node server/migrations/runner.js --dry    # 실행 대상만 미리보기
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const logger = require('../config/logger');

const MIGRATIONS_DIR = __dirname;

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations() {
  const { rows } = await pool.query(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  );
  return new Set(rows.map((r) => r.filename));
}

function getPendingMigrations(executed) {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.filter((f) => !executed.has(f));
}

async function runMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    await client.query('COMMIT');
    logger.info(`Migration applied: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Migration failed: ${filename}`, { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

async function status() {
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();
  const pending = getPendingMigrations(executed);

  console.log('\n=== Migration Status ===');
  console.log(`Executed: ${executed.size}`);
  console.log(`Pending:  ${pending.length}`);

  if (executed.size > 0) {
    console.log('\nExecuted:');
    for (const f of executed) console.log(`  ✓ ${f}`);
  }
  if (pending.length > 0) {
    console.log('\nPending:');
    for (const f of pending) console.log(`  ○ ${f}`);
  }
  console.log('');
}

async function run({ dry = false } = {}) {
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();
  const pending = getPendingMigrations(executed);

  if (pending.length === 0) {
    console.log('All migrations are up to date.');
    return;
  }

  console.log(`\n${pending.length} pending migration(s):\n`);
  for (const f of pending) console.log(`  → ${f}`);

  if (dry) {
    console.log('\n(dry run — no changes applied)\n');
    return;
  }

  console.log('');
  for (const f of pending) {
    await runMigration(f);
  }
  console.log(`\nDone. ${pending.length} migration(s) applied.\n`);
}

// CLI entrypoint
if (require.main === module) {
  const args = process.argv.slice(2);

  const action = args.includes('--status')
    ? status()
    : run({ dry: args.includes('--dry') });

  action
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration error:', err.message);
      process.exit(1);
    });
}

module.exports = { run, status, ensureMigrationsTable };
