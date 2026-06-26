import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import {
  calculateDiscount,
  mapProduct,
  buildProductFilter,
  buildProductSort,
  getPaginationParams
} from '../utils/products.utils';

/**
 * GET /api/products
 * Supports: search (?q=), category, organic, minPrice, maxPrice, sort, page, limit
 */
async function getProducts(req: Request, res: Response) {
  try {
    const { q, category, organic, minPrice, maxPrice, sort, page = '1', limit = '20' } =
      req.query as Record<string, string>;

    const where = buildProductFilter({ q, category, organic, minPrice, maxPrice });
    const orderBy = buildProductSort(sort);
    const { pageNum, limitNum, skip } = getPaginationParams(page, limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: limitNum }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      products: products.map(mapProduct),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/products/flash-deals
const getFlashDeals = async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { stock: { gt: 0 } },
    orderBy: { originalPrice: "desc" }
  })

  const productsWithDiscount = products.map((p) => ({
    ...p,
    discount: calculateDiscount(p.originalPrice, p.price),
  }))

  res.json({ products: productsWithDiscount.slice(0, 8) })
}

/**
 * GET /api/products/:id
 */
async function getProductById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(mapProduct(product));
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/products
 */
async function createProduct(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      image,
      category,
      unit,
      stock,
      isOrganic,
      rating,
      reviewCount,
    } = req.body;

    if (!name || price === undefined || !image || !category) {
      return res.status(400).json({ error: 'Name, price, image, and category are required' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description ?? '',
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : 0,
        image,
        category,
        unit: unit ?? 'piece',
        stock: stock !== undefined ? parseInt(stock, 10) : 0,
        isOrganic: isOrganic ?? false,
        rating: rating ? parseFloat(rating) : 0,
        reviewCount: reviewCount ? parseInt(reviewCount, 10) : 0,
      },
    });

    return res.status(201).json(mapProduct(product));
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/products/:id
 */
async function updateProduct(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const {
      name,
      description,
      price,
      originalPrice,
      image,
      category,
      unit,
      stock,
      isOrganic,
      rating,
      reviewCount,
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(originalPrice !== undefined && { originalPrice: parseFloat(originalPrice) }),
        ...(image !== undefined && { image }),
        ...(category !== undefined && { category }),
        ...(unit !== undefined && { unit }),
        ...(stock !== undefined && { stock: parseInt(stock, 10) }),
        ...(isOrganic !== undefined && { isOrganic }),
        ...(rating !== undefined && { rating: parseFloat(rating) }),
        ...(reviewCount !== undefined && { reviewCount: parseInt(reviewCount, 10) }),
      },
    });

    return res.status(200).json(mapProduct(product));
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/products/:id
 */
async function deleteProduct(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({ where: { id } });

    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/products/:id/stock
 * Quick action to update stock (e.g., mark out of stock)
 */
async function updateProductStock(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { stock } = req.body;

    if (stock === undefined) {
      return res.status(400).json({ error: 'Stock value is required' });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { stock: parseInt(stock, 10) },
    });

    return res.status(200).json(mapProduct(product));
  } catch (error) {
    console.error('Error updating product stock:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { getProducts, getProductById, createProduct, updateProduct, getFlashDeals, deleteProduct, updateProductStock };
