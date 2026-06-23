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

    return res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

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
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
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

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { registerUser, signin, getMe };
