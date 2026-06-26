import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

function generateToken(partnerId: string) {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) throw new Error('JWT secret not provided');
  return jwt.sign({ id: partnerId, role: 'delivery' }, secretKey, { expiresIn: '30d' });
}

function mapPartner(p: any) {
  return {
    _id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    avatar: p.avatar ?? '',
    vehicleType: p.vehicleType ?? 'bike',
    isActive: p.isActive ?? true,
    createdAt: p.createdAt,
  };
}

/**
 * POST /api/delivery-partners/login
 */
async function signin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const partner = await prisma.deliveryPartner.findUnique({ where: { email: email.toLowerCase() } });
    if (!partner) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, partner.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(partner.id);
    return res.status(200).json({ message: 'Sign in successful', partner: mapPartner(partner), token });
  } catch (error) {
    console.error('Error signing in delivery partner:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/delivery-partners/register
 */
async function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone, avatar, vehicleType } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, password, and phone are required' });
    }

    const existing = await prisma.deliveryPartner.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const partner = await prisma.deliveryPartner.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashed,
        phone,
        avatar: avatar ?? '',
        vehicleType: vehicleType ?? 'bike',
      },
    });

    return res.status(201).json(mapPartner(partner));
  } catch (error) {
    console.error('Error registering delivery partner:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/delivery-partners
 */
async function getPartners(req: Request, res: Response) {
  try {
    const partners = await prisma.deliveryPartner.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json(partners.map(mapPartner));
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/delivery-partners/:id
 */
async function getPartnerById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
    if (!partner) {
      return res.status(404).json({ error: 'Delivery partner not found' });
    }
    return res.status(200).json(mapPartner(partner));
  } catch (error) {
    console.error('Error fetching partner:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/delivery-partners/:id
 */
async function updatePartner(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { name, email, phone, avatar, vehicleType, isActive } = req.body;

    const existing = await prisma.deliveryPartner.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Delivery partner not found' });
    }

    const partner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email: email.toLowerCase() }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(vehicleType !== undefined && { vehicleType }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.status(200).json(mapPartner(partner));
  } catch (error) {
    console.error('Error updating partner:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/delivery-partners/:id
 */
async function deletePartner(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.deliveryPartner.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Delivery partner not found' });
    }
    await prisma.deliveryPartner.delete({ where: { id } });
    return res.status(200).json({ message: 'Delivery partner deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { signin, register, getPartners, getPartnerById, updatePartner, deletePartner };
