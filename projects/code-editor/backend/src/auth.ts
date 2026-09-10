import 'dotenv/config';
import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { database } from './database';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devpulse-development-secret-change-me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'devpulse-development-secret-change-me') {
  throw new Error('JWT_SECRET must be configured in production');
}

const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null;

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createAccessToken(user: { id: string; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const message = {
    from: process.env.SMTP_FROM || 'DevPulse <no-reply@localhost>',
    to: email,
    subject: 'Verify your DevPulse email',
    text: `Verify your DevPulse account: ${verificationUrl}`,
    html: `<p>Verify your DevPulse account by clicking <a href="${verificationUrl}">this link</a>.</p>`,
  };

  if (mailer) {
    await mailer.sendMail(message);
    return;
  }

  console.log(`[development] Email verification link for ${email}: ${verificationUrl}`);
}

async function createVerificationToken(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  await database.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
  await database.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), new Date(Date.now() + TOKEN_TTL_MS)],
  );
  await sendVerificationEmail(email, token);
}

router.post('/register', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Use a valid email and a password of at least 8 characters.' });
  }

  try {
    const existing = await database.query('SELECT id, email_verified_at FROM users WHERE email = $1', [email]);
    if (existing.rowCount) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await database.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash],
    );
    await createVerificationToken(result.rows[0].id, email);

    res.status(201).json({ success: true, message: 'Account created. Check your email to verify your account.' });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ success: false, error: 'Unable to create account.' });
  }
});

router.get('/verify-email', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) return res.status(400).json({ success: false, error: 'Verification token is required.' });

  try {
    const result = await database.query(
      `SELECT u.id, u.email
       FROM email_verification_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.expires_at > CURRENT_TIMESTAMP`,
      [hashToken(token)],
    );
    if (!result.rowCount) return res.status(400).json({ success: false, error: 'Token is invalid or expired.' });

    const user = result.rows[0];
    await database.query('UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    await database.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Email verification failed:', error);
    res.status(500).json({ success: false, error: 'Unable to verify email.' });
  }
});

router.post('/resend-verification', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email);
  try {
    const result = await database.query('SELECT id, email, email_verified_at FROM users WHERE email = $1', [email]);
    if (result.rowCount && !result.rows[0].email_verified_at) {
      await createVerificationToken(result.rows[0].id, result.rows[0].email);
    }
    res.json({ success: true, message: 'If the account exists and needs verification, a new email has been sent.' });
  } catch (error) {
    console.error('Resending verification failed:', error);
    res.status(500).json({ success: false, error: 'Unable to resend verification email.' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  try {
    const result = await database.query(
      'SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
    if (!user.email_verified_at) {
      return res.status(403).json({ success: false, error: 'Please verify your email before signing in.' });
    }

    res.json({ success: true, token: createAccessToken(user), user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ success: false, error: 'Unable to sign in.' });
  }
});

export function requireAuth(req: Request, res: Response, next: () => void) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload.sub || typeof payload.email !== 'string') throw new Error('Invalid token payload');
    res.locals.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

router.get('/me', requireAuth, (_req: Request, res: Response) => {
  res.json({ success: true, user: res.locals.user });
});

export default router;
