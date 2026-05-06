/**
 * Server startup with auto-migration
 * - Runs pending DB migrations before starting the server
 * - Ensures v2 pivot tables exist (fallback if earlier migrations block)
 */
const fs = require('fs');
const path = require('path');
const { run } = require('./migrations/runner');
const logger = require('./config/logger');

async function ensureV2Tables() {
  const pool = require('./config/database');
  try {
    const { rows } = await pool.query("SELECT to_regclass('public.restaurants') AS exists");
    if (rows[0].exists) return;

    logger.info('v2 tables not found — creating directly...');
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations/100_create_pivot_v2_tables.sql'),
      'utf8'
    );

    // Split into individual statements to avoid single-transaction rollback
    // when one statement fails (e.g., conflicting existing tables)
    const statements = sql
      .split(';')
      .map(s => s.replace(/--[^\n]*/g, '').trim())
      .filter(s => s.length > 0);

    let ok = 0;
    let skipped = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        ok++;
      } catch (err) {
        skipped++;
        logger.warn(`v2 migration statement skipped: ${err.message}`);
      }
    }
    logger.info(`v2 tables: ${ok} statements ok, ${skipped} skipped`);
  } catch (err) {
    logger.error('v2 tables fallback failed:', err.message);
  }
}

async function start() {
  try {
    logger.info('Running pending migrations...');
    await run();
    logger.info('Migrations complete.');
  } catch (err) {
    logger.error('Migration runner failed:', err.message);
    logger.info('Continuing with v2 fallback...');
  }

  // Always ensure v2 tables exist, even if migration runner failed midway
  await ensureV2Tables();

  logger.info('Starting server...');
  require('./index');
}

start();
