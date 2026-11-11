import { app } from './app.js';
import { pool } from './db.js';

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Sweety API running on http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
