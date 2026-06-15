import { Router, type Request, type Response } from 'express';
import { getDb } from '../repositories/db.js';
import { ReadingRepository } from '../repositories/ReadingRepository.js';
import { CurveRepository } from '../repositories/CurveRepository.js';
import { detectAnomalies } from '../services/anomalyDetector.js';
import {
  buildExportRows,
  generateFilename,
  rowsToCsv,
} from '../services/csvExporter.js';

const router = Router();

router.get('/csv', async (req: Request, res: Response) => {
  try {
    const curveId = Number(req.query.curveId);
    const fromMinute =
      req.query.fromMinute !== undefined ? Number(req.query.fromMinute) : undefined;
    const toMinute =
      req.query.toMinute !== undefined ? Number(req.query.toMinute) : undefined;
    if (isNaN(curveId)) {
      return res.status(400).json({ success: false, error: 'curveId 必填' });
    }
    const db = await getDb();
    const readingRepo = new ReadingRepository(db);
    const curveRepo = new CurveRepository(db);
    const curve = curveRepo.findById(curveId);
    if (!curve) {
      return res.status(404).json({ success: false, error: '曲线不存在' });
    }
    const readings = readingRepo.findByCurveId(curveId, fromMinute, toMinute);
    const anomalies = detectAnomalies(readings, curve.points);
    const rows = buildExportRows(readings, curve.points, anomalies);
    const csv = rowsToCsv(rows);
    const filename = generateFilename();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.send(csv);
  } catch {
    res.status(500).json({ success: false, error: '导出 CSV 失败' });
  }
});

export default router;
