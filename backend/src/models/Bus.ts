import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';

type MaintenanceStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface BusAttributes {
  busId: string;
  companyId: string;
  registrationNumber: string;
  model: string;
  seatCapacity: number;
  amenities: string[];
  maintenanceStatus: MaintenanceStatus;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BusCreationAttributes extends Optional<BusAttributes, 'busId' | 'amenities' | 'maintenanceStatus' | 'approvalStatus' | 'rejectionReason' | 'createdAt' | 'updatedAt'> {}

export function createBusModel(sequelize: any) {
  class Bus extends Model<BusAttributes, BusCreationAttributes> implements BusAttributes {
    public busId!: string;
    public companyId!: string;
    public registrationNumber!: string;
    public model!: string;
    public seatCapacity!: number;
    public amenities!: string[];
    public maintenanceStatus!: MaintenanceStatus;
    public approvalStatus!: ApprovalStatus;
    public rejectionReason?: string | null;
    public createdAt?: Date;
    public updatedAt?: Date;

    public static associations: {
      company: Association<Bus, any>;
      trips: Association<Bus, any>;
    };
  }

  Bus.init(
    {
      busId: {
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
      registrationNumber: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      seatCapacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      amenities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      maintenanceStatus: {
        type: DataTypes.ENUM('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE'),
        defaultValue: 'OPERATIONAL',
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
      modelName: 'Bus',
      tableName: 'buses',
      timestamps: true,
      underscored: true,
    }
  );

  return Bus;
}

export { BusAttributes, BusCreationAttributes, MaintenanceStatus };
