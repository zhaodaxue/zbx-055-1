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
      isNaN(curveId) ||
      typeof minute !== 'number' ||
      isNaN(minute) ||
      typeof temperature !== 'number' ||
      isNaN(temperature)
    ) {
      return res.status(400).json({ success: false, error: '参数不完整或格式错误' });
    }
    if (minute < 0) {
      return res.status(400).json({ success: false, error: '分钟数不能为负数' });
    }
    if (temperature < -273 || temperature > 3000) {
      return res.status(400).json({ success: false, error: '温度值超出合理范围' });
    }
    const db = await getDb();
    const curveRepo = new CurveRepository(db);
    if (!curveRepo.findById(curveId)) {
      return res.status(404).json({ success: false, error: 'curveId 对应的曲线不存在' });
    }
    const repo = new ReadingRepository(db);
    const reading = repo.create(curveId, minute, temperature);
    res.json({ success: true, data: reading });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '上报温度失败';
    if (msg.includes('不存在')) {
      res.status(404).json({ success: false, error: msg });
    } else {
      res.status(500).json({ success: false, error: msg });
    }
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
