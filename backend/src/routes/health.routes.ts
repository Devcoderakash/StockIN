import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { APP_NAME } from '../config/constants';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    service: APP_NAME,
    timestamp: new Date().toISOString(),
  });
});

export default router;
