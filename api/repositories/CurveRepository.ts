import type { Database } from 'sql.js';
import type { CurvePoint, TargetCurve } from '../../shared/types.js';
import { persistDb } from './db.js';

export class CurveRepository {
  constructor(private db: Database) {}

  create(points: CurvePoint[], name?: string): TargetCurve {
    const pointsJson = JSON.stringify(points);
    const stmt = this.db.prepare(
      'INSERT INTO target_curve (name, points_json) VALUES (?, ?)'
    );
    stmt.run([name ?? null, pointsJson]);
    persistDb();

    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
    return this.findById(id)!;
  }

  findById(id: number): TargetCurve | null {
    const stmt = this.db.prepare(
      'SELECT id, name, points_json, created_at FROM target_curve WHERE id = ?'
    );
    const result = stmt.getAsObject([id]) as {
      id: number;
      name: string | null;
      points_json: string;
      created_at: string;
    } | undefined;
    if (!result) return null;
    return {
      id: result.id,
      name: result.name ?? undefined,
      points: JSON.parse(result.points_json) as CurvePoint[],
      createdAt: result.created_at,
    };
  }

  findLatest(): TargetCurve | null {
    const rows = this.db.exec(
      'SELECT id, name, points_json, created_at FROM target_curve ORDER BY id DESC LIMIT 1'
    );
    if (!rows.length || !rows[0].values.length) return null;
    const row = rows[0].values[0] as [number, string | null, string, string];
    return {
      id: row[0],
      name: row[1] ?? undefined,
      points: JSON.parse(row[2]) as CurvePoint[],
      createdAt: row[3],
    };
  }
}
