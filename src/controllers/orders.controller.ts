import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

function mapOrder(order: any) {
  return {
    _id: order.id,
    id: order.id,
    user: order.user
      ? { _id: order.user.id, name: order.user.name, email: order.user.email, phone: order.user.phone }
      : order.userId,
    items: order.items,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee ?? 0,
    tax: order.tax ?? 0,
    total: order.total,
    status: order.status,
    statusHistory: order.statusHistory ?? [],
    deliveryPartner: order.deliveryPartner
      ? {
          _id: order.deliveryPartner.id,
          name: order.deliveryPartner.name,
          email: order.deliveryPartner.email,
          phone: order.deliveryPartner.phone,
          avatar: order.deliveryPartner.avatar ?? '',
          vehicleType: order.deliveryPartner.vehicleType ?? 'bike',
          isActive: order.deliveryPartner.isActive ?? true,
        }
      : null,
    deliveryOtp: order.deliveryOtp ?? '',
    liveLocation: order.liveLocation ?? null,
    isPaid: order.isPaid ?? false,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * GET /api/orders
 * List orders with optional status filter. Regular users see their own; admins see all.
 */
async function getOrders(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const isAdmin = (req as any).user?.isAdmin || false;
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: any = {};
    if (!isAdmin && userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: { user: { select: { id: true, name: true, email: true, phone: true } }, deliveryPartner: true },
      }),
      prisma.order.count({ where }),
    ]);

    return res.status(200).json({
      orders: orders.map(mapOrder),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/orders/:id
 */
async function getOrderById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, phone: true } }, deliveryPartner: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json(mapOrder(order));
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/orders
 * Create a new order from cart data
 * Expects: { items, shippingAddress, paymentMethod, subtotal, deliveryFee, tax, total }
 */
async function createOrder(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { items, shippingAddress, paymentMethod, subtotal, deliveryFee, tax, total } = req.body;

    if (!items || !items.length || !shippingAddress || subtotal === undefined || total === undefined) {
      return res.status(400).json({ error: 'Items, shippingAddress, subtotal, and total are required' });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        items,
        shippingAddress,
        paymentMethod: paymentMethod ?? 'card',
        subtotal,
        deliveryFee: deliveryFee ?? 0,
        tax: tax ?? 0,
        total,
        status: 'Placed',
        statusHistory: [{ status: 'Placed', timestamp: new Date().toISOString(), note: 'Order placed successfully' }],
        deliveryOtp: String(Math.floor(100000 + Math.random() * 900000)),
      },
      include: { deliveryPartner: true },
    });

    return res.status(201).json(mapOrder(order));
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/orders/:id/status
 */
async function updateOrderStatus(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentHistory = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: [
          ...currentHistory,
          { status, timestamp: new Date().toISOString(), note: note ?? `Status updated to ${status}` },
        ],
      },
      include: { deliveryPartner: true },
    });

    return res.status(200).json(mapOrder(updatedOrder));
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/orders/:id/assign
 */
async function assignDeliveryPartner(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { deliveryPartnerId } = req.body;

    if (!deliveryPartnerId) {
      return res.status(400).json({ error: 'deliveryPartnerId is required' });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const partner = await prisma.deliveryPartner.findUnique({ where: { id: deliveryPartnerId } });
    if (!partner) {
      return res.status(404).json({ error: 'Delivery partner not found' });
    }

    const currentHistory = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        deliveryPartnerId,
        status: 'Assigned',
        statusHistory: [
          ...currentHistory,
          { status: 'Assigned', timestamp: new Date().toISOString(), note: `Assigned to ${partner.name}` },
        ],
      },
      include: { deliveryPartner: true },
    });

    return res.status(200).json(mapOrder(updatedOrder));
  } catch (error) {
    console.error('Error assigning delivery partner:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/orders/:id/otp
 * Verify delivery OTP
 */
async function verifyOtp(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.deliveryOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as delivered
    const currentHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'Delivered',
        statusHistory: [
          ...currentHistory,
          { status: 'Delivered', timestamp: new Date().toISOString(), note: 'Delivered by partner' },
        ],
      },
      include: { deliveryPartner: true },
    });

    return res.status(200).json(mapOrder(updatedOrder));
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/orders/:id/location
 * Update live delivery location
 */
async function updateLiveLocation(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { liveLocation: { lat, lng, updatedAt: new Date().toISOString() } },
      include: { deliveryPartner: true },
    });

    return res.status(200).json(mapOrder(updatedOrder));
  } catch (error) {
    console.error('Error updating live location:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/orders/:id/cancel
 * Cancel an order
 */
async function cancelOrder(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentHistory = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'Cancelled',
        statusHistory: [
          ...currentHistory,
          { status: 'Cancelled', timestamp: new Date().toISOString(), note: reason ?? 'Order cancelled' },
        ],
      },
      include: { deliveryPartner: true },
    });

    return res.status(200).json(mapOrder(updatedOrder));
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { getOrders, getOrderById, createOrder, updateOrderStatus, assignDeliveryPartner, verifyOtp, updateLiveLocation, cancelOrder };
