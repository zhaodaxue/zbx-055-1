import type { Database } from 'sql.js';
import type { TemperatureReading } from '../../shared/types.js';
import { persistDb } from './db.js';
import { CurveRepository } from './CurveRepository.js';

export class ReadingRepository {
  constructor(private db: Database) {}

  create(
    curveId: number,
    minute: number,
    temperature: number
  ): TemperatureReading {
    const curveRepo = new CurveRepository(this.db);
    if (!curveRepo.findById(curveId)) {
      throw new Error(`curveId ${curveId} 不存在`);
    }

    const existingStmt = this.db.prepare(
      'SELECT id FROM temperature_reading WHERE curve_id = ? AND minute = ? LIMIT 1'
    );
    existingStmt.bind([curveId, minute]);
    let existingId: number | null = null;
    if (existingStmt.step()) {
      const row = existingStmt.getAsObject() as { id: number };
      existingId = row.id;
    }
    existingStmt.free();

    if (existingId !== null) {
      const updateStmt = this.db.prepare(
        'UPDATE temperature_reading SET temperature = ?, timestamp = datetime(\'now\') WHERE id = ?'
      );
      updateStmt.run([temperature, existingId]);
      updateStmt.free();
      persistDb();

      const tsResult = this.db.exec("SELECT datetime('now') as now");
      const timestamp = tsResult[0].values[0][0] as string;

      const existing = this.findOneById(existingId);
      if (existing) return existing;

      return {
        id: existingId,
        curveId,
        minute,
        temperature,
        timestamp,
      };
    }

    const insertStmt = this.db.prepare(
      'INSERT INTO temperature_reading (curve_id, minute, temperature) VALUES (?, ?, ?)'
    );
    insertStmt.run([curveId, minute, temperature]);
    insertStmt.free();

    const idResult = this.db.exec('SELECT last_insert_rowid() as id');
    if (!idResult.length || !idResult[0].values.length) {
      throw new Error('获取插入ID失败');
    }
    const id = idResult[0].values[0][0] as number;
    if (id === 0) {
      throw new Error('插入失败，ID 为 0');
    }

    const tsResult = this.db.exec("SELECT datetime('now') as now");
    const timestamp = tsResult[0].values[0][0] as string;

    persistDb();

    const existing = this.findOneById(id);
    if (existing) return existing;

    return {
      id,
      curveId,
      minute,
      temperature,
      timestamp,
    };
  }

  private findOneById(id: number): TemperatureReading | null {
    try {
      const stmt = this.db.prepare(
        'SELECT id, curve_id, minute, temperature, timestamp FROM temperature_reading WHERE id = ?'
      );
      stmt.bind([id]);
      if (!stmt.step()) {
        stmt.free();
        return null;
      }
      const row = stmt.getAsObject() as {
        id: number;
        curve_id: number;
        minute: number;
        temperature: number;
        timestamp: string;
      };
      stmt.free();
      return {
        id: row.id,
        curveId: row.curve_id,
        minute: row.minute,
        temperature: row.temperature,
        timestamp: row.timestamp,
      };
    } catch {
      return null;
    }
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
