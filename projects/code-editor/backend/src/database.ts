import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/devpulse';

export const database = new Pool({ connectionString: databaseUrl });

export async function initializeDatabase() {
  await database.query(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
}

export async function getDatabaseStatus() {
  const result = await database.query('SELECT 1 AS connected');
  return {
    connected: result.rows[0]?.connected === 1,
    host: new URL(databaseUrl).hostname,
    database: new URL(databaseUrl).pathname.slice(1),
  };
}
