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

  // Ensure demo data exists
  await ensureSeedData();

  logger.info('Starting server...');
  require('./index');
}

async function ensureSeedData() {
  const pool = require('./config/database');
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM restaurants WHERE is_active = true');
    const count = parseInt(rows[0].cnt);
    if (count > 0) return;

    logger.info('No active restaurants found — seeding demo data...');
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations/102_seed_demo_restaurants.sql'),
      'utf8'
    );

    // Split by semicolons but keep DO $$ blocks intact
    const blocks = [];
    let current = '';
    let inDollarBlock = false;
    for (const line of sql.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DO $$') || trimmed.startsWith('DO $')) {
        inDollarBlock = true;
      }
      current += line + '\n';
      if (inDollarBlock && trimmed.endsWith('$$;')) {
        blocks.push(current.trim());
        current = '';
        inDollarBlock = false;
      } else if (!inDollarBlock && trimmed.endsWith(';') && current.trim().length > 0) {
        blocks.push(current.trim());
        current = '';
      }
    }
    if (current.trim().length > 0) blocks.push(current.trim());

    let ok = 0;
    let skipped = 0;
    for (const block of blocks) {
      const clean = block.replace(/--[^\n]*/g, '').trim();
      if (!clean || clean === ';') continue;
      try {
        await pool.query(clean);
        ok++;
      } catch (err) {
        skipped++;
        logger.warn(`Seed statement skipped: ${err.message.slice(0, 120)}`);
      }
    }
    logger.info(`Seed data: ${ok} statements ok, ${skipped} skipped`);
  } catch (err) {
    logger.error('Seed data fallback failed:', err.message);
  }
}

start();
