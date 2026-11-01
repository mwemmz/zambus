import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';

type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REFUNDED';
type BoardingStatus = 'NOT_BOARDED' | 'BOARDED' | 'DROPPED_OFF';

interface BookingAttributes {
  bookingId: string;
  tripId: string;
  passengerId: string;
  seatNumber: number;
  qrCodeData: string;
  paymentStatus: PaymentStatus;
  boardingStatus: BoardingStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BookingCreationAttributes extends Optional<BookingAttributes, 'bookingId' | 'qrCodeData' | 'paymentStatus' | 'boardingStatus' | 'createdAt' | 'updatedAt'> {}

class Booking extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
  public bookingId!: string;
  public tripId!: string;
  public passengerId!: string;
  public seatNumber!: number;
  public qrCodeData!: string;
  public paymentStatus!: PaymentStatus;
  public boardingStatus!: BoardingStatus;
  public createdAt?: Date;
  public updatedAt?: Date;

  public static associations: {
    trip: Association<Booking, any>;
    passenger: Association<Booking, any>;
  };
}

Booking.init(
  {
    bookingId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tripId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'trips',
        key: 'tripId',
      },
    },
    passengerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'userId',
      },
    },
    seatNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    qrCodeData: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    paymentStatus: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'REFUNDED'),
      defaultValue: 'PENDING',
    },
    boardingStatus: {
      type: DataTypes.ENUM('NOT_BOARDED', 'BOARDED', 'DROPPED_OFF'),
      defaultValue: 'NOT_BOARDED',
    },
  },
  {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tripId', 'seatNumber'],
        name: 'unique_trip_seat',
      },
      {
        fields: ['tripId'],
        name: 'idx_bookings_trip',
      },
      {
        fields: ['passengerId'],
        name: 'idx_bookings_passenger',
      },
    ],
  }
);

export { Booking, BookingAttributes, BookingCreationAttributes, PaymentStatus, BoardingStatus };
