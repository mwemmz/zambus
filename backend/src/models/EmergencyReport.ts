import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';

type EmergencyType = 'BREAKDOWN' | 'ACCIDENT' | 'SEVERE_DELAY';

interface EmergencyReportAttributes {
  reportId: string;
  tripId: string | null;
  driverId: string | null;
  emergencyType: EmergencyType;
  description: string | null;
  location: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EmergencyReportCreationAttributes extends Optional<EmergencyReportAttributes, 'reportId' | 'tripId' | 'driverId' | 'description' | 'location' | 'createdAt' | 'updatedAt'> {}

class EmergencyReport extends Model<EmergencyReportAttributes, EmergencyReportCreationAttributes> implements EmergencyReportAttributes {
  public reportId!: string;
  public tripId!: string | null;
  public driverId!: string | null;
  public emergencyType!: EmergencyType;
  public description!: string | null;
  public location!: string | null;
  public createdAt?: Date;
  public updatedAt?: Date;

  public static associations: {
    trip: Association<EmergencyReport, any>;
    driver: Association<EmergencyReport, any>;
  };
}

EmergencyReport.init(
  {
    reportId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tripId: {
      type: DataTypes.UUID,
      references: {
        model: 'trips',
        key: 'tripId',
      },
    },
    driverId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'userId',
      },
    },
    emergencyType: {
      type: DataTypes.ENUM('BREAKDOWN', 'ACCIDENT', 'SEVERE_DELAY'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    location: {
      type: DataTypes.STRING(200),
    },
  },
  {
    sequelize,
    modelName: 'EmergencyReport',
    tableName: 'emergency_reports',
    timestamps: true,
    underscored: true,
  }
);

export { EmergencyReport, EmergencyReportAttributes, EmergencyReportCreationAttributes, EmergencyType };
