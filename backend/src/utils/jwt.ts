import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'super_secret_jwt_key_for_development_only') {
    throw new Error('JWT_SECRET must be configured with a secure value of at least 32 characters.');
  }
  return secret;
};

export const assertJwtConfiguration = (): void => {
  getJwtSecret();
};

export const generateToken = (userId: string, roleName: string): string => {
  return jwt.sign({ userId, role: roleName }, getJwtSecret(), {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, getJwtSecret());
};
