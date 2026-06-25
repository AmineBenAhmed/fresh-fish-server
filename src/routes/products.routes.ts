import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getFlashDeals,
} from '../controllers/products.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Protected routes (admin only - using authenticate middleware)
router.post('/', authenticate, requireAdmin, createProduct);
router.post('/flash-deals', authenticate, getFlashDeals);
router.put('/:id', authenticate, requireAdmin, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);
router.patch('/:id/stock', authenticate, requireAdmin, updateProductStock);

export default router;
