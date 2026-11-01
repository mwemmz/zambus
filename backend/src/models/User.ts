import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';

interface UserAttributes {
  userId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  passwordHash: string;
  role: 'PASSENGER' | 'DRIVER' | 'OPERATOR' | 'ADMIN';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'userId' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public userId!: string;
  public fullName!: string;
  public phoneNumber!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: 'PASSENGER' | 'DRIVER' | 'OPERATOR' | 'ADMIN';
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  public async setPassword(password: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(password, salt);
  }

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  public static associations: {
    busCompanies: Association<User, any>;
    buses: Association<User, any>;
    trips: Association<User, any>;
    bookings: Association<User, any>;
    emergencyReports: Association<User, any>;
  };
}

User.init(
  {
    userId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING(15),
      unique: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('PASSENGER', 'DRIVER', 'OPERATOR', 'ADMIN'),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);

export { User, UserAttributes, UserCreationAttributes };
