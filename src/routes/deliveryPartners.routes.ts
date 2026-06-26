import { Router } from 'express';
import { signin, register, getPartners, getPartnerById, updatePartner, deletePartner } from '../controllers/deliveryPartners.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', signin);
router.post('/register', authenticate, register);

// Protected routes
router.get('/', authenticate, getPartners);
router.get('/:id', authenticate, getPartnerById);
router.patch('/:id', authenticate, updatePartner);
router.delete('/:id', authenticate, deletePartner);

export default router;
