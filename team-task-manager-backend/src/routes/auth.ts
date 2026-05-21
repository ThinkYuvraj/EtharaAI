import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import mongoose from 'mongoose';

import { User } from '../models/User.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { signAuthToken } from '../lib/jwt.js';


const router = Router();

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
});

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const { name, email, password } = parsed.data;

  const existing = await User.findOne({ email }).lean();
  if (existing) return res.status(409).json({ message: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);

  // First user to sign up becomes admin (simple demo rule).
  const userCount = await User.countDocuments({});
  const role: 'admin' | 'member' = userCount === 0 ? 'admin' : 'member';

  const user = await User.create({ name, email, passwordHash, role });

  const token = signAuthToken({
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return res.status(201).json({
    token,
    user: { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
  });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

  const token = signAuthToken({
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return res.json({
    token,
    user: { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
  });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const authUser = req.authUser!;
  if (!mongoose.isValidObjectId(authUser.userId)) return res.status(401).json({ message: 'Invalid token subject' });

  // Trust DB for latest name
  const user = await User.findById(authUser.userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  return res.json({
    user: { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
  });
});

router.get('/users', requireAuth, async (req: AuthedRequest, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter = q
    ? {
        $or: [
          { email: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
        ],
      }
    : {};

  const users = await User.find(filter).select('_id email name role').sort({ name: 1 }).limit(50).lean();

  return res.json({
    users: users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    })),
  });
});

export default router;


