import { generateToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';

export async function registerUser(input: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role?: 'PASSENGER' | 'DRIVER' | 'OPERATOR' | 'ADMIN';
}): Promise<{ user: any; token: string }> {
  const { User, BusCompany } = await import('../models');
  const { Op } = await import('sequelize');

  const { fullName, email, phoneNumber, password, role = 'PASSENGER' } = input;

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { phoneNumber }],
    },
  });

  if (existingUser) {
    throw new Error('User with this email or phone already exists');
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    fullName,
    email,
    phoneNumber,
    passwordHash,
    role,
    isActive: true,
  });

  const token = generateToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });

  return { user, token };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: any; token: string }> {
  const { User } = await import('../models');

  const { email, password } = input;

  const user = await User.findOne({
    where: { email, isActive: true },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });

  return { user, token };
}

export async function getUserById(userId: string): Promise<any | null> {
  const { User } = await import('../models');
  return User.findByPk(userId);
}

export async function updateUserProfile(
  userId: string,
  updates: { fullName?: string; phoneNumber?: string }
): Promise<any> {
  const { User } = await import('../models');
  const { Op } = await import('sequelize');

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (updates.fullName) {
    user.fullName = updates.fullName;
  }
  if (updates.phoneNumber) {
    const existingUser = await User.findOne({
      where: { phoneNumber: updates.phoneNumber, userId: { [Op.ne]: userId } },
    });
    if (existingUser) {
      throw new Error('Phone number already in use');
    }
    user.phoneNumber = updates.phoneNumber;
  }

  await user.save();
  return user;
}

export async function createBusCompanyIfNotExists(operatorId: string, companyName: string): Promise<any> {
  const { BusCompany } = await import('../models');

  const existingCompany = await BusCompany.findOne({
    where: { operatorId },
  });

  if (existingCompany) {
    return existingCompany;
  }

  const company = await BusCompany.create({
    operatorId,
    companyName,
    isApproved: false,
  });

  return company;
}
