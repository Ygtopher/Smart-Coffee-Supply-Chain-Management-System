import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { generateToken } from '../utils/jwt';
import { sendMfaOtp, sendPasswordResetLink } from '../utils/email';
import crypto from 'crypto';
import { AuthRequest } from '../middlewares/authMiddleware';

const createMfaCode = () => crypto.randomInt(100000, 1000000).toString();

const recordAuditEvent = async (data: Parameters<typeof prisma.auditLog.create>[0]['data']) => {
  try {
    await prisma.auditLog.create({ data });
  } catch (error) {
    console.error('Failed to record authentication audit event:', error);
  }
};

const publicUserPayload = (user: any) => ({
  userId: user.userId,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role.roleName,
  permissions: user.role.permissions,
  mfaEnabled: user.mfaEnabled,
  status: user.status,
});

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      await recordAuditEvent({
        action: 'LOGIN_FAILED',
        entityType: 'Auth',
        details: { email, reason: 'user_not_found' },
        ipAddress: req.ip,
      });
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.status !== 'active') {
      await recordAuditEvent({
        userId: user.userId,
        action: 'LOGIN_BLOCKED',
        entityType: 'Auth',
        entityId: user.userId,
        details: { email, status: user.status },
        ipAddress: req.ip,
      });
      res.status(403).json({ message: 'Account is inactive' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      await recordAuditEvent({
        userId: user.userId,
        action: 'LOGIN_FAILED',
        entityType: 'Auth',
        entityId: user.userId,
        details: { email, reason: 'invalid_password' },
        ipAddress: req.ip,
      });
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Rely purely on the user.mfaEnabled flag from the database
    if (user.mfaEnabled) {
      // Generate a 6-digit OTP
      const otp = createMfaCode();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { userId: user.userId },
        data: {
          mfaCode: otp,
          mfaExpires: expires,
        },
      });

      // Send the OTP via email
      await sendMfaOtp(user.email, otp);

      res.status(200).json({
        message: 'MFA required',
        user: publicUserPayload(user),
      });
      return;
    }

    const token = generateToken(user.userId, user.role.roleName);
    await recordAuditEvent({
      userId: user.userId,
      action: 'LOGIN_SUCCESS',
      entityType: 'Auth',
      entityId: user.userId,
      details: { method: 'password' },
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: publicUserPayload(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { 
    firstName, lastName, email, phone, password, 
    country, region, zone, woreda, kebele, 
    farmSize, altitude, variety, certifications, notes,
    coordinates, cooperativeId, supplierType = 'FARMER', numberOfFarms, cooperativeName
  } = req.body;

  try {
    // Determine the FARMER role
    const role = await prisma.role.findUnique({ where: { roleName: 'FARMER' } });
    if (!role) {
       res.status(500).json({ message: 'Farmer role not configured' });
       return;
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
       res.status(409).json({ message: 'Email is already registered' });
       return;
    }

    const normalizedSupplierType = String(supplierType || 'FARMER').toUpperCase() === 'COOPERATIVE' ? 'COOPERATIVE' : 'FARMER';
    const passwordHash = await bcrypt.hash(password, 10);
    const fullName = normalizedSupplierType === 'COOPERATIVE'
      ? String(cooperativeName || firstName || lastName || '').trim()
      : `${firstName} ${lastName}`.trim();
    if (!fullName) {
      res.status(400).json({ message: normalizedSupplierType === 'COOPERATIVE' ? 'Cooperative name is required' : 'Full name is required' });
      return;
    }
    const cooperative = cooperativeId
      ? await prisma.cooperative.findUnique({ where: { coopId: cooperativeId } })
      : null;

    if (cooperativeId && !cooperative) {
      res.status(400).json({ message: 'Selected cooperative was not found' });
      return;
    }

    // Use a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName,
          email,
          phone,
          passwordHash,
          roleId: role.roleId,
          status: 'pending', // Needs admin approval to login
          mfaEnabled: false,
        }
      });

      // Combine region strings
      const locationParts = [country || 'Rwanda', region, zone, woreda, kebele].filter(Boolean);
      const combinedLocation = locationParts.join(', ');

      const profile = await tx.farmerProfile.create({
        data: {
          userId: newUser.userId,
          farmName: normalizedSupplierType === 'COOPERATIVE' ? fullName : `${lastName}'s Farm`,
          farmSizeHa: farmSize ? parseFloat(farmSize) : 0,
          gpsLocation: combinedLocation,
          coordinates: coordinates || null,
          status: 'pending',
          cooperativeId: cooperative?.coopId || null,
          aggregatorId: null,
        }
      });
      await tx.$executeRaw`
        UPDATE farmer_profiles
        SET supplier_type = ${normalizedSupplierType},
            number_of_farms = ${normalizedSupplierType === 'COOPERATIVE' ? Number(numberOfFarms || 0) : null},
            coffee_varieties = ${normalizedSupplierType === 'FARMER' ? variety || null : null},
            preferred_washing_station = null,
            assignment_status = 'PENDING_ASSIGNMENT'
        WHERE profile_id = ${profile.profileId}
      `;

      return newUser;
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for admin approval.',
      data: { userId: user.userId }
    });
  } catch (error) {
    console.error('Error during farmer registration:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const searchCooperatives = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = String(req.query.q || '').trim();
    const cooperatives = await prisma.cooperative.findMany({
      where: {
        status: 'active',
        ...(query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { district: { contains: query, mode: 'insensitive' } },
            { zone: { contains: query, mode: 'insensitive' } },
          ]
        } : {})
      },
      take: 20,
      orderBy: { name: 'asc' },
      select: {
        coopId: true,
        name: true,
        district: true,
        zone: true,
        manager: { select: { fullName: true } }
      }
    });

    res.status(200).json({ success: true, data: cooperatives });
  } catch (error) {
    console.error('Error searching cooperatives:', error);
    res.status(500).json({ message: 'Server error searching cooperatives' });
  }
};

