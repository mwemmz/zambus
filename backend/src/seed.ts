import { sequelize } from './config/database';
import { initModels } from './models';
import { hashPassword } from './utils/password';

/**
 * ZamBus Database Seed Script
 *
 * Creates test users for all roles with known credentials.
 *
 * Run: npx ts-node src/seed.ts
 */

async function seed(): Promise<void> {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected.');

    // Initialize models
    await initModels();
    console.log('Models initialized.');

    // Sync database (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synced.');

    const { User, BusCompany, Bus, Route, Trip } = require('./models');

    // ==========================================
    // Seed Users
    // ==========================================
    console.log('\nSeeding users...');

    const users = [
      {
        fullName: 'Admin User',
        email: 'admin@zambus.com',
        phoneNumber: '+260977000001',
        password: 'admin123',
        role: 'ADMIN',
      },
      {
        fullName: 'John Operator',
        email: 'operator@zambus.com',
        phoneNumber: '+260977000002',
        password: 'operator123',
        role: 'OPERATOR',
      },
      {
        fullName: 'David Driver',
        email: 'driver@zambus.com',
        phoneNumber: '+260977000003',
        password: 'driver123',
        role: 'DRIVER',
      },
      {
        fullName: 'Jane Passenger',
        email: 'passenger@zambus.com',
        phoneNumber: '+260977000004',
        password: 'passenger123',
        role: 'PASSENGER',
      },
      {
        fullName: 'Mike Passenger',
        email: 'mike@zambus.com',
        phoneNumber: '+260977000005',
        password: 'passenger123',
        role: 'PASSENGER',
      },
    ];

    const createdUsers: any[] = [];

    for (const userData of users) {
      const passwordHash = await hashPassword(userData.password);

      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: {
          fullName: userData.fullName,
          phoneNumber: userData.phoneNumber,
          passwordHash,
          role: userData.role,
          isActive: true,
        },
      });

      createdUsers.push(user);
      console.log(`  ${created ? 'Created' : 'Exists'}: ${userData.fullName} (${userData.role}) - ${userData.email}`);
    }

    // ==========================================
    // Seed Bus Company (owned by Operator)
    // ==========================================
    console.log('\nSeeding bus company...');

    const operator = createdUsers.find((u: any) => u.role === 'OPERATOR');

    const [company, companyCreated] = await BusCompany.findOrCreate({
      where: { operatorId: operator.userId },
      defaults: {
        companyName: 'ZamBus Express Ltd',
        registrationNumber: 'ZB-2024-001',
        contactEmail: 'info@zambusexpress.com',
        contactPhone: '+260977100001',
        isApproved: true,
      },
    });

    console.log(`  ${companyCreated ? 'Created' : 'Exists'}: ${company.companyName}`);

    // ==========================================
    // Seed Buses
    // ==========================================
    console.log('\nSeeding buses...');

    const buses = [
      {
        registrationNumber: 'ZB-BUS-001',
        model: 'Toyota Coaster',
        seatCapacity: 30,
        amenities: ['WiFi', 'USB Charging'],
        maintenanceStatus: 'OPERATIONAL',
        approvalStatus: 'APPROVED',
      },
      {
        registrationNumber: 'ZB-BUS-002',
        model: 'Nissan Civilian',
        seatCapacity: 45,
        amenities: ['WiFi', 'USB Charging', 'Entertainment'],
        maintenanceStatus: 'OPERATIONAL',
        approvalStatus: 'APPROVED',
      },
      {
        registrationNumber: 'ZB-BUS-003',
        model: 'Hyundai County',
        seatCapacity: 25,
        amenities: ['WiFi'],
        maintenanceStatus: 'MAINTENANCE',
        approvalStatus: 'PENDING',
      },
      {
        registrationNumber: 'ZB-BUS-004',
        model: 'Hino 300',
        seatCapacity: 34,
        amenities: ['AC', 'USB Charging'],
        maintenanceStatus: 'OPERATIONAL',
        approvalStatus: 'PENDING',
      },
    ];

    const createdBuses: any[] = [];

    for (const busData of buses) {
      const [bus, busCreated] = await Bus.findOrCreate({
        where: { registrationNumber: busData.registrationNumber },
        defaults: {
          companyId: company.companyId,
          ...busData,
        },
      });

      createdBuses.push(bus);
      console.log(`  ${busCreated ? 'Created' : 'Exists'}: ${bus.registrationNumber} (${bus.model})`);
    }

    // ==========================================
    // Seed Routes
    // ==========================================
    console.log('\nSeeding routes...');

    const routes = [
      {
        routeName: 'Lusaka - Livingstone',
        origin: 'Lusaka',
        destination: 'Livingstone',
        intermediateStops: ['Kafue', 'Choma', 'Kalomo'],
        estimatedTravelTime: 360, // 6 hours
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Ndola',
        origin: 'Lusaka',
        destination: 'Ndola',
        intermediateStops: ['Kabwe', 'Kapiri Mposhi', 'Mpika'],
        estimatedTravelTime: 420, // 7 hours
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Chipata',
        origin: 'Lusaka',
        destination: 'Chipata',
        intermediateStops: ['Mazabuka', 'Petauke'],
        estimatedTravelTime: 300, // 5 hours
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Mongu',
        origin: 'Lusaka',
        destination: 'Mongu',
        intermediateStops: ['Mumbwa', 'Kaoma'],
        estimatedTravelTime: 480, // 8 hours
        approvalStatus: 'PENDING',
      },
    ];

    const createdRoutes: any[] = [];

    for (const routeData of routes) {
      const [route, routeCreated] = await Route.findOrCreate({
        where: { routeName: routeData.routeName },
        defaults: {
          companyId: company.companyId,
          ...routeData,
        },
      });

      createdRoutes.push(route);
      console.log(`  ${routeCreated ? 'Created' : 'Exists'}: ${route.routeName}`);
    }

    // ==========================================
    // Seed Trips
    // ==========================================
    console.log('\nSeeding trips...');

    const driver = createdUsers.find((u: any) => u.role === 'DRIVER');

    const now = new Date();
    const trips = [
      {
        busId: createdBuses[0]?.busId,
        routeId: createdRoutes[0]?.routeId,
        driverId: driver?.userId,
        departureTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        estimatedArrival: new Date(now.getTime() + 30 * 60 * 60 * 1000), // Tomorrow + 6h
        fareAmount: 150.00,
        status: 'SCHEDULED',
        isRecurring: false,
      },
      {
        busId: createdBuses[1]?.busId,
        routeId: createdRoutes[1]?.routeId,
        driverId: driver?.userId,
        departureTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // Day after tomorrow
        estimatedArrival: new Date(now.getTime() + 55 * 60 * 60 * 1000), // +7h
        fareAmount: 200.00,
        status: 'SCHEDULED',
        isRecurring: true,
        recurrencePattern: 'DAILY',
      },
    ];

    const createdTrips: any[] = [];

    for (const tripData of trips) {
      const trip = await Trip.create(tripData);
      createdTrips.push(trip);
      console.log(`  Created trip: ${trip.tripId} (Fare: ZMW ${trip.fareAmount})`);
    }

    console.log('\n=========================================');
    console.log('✅ Seed completed successfully!');
    console.log('=========================================');
    console.log('\n📋 Login Credentials:');
    console.log('─────────────────────────────────────');
    console.log('ADMIN:      admin@zambus.com / admin123');
    console.log('OPERATOR:   operator@zambus.com / operator123');
    console.log('DRIVER:     driver@zambus.com / driver123');
    console.log('PASSENGER:  passenger@zambus.com / passenger123');
    console.log('PASSENGER:  mike@zambus.com / passenger123');
    console.log('─────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
