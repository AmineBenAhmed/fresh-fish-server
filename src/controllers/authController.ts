import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'

import { prisma } from '../config/prisma'; // Adjust the path to your Prisma client


interface UserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const getAdminStatus = (email: string | null | undefined): boolean => {
  if (!email) {
    return false
  }

  const adminEmails = process.env.ADMIN_EMAILS?.length ? process.env.ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase()) : []
  return adminEmails.includes(email.toLowerCase())
}

function generateToken(userId: string) {
  const payload = { id: userId };
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error('JWT secrete not provided')
  }

  const options = {
    expiresIn: 60 * 60 * 24 * 30, // Token expires in 30 days
  };

  try {
    const token = jwt.sign(payload, secretKey, options);
    return token;
  } catch (error) {
    throw new Error('Failed to generate JWT token');
  }
}

async function registerUser(req: Request, res: Response) {
  try {
    const { name, email, password, phone = '', avatar = '' }: UserInput = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if the email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email dejà utilisé' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        name: name.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        avatar,
        addresses: {},
        orders: {},
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;
    const token = generateToken(newUser.id);
    const userData = { ...userWithoutPassword, isAdmin: getAdminStatus(newUser.email) };
    return res.status(201).json({ message: 'User registered successfully', user: userData, token });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

//login
//POST /api/auth/login
async function signin(req: Request, res: Response) {
  try {
    const { email, password }: LoginInput = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      message: 'Sign in successful',
      user: {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        isAdmin: getAdminStatus(user.email),
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Error signing in:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMe(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      isAdmin: getAdminStatus(user.email),
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateUser(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, phone, avatar } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
      },
    });

    return res.status(200).json({
      _id: updated.id,
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      avatar: updated.avatar,
      isAdmin: getAdminStatus(updated.email),
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { registerUser, signin, getMe, updateUser };
