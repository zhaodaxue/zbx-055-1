import type { Database } from 'sql.js';
import type { TemperatureReading } from '../../shared/types.js';
import { persistDb } from './db.js';

export class ReadingRepository {
  constructor(private db: Database) {}

  create(
    curveId: number,
    minute: number,
    temperature: number
  ): TemperatureReading {
    const stmt = this.db.prepare(
      'INSERT INTO temperature_reading (curve_id, minute, temperature) VALUES (?, ?, ?)'
    );
    stmt.run([curveId, minute, temperature]);
    persistDb();

    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
    const rows = this.db.exec(
      `SELECT id, curve_id, minute, temperature, timestamp
       FROM temperature_reading WHERE id = ${id}`
    );
    const row = rows[0].values[0] as [number, number, number, number, string];
    return {
      id: row[0],
      curveId: row[1],
      minute: row[2],
      temperature: row[3],
      timestamp: row[4],
    };
  }

  findByCurveId(
    curveId: number,
    fromMinute?: number,
    toMinute?: number
  ): TemperatureReading[] {
    let sql =
      'SELECT id, curve_id, minute, temperature, timestamp FROM temperature_reading WHERE curve_id = ?';
    const params: (number | string)[] = [curveId];
    if (fromMinute !== undefined) {
      sql += ' AND minute >= ?';
      params.push(fromMinute);
    }
    if (toMinute !== undefined) {
      sql += ' AND minute <= ?';
      params.push(toMinute);
    }
    sql += ' ORDER BY minute ASC';
    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    const results: TemperatureReading[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as {
        id: number;
        curve_id: number;
        minute: number;
        temperature: number;
        timestamp: string;
      };
      results.push({
        id: row.id,
        curveId: row.curve_id,
        minute: row.minute,
        temperature: row.temperature,
        timestamp: row.timestamp,
      });
    }
    stmt.free();
    return results;
  }
}
