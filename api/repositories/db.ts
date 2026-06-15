import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'kiln.db');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(buf);
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS target_curve (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      points_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS temperature_reading (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      curve_id INTEGER NOT NULL,
      minute REAL NOT NULL,
      temperature REAL NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (curve_id) REFERENCES target_curve(id) ON DELETE CASCADE,
      UNIQUE(curve_id, minute) ON CONFLICT REPLACE
    )
  `);

  dbInstance.run(`
    CREATE INDEX IF NOT EXISTS idx_reading_curve_minute
    ON temperature_reading(curve_id, minute)
  `);

  persistDb();
  return dbInstance;
}

export function persistDb(): void {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buf);
}
