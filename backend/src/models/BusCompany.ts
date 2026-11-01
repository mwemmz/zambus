import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

interface BusCompanyAttributes {
  companyId: string;
  operatorId: string;
  companyName: string;
  registrationNumber: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isApproved: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BusCompanyCreationAttributes extends Optional<BusCompanyAttributes, 'companyId' | 'registrationNumber' | 'contactEmail' | 'contactPhone' | 'isApproved' | 'createdAt'> {}

class BusCompany extends Model<BusCompanyAttributes, BusCompanyCreationAttributes> implements BusCompanyAttributes {
  public companyId!: string;
  public operatorId!: string;
  public companyName!: string;
  public registrationNumber!: string | null;
  public contactEmail!: string | null;
  public contactPhone!: string | null;
  public isApproved!: boolean;
  public createdAt!: Date;

  public static associations: {
    operator: Association<BusCompany, User>;
    buses: Association<BusCompany, any>;
    routes: Association<BusCompany, any>;
  };
}

BusCompany.init(
  {
    companyId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    operatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'userId',
      },
    },
    companyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    registrationNumber: {
      type: DataTypes.STRING(50),
    },
    contactEmail: {
      type: DataTypes.STRING(100),
    },
    contactPhone: {
      type: DataTypes.STRING(15),
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'BusCompany',
    tableName: 'bus_companies',
    timestamps: true,
    underscored: true,
  }
);

User.hasMany(BusCompany, { foreignKey: 'operatorId', as: 'busCompanies' });
BusCompany.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

export { BusCompany, BusCompanyAttributes, BusCompanyCreationAttributes };
