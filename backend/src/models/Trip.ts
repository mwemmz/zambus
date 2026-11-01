import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';

type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

interface TripAttributes {
  tripId: string;
  busId: string | null;
  routeId: string | null;
  driverId: string | null;
  departureTime: Date;
  estimatedArrival: Date;
  fareAmount: number;
  status: TripStatus;
  isRecurring: boolean;
  recurrencePattern: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TripCreationAttributes extends Optional<TripAttributes, 'tripId' | 'busId' | 'routeId' | 'driverId' | 'status' | 'isRecurring' | 'recurrencePattern' | 'createdAt' | 'updatedAt'> {}

class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
  public tripId!: string;
  public busId!: string | null;
  public routeId!: string | null;
  public driverId!: string | null;
  public departureTime!: Date;
  public estimatedArrival!: Date;
  public fareAmount!: number;
  public status!: TripStatus;
  public isRecurring!: boolean;
  public recurrencePattern!: string | null;
  public createdAt?: Date;
  public updatedAt?: Date;

  public static associations: {
    bus: Association<Trip, any>;
    route: Association<Trip, any>;
    driver: Association<Trip, any>;
    bookings: Association<Trip, any>;
    emergencyReports: Association<Trip, any>;
  };
}

Trip.init(
  {
    tripId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    busId: {
      type: DataTypes.UUID,
      references: {
        model: 'buses',
        key: 'busId',
      },
    },
    routeId: {
      type: DataTypes.UUID,
      references: {
        model: 'routes',
        key: 'routeId',
      },
    },
    driverId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'userId',
      },
    },
    departureTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    estimatedArrival: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fareAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'SCHEDULED',
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    recurrencePattern: {
      type: DataTypes.STRING(50),
    },
  },
  {
    sequelize,
    modelName: 'Trip',
    tableName: 'trips',
    timestamps: true,
    underscored: true,
  }
);

export { Trip, TripAttributes, TripCreationAttributes, TripStatus };
