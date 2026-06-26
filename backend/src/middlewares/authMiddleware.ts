import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/db';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    permissions?: any;
  };
}

const permissionModules = (permissions: any): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  if (Array.isArray(permissions.modules)) return permissions.modules;
  return Object.entries(permissions)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
};

export const hasModulePermission = (permissions: any, moduleName: string): boolean => {
  const modules = permissionModules(permissions);
  return modules.includes('*') || modules.includes(moduleName);
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. Token missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
      include: { role: true }
    });

    if (!user || user.status !== 'active') {
      res.status(401).json({ message: 'User account is inactive or not found.' });
      return;
    }

    req.user = {
      userId: user.userId,
      role: user.role.roleName,
      permissions: user.role.permissions,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requirePermission = (moduleName: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    if (!hasModulePermission(req.user.permissions, moduleName)) {
      res.status(403).json({ message: `Access denied. Missing permission: ${moduleName}` });
      return;
    }

    next();
  };
};

export const requireAnyPermission = (moduleNames: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    if (!moduleNames.some(moduleName => hasModulePermission(req.user?.permissions, moduleName))) {
      res.status(403).json({ message: `Access denied. Requires one of: ${moduleNames.join(', ')}` });
      return;
    }

    next();
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
      return;
    }
    
    next();
  };
};
