import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { pool } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES = '7d';

export function signToken(userId: number, username: string) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export async function registerUser(username: string, email: string, password: string) {
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email`,
    [username, email, hash]
  );
  return result.rows[0];
}

export async function loginUser(username: string, password: string) {
  const result = await pool.query(
    `SELECT id, username, email, password_hash FROM users WHERE username = $1`,
    [username]
  );
  if (!result.rows.length) return null;

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  return { id: user.id, username: user.username, email: user.email };
}

// Middleware: защита роутов
export interface AuthRequest extends Request {
  user?: { userId: number; username: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}