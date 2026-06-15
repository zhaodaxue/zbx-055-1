import { Router, type Request, type Response } from 'express';

const router = Router();

function notEnabled(_req: Request, res: Response): void {
  if (!res.headersSent) {
    res.status(501).json({ success: false, error: '认证功能未启用' });
  }
}

router.post('/register', notEnabled);
router.post('/login', notEnabled);
router.post('/logout', notEnabled);
router.get('/me', notEnabled);
router.all('*', notEnabled);

export default router;
