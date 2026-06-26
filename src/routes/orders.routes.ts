import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  assignDeliveryPartner,
  verifyOtp,
  updateLiveLocation,
  cancelOrder,
} from '../controllers/orders.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All order routes require authentication
router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrderById);
router.post('/', authenticate, createOrder);
router.patch('/:id/status', authenticate, updateOrderStatus);
router.post('/:id/assign', authenticate, assignDeliveryPartner);
router.post('/:id/otp', authenticate, verifyOtp);
router.patch('/:id/location', authenticate, updateLiveLocation);
router.delete('/:id/cancel', authenticate, cancelOrder);

export default router;
