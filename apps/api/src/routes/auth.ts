import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OTP } from '../models/OTP';
import { User } from '../models/User';
import { env } from '../config/env';
import { otpRateLimit } from '../middleware/rateLimit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const mobileSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
});

const verifySchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const signTokens = (userId: string, role: string, mobile: string) => {
  const accessToken = jwt.sign({ _id: userId, role, mobile }, env.JWT_SECRET, {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign({ _id: userId }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/send-otp
router.post('/send-otp', otpRateLimit, validate(mobileSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobile } = req.body as { mobile: string };
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await bcrypt.hash(otpCode, 10);

    await OTP.deleteMany({ mobile });
    await OTP.create({
      mobile,
      otp: hashed,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const response: Record<string, unknown> = {
      success: true,
      message: 'OTP sent successfully',
    };

    if (env.NODE_ENV === 'development') {
      response.otp = otpCode;
      response.note = 'OTP shown in development mode only';
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(verifySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobile, otp } = req.body as { mobile: string; otp: string };

    const otpRecord = await OTP.findOne({
      mobile,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      res.status(400).json({ success: false, error: 'OTP expired or not found' });
      return;
    }

    if (otpRecord.attempts >= 3) {
      res.status(400).json({ success: false, error: 'Too many failed attempts. Request a new OTP.' });
      return;
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      res.status(400).json({ success: false, error: 'Invalid OTP' });
      return;
    }

    otpRecord.verified = true;
    await otpRecord.save();

    let user = await User.findOne({ mobile });
    if (!user) {
      user = await User.create({ mobile, role: 'user', isActive: true });
    }

    const { accessToken, refreshToken } = signTokens(
      user._id.toString(),
      user.role,
      user.mobile
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          mobile: user.mobile,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.user?._id, { refreshToken: null });
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).select('-refreshToken');
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: { user } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, error: 'No refresh token' });
      return;
    }

    const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as { _id: string };
    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== token) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = signTokens(
      user._id.toString(),
      user.role,
      user.mobile
    );

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken } });
  } catch {
    res.status(401).json({ success: false, error: 'Token refresh failed' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { ...(name && { name }), ...(email && { email }) },
      { new: true }
    ).select('-refreshToken');
    res.json({ success: true, data: { user } });
  } catch {
    res.status(500).json({ success: false, error: 'Profile update failed' });
  }
});

export default router;
