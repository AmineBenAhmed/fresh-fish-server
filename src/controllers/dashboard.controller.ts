import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

/**
 * GET /api/dashboard/stats
 * Returns aggregate stats for the admin dashboard
 */
async function getDashboardStats(req: Request, res: Response) {
  try {
    const [totalOrders, totalUsers, totalProducts, outOfStock, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, email: true } },
          deliveryPartner: { select: { id: true, name: true, phone: true } },
        },
      }),
    ]);

    return res.status(200).json({
      totalOrders,
      totalUsers,
      totalProducts,
      outOfStock,
      totalPartners: await prisma.deliveryPartner.count(),
      recentOrders: recentOrders.map((o) => ({
        _id: o.id,
        user: o.user
          ? { _id: o.user.id, name: o.user.name, email: o.user.email }
          : { _id: o.userId, name: '', email: '' },
        items: o.items,
        paymentMethod: o.paymentMethod,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee ?? 0,
        tax: o.tax ?? 0,
        total: o.total,
        status: o.status,
        statusHistory: o.statusHistory ?? [],
        deliveryPartner: o.deliveryPartner
          ? { _id: o.deliveryPartner.id, name: o.deliveryPartner.name, phone: o.deliveryPartner.phone }
          : null,
        deliveryOtp: o.deliveryOtp ?? '',
        isPaid: o.isPaid ?? false,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { getDashboardStats };
