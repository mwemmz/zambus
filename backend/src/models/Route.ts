import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';
import { BusCompany } from './BusCompany';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface RouteAttributes {
  routeId: string;
  companyId: string;
  routeName: string;
  origin: string;
  destination: string;
  intermediateStops: string[];
  estimatedTravelTime: number | null;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RouteCreationAttributes extends Optional<RouteAttributes, 'routeId' | 'intermediateStops' | 'estimatedTravelTime' | 'approvalStatus' | 'rejectionReason' | 'createdAt'> {}

class Route extends Model<RouteAttributes, RouteCreationAttributes> implements RouteAttributes {
  public routeId!: string;
  public companyId!: string;
  public routeName!: string;
  public origin!: string;
  public destination!: string;
  public intermediateStops!: string[];
  public estimatedTravelTime!: number | null;
  public approvalStatus!: ApprovalStatus;
  public rejectionReason?: string | null;
  public createdAt!: Date;

  public static associations: {
    company: Association<Route, BusCompany>;
    trips: Association<Route, any>;
  };
}

Route.init(
  {
    routeId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'bus_companies',
        key: 'companyId',
      },
    },
    routeName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    origin: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    intermediateStops: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    estimatedTravelTime: {
      type: DataTypes.INTEGER,
    },
    approvalStatus: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      defaultValue: 'PENDING',
    },
    rejectionReason: {
      type: DataTypes.STRING(255),
    },
  },
  {
    sequelize,
    modelName: 'Route',
    tableName: 'routes',
    timestamps: true,
    underscored: true,
  }
);

BusCompany.hasMany(Route, { foreignKey: 'companyId', as: 'routes' });
Route.belongsTo(BusCompany, { foreignKey: 'companyId', as: 'company' });

export { Route, RouteAttributes, RouteCreationAttributes };
