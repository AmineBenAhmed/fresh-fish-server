import { Router } from 'express';
import { registerUser, signin, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerUser);
router.post('/signin', signin);
router.get('/me', authenticate, getMe);

export default router;
