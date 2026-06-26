import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

/**
 * GET /api/addresses
 */
async function getAddresses(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    const mapped = addresses.map((a) => ({
      _id: a.id,
      label: a.label,
      address: a.address,
      city: a.city,
      state: a.state,
      zip: a.zip,
      isDefault: a.isDefault,
      lat: a.lat,
      lng: a.lng,
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/addresses
 */
async function createAddress(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { label, address, city, state, zip, isDefault, lat, lng } = req.body;

    if (!label || !address || !city || !state || !zip) {
      return res.status(400).json({ error: 'label, address, city, state, and zip are required' });
    }

    // If setting as default, unset all other defaults
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const created = await prisma.address.create({
      data: {
        userId,
        label,
        address,
        city,
        state,
        zip,
        isDefault: isDefault ?? false,
        lat: lat ?? 0,
        lng: lng ?? 0,
      },
    });

    return res.status(201).json({
      _id: created.id,
      label: created.label,
      address: created.address,
      city: created.city,
      state: created.state,
      zip: created.zip,
      isDefault: created.isDefault,
      lat: created.lat,
      lng: created.lng,
    });
  } catch (error) {
    console.error('Error creating address:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/addresses/:id
 */
async function updateAddress(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
    const { label, address, city, state, zip, isDefault, lat, lng } = req.body;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Address not found' });
    }

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
        ...(isDefault !== undefined && { isDefault }),
        ...(lat !== undefined && { lat }),
        ...(lng !== undefined && { lng }),
      },
    });

    return res.status(200).json({
      _id: updated.id,
      label: updated.label,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      zip: updated.zip,
      isDefault: updated.isDefault,
      lat: updated.lat,
      lng: updated.lng,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/addresses/:id
 */
async function deleteAddress(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await prisma.address.delete({ where: { id } });

    return res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { getAddresses, createAddress, updateAddress, deleteAddress };
