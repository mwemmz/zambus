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
        routeName: 'Lusaka - Kabwe',
        origin: 'Lusaka',
        destination: 'Kabwe',
        intermediateStops: [],
        estimatedTravelTime: 150,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Kapiri Mposhi',
        origin: 'Lusaka',
        destination: 'Kapiri Mposhi',
        intermediateStops: ['Kabwe'],
        estimatedTravelTime: 240,
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
        routeName: 'Lusaka - Kitwe',
        origin: 'Lusaka',
        destination: 'Kitwe',
        intermediateStops: ['Kabwe', 'Kapiri Mposhi', 'Ndola'],
        estimatedTravelTime: 450,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Chingola',
        origin: 'Lusaka',
        destination: 'Chingola',
        intermediateStops: ['Kabwe', 'Kapiri Mposhi', 'Ndola', 'Kitwe'],
        estimatedTravelTime: 510,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Mufulira',
        origin: 'Lusaka',
        destination: 'Mufulira',
        intermediateStops: ['Kabwe', 'Kapiri Mposhi', 'Ndola', 'Kitwe'],
        estimatedTravelTime: 510,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Solwezi',
        origin: 'Lusaka',
        destination: 'Solwezi',
        intermediateStops: ['Kabwe', 'Kapiri Mposhi', 'Ndola', 'Kitwe', 'Chingola'],
        estimatedTravelTime: 720,
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
        routeName: 'Lusaka - Petauke',
        origin: 'Lusaka',
        destination: 'Petauke',
        intermediateStops: ['Luangwa', 'Nyimba'],
        estimatedTravelTime: 360,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Katete',
        origin: 'Lusaka',
        destination: 'Katete',
        intermediateStops: ['Luangwa', 'Nyimba', 'Petauke'],
        estimatedTravelTime: 390,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Mongu',
        origin: 'Lusaka',
        destination: 'Mongu',
        intermediateStops: ['Mumbwa', 'Kaoma'],
        estimatedTravelTime: 480, // 8 hours
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Kaoma',
        origin: 'Lusaka',
        destination: 'Kaoma',
        intermediateStops: ['Mumbwa'],
        estimatedTravelTime: 360,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Kasama',
        origin: 'Lusaka',
        destination: 'Kasama',
        intermediateStops: ['Kabwe', 'Kapiri Mposhi', 'Serenje', 'Mpika'],
        estimatedTravelTime: 660,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Lusaka - Mansa',
        origin: 'Lusaka',
        destination: 'Mansa',
        intermediateStops: ['Kabwe', 'Kapiri Mposhi', 'Mkushi', 'Mumbwa'],
        estimatedTravelTime: 600,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Ndola - Kitwe',
        origin: 'Ndola',
        destination: 'Kitwe',
        intermediateStops: [],
        estimatedTravelTime: 90,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Ndola - Livingstone',
        origin: 'Ndola',
        destination: 'Livingstone',
        intermediateStops: ['Kabwe', 'Lusaka', 'Kafue', 'Choma'],
        estimatedTravelTime: 600,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Kitwe - Solwezi',
        origin: 'Kitwe',
        destination: 'Solwezi',
        intermediateStops: ['Chingola'],
        estimatedTravelTime: 300,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Livingstone - Choma',
        origin: 'Livingstone',
        destination: 'Choma',
        intermediateStops: ['Kalomo'],
        estimatedTravelTime: 180,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Livingstone - Lusaka',
        origin: 'Livingstone',
        destination: 'Lusaka',
        intermediateStops: ['Kalomo', 'Choma', 'Kafue'],
        estimatedTravelTime: 360,
        approvalStatus: 'APPROVED',
      },
      {
        routeName: 'Livingstone - Kasama',
        origin: 'Livingstone',
        destination: 'Kasama',
        intermediateStops: ['Lusaka', 'Kabwe', 'Mpika'],
        estimatedTravelTime: 600, // 10 hours
        approvalStatus: 'APPROVED',
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
    const trips = routes.map((routeData, index) => {
      const departureTime = new Date(now.getTime() + (index % 3 + 1) * 24 * 60 * 60 * 1000);
      return {
        busId: createdBuses[index % 2]?.busId,
        routeId: createdRoutes[index]?.routeId,
        driverId: driver?.userId,
        departureTime,
        estimatedArrival: new Date(departureTime.getTime() + routeData.estimatedTravelTime * 60 * 1000),
        fareAmount: Math.max(50, Math.round(routeData.estimatedTravelTime / 3)),
        status: 'SCHEDULED',
        isRecurring: index === 3,
        recurrencePattern: index === 3 ? 'DAILY' : undefined,
      };
    });

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