export const getPublicWashingStations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stations = await prisma.warehouseLocation.findMany({
      where: { type: 'Washing Station', status: 'active' },
      orderBy: { name: 'asc' },
      select: {
        locationId: true,
        name: true,
        district: true,
        address: true,
        gpsLocation: true,
      },
    });

    res.status(200).json({ success: true, data: stations });
  } catch (error) {
    console.error('Error loading washing stations:', error);
    res.status(500).json({ message: 'Server error loading washing stations' });
  }
};

export const verifyMfa = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    if (user.mfaCode !== otp || !user.mfaExpires || user.mfaExpires < new Date()) {
      res.status(401).json({ message: 'Invalid or expired verification code' });
      return;
    }

    // Clear code after successful verification (optional but recommended)
    await prisma.user.update({
      where: { userId: user.userId },
      data: { mfaCode: null, mfaExpires: null },
    });


    const token = generateToken(user.userId, user.role.roleName);

    res.status(200).json({
      message: 'MFA verified successfully',
      token,
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role.roleName,
        permissions: user.role.permissions,
        mfaEnabled: user.mfaEnabled,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error during MFA verify:', error);
    res.status(500).json({ message: 'Server error during MFA' });
  }
};

export const resendMfaCode = async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'active' || !user.mfaEnabled) {
      res.status(200).json({ message: 'If MFA is enabled for this account, a new code has been sent.' });
      return;
    }

    const otp = createMfaCode();
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        mfaCode: otp,
        mfaExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await sendMfaOtp(user.email, otp);
    await recordAuditEvent({
      userId: user.userId,
      action: 'MFA_CODE_RESENT',
      entityType: 'Auth',
      entityId: user.userId,
      ipAddress: req.ip,
    });
    res.status(200).json({ message: 'A new verification code has been sent.' });
  } catch (error) {
    console.error('Error resending MFA code:', error);
    res.status(500).json({ message: 'Unable to resend the verification code' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user!.userId },
      include: { role: true },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role.roleName,
        permissions: user.role.permissions,
        mfaEnabled: user.mfaEnabled,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error fetching user settings' });
  }
};

export const updateCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone } = req.body;
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;

    if (!fullName || !trimmedEmail) {
      res.status(400).json({ message: 'Full name and email are required' });
      return;
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingEmail && existingEmail.userId !== req.user!.userId) {
      res.status(409).json({ message: 'Email is already used by another account' });
      return;
    }

    const user = await prisma.user.update({
      where: { userId: req.user!.userId },
      data: {
        fullName: String(fullName).trim(),
        email: trimmedEmail,
        phone: phone ? String(phone).trim() : null,
      },
      include: { role: true },
    });

    res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role.roleName,
        permissions: user.role.permissions,
        mfaEnabled: user.mfaEnabled,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error updating current user:', error);
    res.status(500).json({ message: 'Server error updating user settings' });
  }
};

export const updateCurrentUserMfa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mfaEnabled = Boolean(req.body.mfaEnabled);
    const user = await prisma.user.update({
      where: { userId: req.user!.userId },
      data: { mfaEnabled },
      include: { role: true },
    });

    res.status(200).json({
      success: true,
      message: `MFA ${mfaEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role.roleName,
        permissions: user.role.permissions,
        mfaEnabled: user.mfaEnabled,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error updating current user MFA:', error);
    res.status(500).json({ message: 'Error updating MFA status' });
  }
};

export const createAccessRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestedModule, reason, sensitivity = 'Internal' } = req.body;
    if (!requestedModule || !reason) {
      res.status(400).json({ message: 'requestedModule and reason are required' });
      return;
    }
    const accessRequest = await prisma.accessRequest.create({
      data: {
        userId: req.user!.userId,
        requestedModule: String(requestedModule),
        reason: String(reason),
        sensitivity: String(sensitivity),
      },
    });
    res.status(201).json({ success: true, data: accessRequest });
  } catch (error) {
    console.error('Error creating access request:', error);
    res.status(500).json({ message: 'Server error creating access request' });
  }
};

export const getMyAccessRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accessRequests = await prisma.accessRequest.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: accessRequests });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving access requests' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // For security reasons, don't reveal if a user exists
      res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetLink(email, resetLink);

    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, token, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.resetToken !== token || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    res.status(200).json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
