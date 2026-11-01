import { Sequelize, Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

// Define interfaces
export interface UserAttributes {
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

export interface BusCompanyAttributes {
  companyId: string;
  operatorId: string;
  companyName: string;
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  isApproved: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BusAttributes {
  busId: string;
  companyId: string;
  registrationNumber: string;
  model: string;
  seatCapacity: number;
  amenities: string[];
  maintenanceStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RouteAttributes {
  routeId: string;
  companyId: string;
  routeName: string;
  origin: string;
  destination: string;
  intermediateStops: string[];
  estimatedTravelTime?: number;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TripAttributes {
  tripId: string;
  busId?: string;
  routeId?: string;
  driverId?: string;
  departureTime: Date;
  estimatedArrival: Date;
  fareAmount: number;
  status: 'SCHEDULED' | 'BOARDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  isRecurring: boolean;
  recurrencePattern?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookingAttributes {
  bookingId: string;
  tripId: string;
  passengerId: string;
  seatNumber: number;
  qrCodeData: string;
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'REFUNDED';
  boardingStatus: 'NOT_BOARDED' | 'BOARDED' | 'DROPPED_OFF';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmergencyReportAttributes {
  reportId: string;
  tripId?: string;
  driverId?: string;
  emergencyType: 'BREAKDOWN' | 'ACCIDENT' | 'SEVERE_DELAY';
  description?: string;
  location?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Model classes - will be initialized after sequelize is ready
export let User: any;
export let BusCompany: any;
export let Bus: any;
export let Route: any;
export let Trip: any;
export let Booking: any;
export let EmergencyReport: any;
export let CommissionSettings: any;

// Initialize all models
export async function initModels(): Promise<void> {
  User = sequelize.define('User', {
    userId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fullName: { type: DataTypes.STRING(100), allowNull: false },
    phoneNumber: { type: DataTypes.STRING(15), unique: true, allowNull: false },
    email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('PASSENGER', 'DRIVER', 'OPERATOR', 'ADMIN'), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'users', timestamps: true });

  BusCompany = sequelize.define('BusCompany', {
    companyId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    operatorId: { type: DataTypes.UUID, allowNull: false },
    companyName: { type: DataTypes.STRING(150), allowNull: false },
    registrationNumber: { type: DataTypes.STRING(50) },
    contactEmail: { type: DataTypes.STRING(100) },
    contactPhone: { type: DataTypes.STRING(15) },
    isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'bus_companies', timestamps: true });

  Bus = sequelize.define('Bus', {
    busId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false },
    registrationNumber: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    model: { type: DataTypes.STRING(100), allowNull: false },
    seatCapacity: { type: DataTypes.INTEGER, allowNull: false },
    amenities: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    maintenanceStatus: { type: DataTypes.ENUM('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE'), defaultValue: 'OPERATIONAL' },
    approvalStatus: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'PENDING' },
    rejectionReason: { type: DataTypes.STRING(255) },
  }, { tableName: 'buses', timestamps: true });

  Route = sequelize.define('Route', {
    routeId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false },
    routeName: { type: DataTypes.STRING(150), allowNull: false },
    origin: { type: DataTypes.STRING(100), allowNull: false },
    destination: { type: DataTypes.STRING(100), allowNull: false },
    intermediateStops: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    estimatedTravelTime: { type: DataTypes.INTEGER },
    approvalStatus: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'PENDING' },
    rejectionReason: { type: DataTypes.STRING(255) },
  }, { tableName: 'routes', timestamps: true });

  Trip = sequelize.define('Trip', {
    tripId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    busId: { type: DataTypes.UUID },
    routeId: { type: DataTypes.UUID },
    driverId: { type: DataTypes.UUID },
    departureTime: { type: DataTypes.DATE, allowNull: false },
    estimatedArrival: { type: DataTypes.DATE, allowNull: false },
    fareAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'), defaultValue: 'SCHEDULED' },
    isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
    recurrencePattern: { type: DataTypes.STRING(50) },
  }, { tableName: 'trips', timestamps: true });

  Booking = sequelize.define('Booking', {
    bookingId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tripId: { type: DataTypes.UUID, allowNull: false },
    passengerId: { type: DataTypes.UUID, allowNull: false },
    seatNumber: { type: DataTypes.INTEGER, allowNull: false },
    qrCodeData: { type: DataTypes.TEXT, allowNull: false },
    paymentStatus: { type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'REFUNDED'), defaultValue: 'PENDING' },
    boardingStatus: { type: DataTypes.ENUM('NOT_BOARDED', 'BOARDED', 'DROPPED_OFF'), defaultValue: 'NOT_BOARDED' },
  }, { tableName: 'bookings', timestamps: true, indexes: [{ unique: true, fields: ['tripId', 'seatNumber'], name: 'unique_trip_seat' }] });

  EmergencyReport = sequelize.define('EmergencyReport', {
    reportId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tripId: { type: DataTypes.UUID },
    driverId: { type: DataTypes.UUID },
    emergencyType: { type: DataTypes.ENUM('BREAKDOWN', 'ACCIDENT', 'SEVERE_DELAY'), allowNull: false },
    description: { type: DataTypes.TEXT },
    location: { type: DataTypes.STRING(200) },
  }, { tableName: 'emergency_reports', timestamps: true });

  // Setup associations
  User.hasMany(BusCompany, { foreignKey: 'operatorId', as: 'busCompanies' });
  BusCompany.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

  BusCompany.hasMany(Bus, { foreignKey: 'companyId', as: 'buses' });
  Bus.belongsTo(BusCompany, { foreignKey: 'companyId', as: 'company' });

  BusCompany.hasMany(Route, { foreignKey: 'companyId', as: 'routes' });
  Route.belongsTo(BusCompany, { foreignKey: 'companyId', as: 'company' });

  Bus.hasMany(Trip, { foreignKey: 'busId', as: 'trips' });
  Trip.belongsTo(Bus, { foreignKey: 'busId', as: 'bus' });

  Route.hasMany(Trip, { foreignKey: 'routeId', as: 'trips' });
  Trip.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

  User.hasMany(Trip, { foreignKey: 'driverId', as: 'trips' });
  Trip.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });

  Trip.hasMany(Booking, { foreignKey: 'tripId', as: 'bookings' });
  Booking.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

  User.hasMany(Booking, { foreignKey: 'passengerId', as: 'bookings' });
  Booking.belongsTo(User, { foreignKey: 'passengerId', as: 'passenger' });

  Trip.hasMany(EmergencyReport, { foreignKey: 'tripId', as: 'emergencyReports' });
  EmergencyReport.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

  User.hasMany(EmergencyReport, { foreignKey: 'driverId', as: 'emergencyReports' });
  EmergencyReport.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });

  // Commission settings (singleton row for platform config)
  CommissionSettings = sequelize.define('CommissionSettings', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    commissionRate: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 0.10 },
    platformName: { type: DataTypes.STRING(100), defaultValue: 'ZamBus' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'ZMW' },
    seatLockDurationMinutes: { type: DataTypes.INTEGER, defaultValue: 10 },
  }, { tableName: 'commission_settings', timestamps: true });

  console.log('All models initialized and associations set up');
}
