import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, getDashboard);

export default router;
