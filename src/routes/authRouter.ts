import { Router } from 'express';
import { registerUser, signin, getMe, updateUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerUser);
router.post('/signin', signin);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateUser);

export default router;
