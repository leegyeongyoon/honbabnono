/**
 * Server startup with auto-migration
 * - Runs pending DB migrations before starting the server
 */
const { run } = require('./migrations/runner');
const logger = require('./config/logger');

async function start() {
  try {
    logger.info('Running pending migrations...');
    await run();
    logger.info('Migrations complete. Starting server...');
  } catch (err) {
    logger.error('Migration failed:', err.message);
    logger.info('Starting server despite migration failure...');
  }

  // Load the main server
  require('./index');
}

start();
