import { Router, type Request, type Response } from 'express';
import { getDb } from '../repositories/db.js';
import { ReadingRepository } from '../repositories/ReadingRepository.js';
import { CurveRepository } from '../repositories/CurveRepository.js';
import { detectAnomalies } from '../services/anomalyDetector.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { curveId, minute, temperature } = req.body as {
      curveId: number;
      minute: number;
      temperature: number;
    };
    if (
      typeof curveId !== 'number' ||
      typeof minute !== 'number' ||
      typeof temperature !== 'number'
    ) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const db = await getDb();
    const repo = new ReadingRepository(db);
    const reading = repo.create(curveId, minute, temperature);
    res.json({ success: true, data: reading });
  } catch {
    res.status(500).json({ success: false, error: '上报温度失败' });
  }
});

router.get('/', async (req: Request, res: Response) => {
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
    const repo = new ReadingRepository(db);
    const readings = repo.findByCurveId(curveId, fromMinute, toMinute);
    res.json({ success: true, data: readings });
  } catch {
    res.status(500).json({ success: false, error: '查询温度失败' });
  }
});

router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const curveId = Number(req.query.curveId);
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
    const readings = readingRepo.findByCurveId(curveId);
    const anomalies = detectAnomalies(readings, curve.points);
    res.json({ success: true, data: anomalies });
  } catch {
    res.status(500).json({ success: false, error: '检测偏离段失败' });
  }
});

export default router;
