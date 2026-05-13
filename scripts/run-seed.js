const fs = require('fs');
const pool = require('../server/config/database');

async function seed() {
  const sql = fs.readFileSync('./server/migrations/102_seed_demo_restaurants.sql', 'utf8');

  const blocks = [];
  let current = '';
  let inDollarBlock = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DO $$')) inDollarBlock = true;
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
  if (current.trim()) blocks.push(current.trim());

  let ok = 0, skipped = 0;
  for (const block of blocks) {
    const clean = block.replace(/--[^\n]*/g, '').trim();
    if (!clean || clean === ';') continue;
    try {
      await pool.query(clean);
      ok++;
    } catch (err) {
      skipped++;
      console.log('SKIP:', err.message.slice(0, 120));
    }
  }
  console.log('Done:', ok, 'ok,', skipped, 'skipped');
  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
