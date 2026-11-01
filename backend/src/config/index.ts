import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  app: {
    name: process.env.APP_NAME || 'ZamBus',
    commissionRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10'),
  },
};
