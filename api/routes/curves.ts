import { Router, type Request, type Response } from 'express';
import type { CurvePoint } from '../../shared/types.js';
import { getDb } from '../repositories/db.js';
import { CurveRepository } from '../repositories/CurveRepository.js';
import {
  CurveValidationError,
  validateCurvePoints,
} from '../services/curveParser.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { points, name } = req.body as {
      points: CurvePoint[];
      name?: string;
    };
    validateCurvePoints(points);
    const db = await getDb();
    const repo = new CurveRepository(db);
    const curve = repo.create(points, name);
    res.json({ success: true, data: curve });
  } catch (err) {
    if (err instanceof CurveValidationError) {
      res.status(400).json({ success: false, error: err.message });
    } else {
      res.status(500).json({ success: false, error: '创建曲线失败' });
    }
  }
});

router.get('/latest', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const repo = new CurveRepository(db);
    const curve = repo.findLatest();
    res.json({ success: true, data: curve });
  } catch {
    res.status(500).json({ success: false, error: '查询曲线失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: '无效的曲线ID' });
    }
    const db = await getDb();
    const repo = new CurveRepository(db);
    const curve = repo.findById(id);
    if (!curve) {
      return res.status(404).json({ success: false, error: '曲线不存在' });
    }
    res.json({ success: true, data: curve });
  } catch {
    res.status(500).json({ success: false, error: '查询曲线失败' });
  }
});

export default router;
