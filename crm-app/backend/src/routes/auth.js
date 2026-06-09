const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { buildPasswordResetUrl } = require('../config/frontendUrl');
const { sendPasswordResetEmail, isSmtpConfigured } = require('../services/emailService');
const { verifyGoogleToken } = require('../services/googleAuthService');
const { slugify } = require('../services/tenantService');
const { companyAddressSchema } = require('../schemas/companyAddress');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerCompanySchema = z.object({
  companyName: z.string().min(1),
  ownerName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  address: companyAddressSchema,
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['staff', 'viewer']).default('staff'),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['owner', 'staff', 'viewer']).optional(),
  password: z.string().min(6).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

async function issueToken(user) {
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { id: true, name: true },
  });
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      companyId: user.companyId,
      companyName: company?.name || '',
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function userResponse(user, companyName) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyName: companyName || user.companyName || '',
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/register-company', async (req, res, next) => {
  try {
    const data = registerCompanySchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const slug = slugify(data.companyName);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          slug,
          phone: data.phone,
          country: data.address.country || 'Nepal',
          province: data.address.province,
          district: data.address.district,
          municipality: data.address.municipality,
          street: data.address.street,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          passwordHash,
          role: 'owner',
          companyId: company.id,
        },
      });

      return { company, user };
    });

    const token = await issueToken(result.user);
    res.status(201).json({
      token,
      user: userResponse(result.user, result.company.name),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: { select: { name: true } } },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.passwordHash) {
      return res.status(400).json({
        error: 'This account uses Google sign-in. Please use "Sign in with Google".',
      });
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = await issueToken(user);
    res.json({ token, user: userResponse(user, user.company.name) });
  } catch (err) {
    next(err);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const { credential } = googleAuthSchema.parse(req.body);
    const googleUser = await verifyGoogleToken(credential);

    if (!googleUser.emailVerified) {
      return res.status(400).json({ error: 'Google email is not verified' });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      },
      include: { company: { select: { name: true } } },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.googleId,
          name: user.name || googleUser.name,
          authProvider: user.passwordHash ? user.authProvider : 'google',
        },
        include: { company: { select: { name: true } } },
      });
    } else {
      return res.status(403).json({
        error: 'No account found. Please register your company first.',
        code: 'NO_COMPANY',
      });
    }

    const token = await issueToken(user);
    res.json({ token, user: userResponse(user, user.company.name) });
  } catch (err) {
    if (err.message?.includes('not configured')) {
      return res.status(503).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token: tokenHash, expiresAt },
      });

      if (!isSmtpConfigured()) {
        console.error('Password reset requested but SMTP is not configured on the server.');
        return res.status(503).json({
          error: 'Password reset email is not available yet. Ask your admin to configure SMTP, or use npm run reset-password on the server.',
        });
      }

      const resetUrl = buildPasswordResetUrl(rawToken);

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailErr) {
        console.error('Failed to send reset email:', emailErr.message);
        return res.status(503).json({
          error: 'Unable to send reset email. Check SMTP host, port, and app password on the server.',
        });
      }
    }

    res.json({
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    if (resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.passwordHash) {
      return res.status(400).json({
        error: 'Your account uses Google sign-in. Use forgot password to set a local password, or continue signing in with Google.',
      });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/register', authMiddleware, tenantMiddleware, roleGuard('owner'), async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        companyId: req.companyId,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(userResponse(user, user.company.name));
  } catch (err) {
    next(err);
  }
});

router.get('/users', authMiddleware, tenantMiddleware, roleGuard('owner'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.companyId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', authMiddleware, tenantMiddleware, roleGuard('owner'), async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) return res.status(409).json({ error: 'Email already in use' });
    }

    if (data.role && data.role !== 'owner' && existing.role === 'owner') {
      const ownerCount = await prisma.user.count({
        where: { companyId: req.companyId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last owner' });
      }
    }

    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', authMiddleware, tenantMiddleware, roleGuard('owner'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'owner') {
      const ownerCount = await prisma.user.count({
        where: { companyId: req.companyId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last owner account' });
      }
    }

    await prisma.$transaction([
      prisma.customer.updateMany({
        where: { assignedTo: user.id, companyId: req.companyId },
        data: { assignedTo: null },
      }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
