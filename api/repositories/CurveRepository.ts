import type { Database } from 'sql.js';
import type { TargetCurve } from '../../shared/types.js';
import { persistDb } from './db.js';

export class CurveRepository {
  constructor(private db: Database) {}

  create(points: { minute: number; temperature: number }[], name?: string): TargetCurve {
    const pointsJson = JSON.stringify(points);
    const insertStmt = this.db.prepare(
      'INSERT INTO target_curve (name, points_json) VALUES (?, ?)'
    );
    insertStmt.run([name ?? null, pointsJson]);
    insertStmt.free();

    const idResult = this.db.exec('SELECT last_insert_rowid() as id');
    if (!idResult.length || !idResult[0].values.length) {
      throw new Error('获取插入ID失败');
    }
    const id = idResult[0].values[0][0] as number;
    if (id === 0) {
      throw new Error('插入失败，ID 为 0');
    }

    const nowResult = this.db.exec("SELECT datetime('now') as now");
    const createdAt = nowResult[0].values[0][0] as string;

    persistDb();

    const existing = this.findById(id);
    if (existing) return existing;

    return {
      id,
      name: name ?? undefined,
      points,
      createdAt,
    };
  }

  findById(id: number): TargetCurve | null {
    try {
      const stmt = this.db.prepare(
        'SELECT id, name, points_json, created_at FROM target_curve WHERE id = ?'
      );
      stmt.bind([id]);
      if (!stmt.step()) {
        stmt.free();
        return null;
      }
      const row = stmt.getAsObject() as {
        id: number;
        name: string | null;
        points_json: string;
        created_at: string;
      };
      stmt.free();
      return {
        id: row.id,
        name: row.name ?? undefined,
        points: JSON.parse(row.points_json),
        createdAt: row.created_at,
      };
    } catch {
      return null;
    }
  }

  findLatest(): TargetCurve | null {
    try {
      const result = this.db.exec(
        'SELECT id, name, points_json, created_at FROM target_curve ORDER BY id DESC LIMIT 1'
      );
      if (!result.length || !result[0].values.length) return null;
      const row = result[0].values[0] as [number, string | null, string, string];
      return {
        id: row[0],
        name: row[1] ?? undefined,
        points: JSON.parse(row[2]),
        createdAt: row[3],
      };
    } catch {
      return null;
    }
  }
}
