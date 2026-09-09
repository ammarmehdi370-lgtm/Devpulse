"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
exports.initializeDatabase = initializeDatabase;
exports.getDatabaseStatus = getDatabaseStatus;
const pg_1 = require("pg");
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/devpulse';
exports.database = new pg_1.Pool({ connectionString: databaseUrl });
async function initializeDatabase() {
    await exports.database.query(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
}
async function getDatabaseStatus() {
    const result = await exports.database.query('SELECT 1 AS connected');
    return {
        connected: result.rows[0]?.connected === 1,
        host: new URL(databaseUrl).hostname,
        database: new URL(databaseUrl).pathname.slice(1),
    };
}
