import { Router } from 'express';
import { signup, login, getMe, getAllUsers } from '../controllers/authController';
import { protect, adminOnly, validate } from '../middleware/auth';
import { signupSchema, loginSchema } from '../validators';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.get('/users', protect, adminOnly, getAllUsers);

export default router;
