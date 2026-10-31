/**
 * ZamBus seed data (idempotent).
 *
 * Seeds:
 *  - The five roles and their permissions.
 *  - The five platform accounts used during development and demos.
 *  - One approved demo operator, its staff, fleet, routes and daily schedules.
 *  - Seven days of trips with full seat inventories.
 *  - GreenTrack emission factors with documented sources.
 *
 * Run with: npm run seed
 */
import { PrismaClient, RoleName, OperatorStaffRole, FuelType, TripStatus, SeatType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS: Record<string, string> = {
  'booking:self': 'Manage own bookings and tickets',
  'booking:read:any': 'Read bookings across the platform',
  'fleet:manage': 'Create and manage buses',
  'routes:manage': 'Create and manage routes and schedules',
  'trips:read': 'Read trips',
  'trips:manage': 'Create, publish and cancel trips',
  'trips:execute': 'Start, delay and complete assigned trips',
  'manifests:read': 'Read passenger manifests',
  'tickets:verify': 'Validate and board QR tickets',
  'incidents:report': 'Report trip incidents',
  'incidents:manage': 'Review and resolve incidents',
  'greentrack:read': 'View GreenTrack reports',
  'greentrack:write': 'Submit fuel records',
  'reports:read': 'View revenue and occupancy reports',
  'operators:approve': 'Approve or suspend operators',
  'users:manage': 'Manage platform users',
  'config:manage': 'Manage platform configuration',
  'audit:read': 'Read audit logs',
};

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  [RoleName.PASSENGER]: ['booking:self'],
  [RoleName.OPERATOR]: [
    'fleet:manage',
    'routes:manage',
    'trips:read',
    'trips:manage',
    'manifests:read',
    'reports:read',
    'greentrack:read',
    'greentrack:write',
  ],
  [RoleName.DRIVER]: [
    'trips:read',
    'trips:execute',
    'manifests:read',
    'tickets:verify',
    'incidents:report',
    'greentrack:write',
  ],
  [RoleName.CONDUCTOR]: [
    'trips:read',
    'trips:execute',
    'manifests:read',
    'tickets:verify',
    'incidents:report',
  ],
  [RoleName.ADMIN]: Object.keys(PERMISSIONS),
};

function hash(password: string): string {
  return bcrypt.hashSync(password, 12);
}

function seatLabels(capacity: number): Array<{ label: string; type: SeatType; row: number; column: number }> {
  const rows = Math.ceil(capacity / 4);
  const letters = ['A', 'B', 'C', 'D'];
  const seats: Array<{ label: string; type: SeatType; row: number; column: number }> = [];
  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= 4; column += 1) {
      if (seats.length >= capacity) break;
      seats.push({
        label: `${row}${letters[column - 1]}`,
        type: column === 1 || column === 4 ? SeatType.WINDOW : SeatType.AISLE,
        row,
        column,
      });
    }
  }
  return seats;
}

async function seedRolesAndPermissions(): Promise<void> {
  for (const [code, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description },
      update: { description },
    });
  }

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, description: `${roleName} role` },
      update: {},
    });

    const codes = ROLE_PERMISSIONS[roleName];
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  console.log(`✓ ${Object.keys(PERMISSIONS).length} permissions and 5 roles seeded`);
}

async function upsertUser(input: {
  email: string;
  fullName: string;
  phone: string;
  password: string;
  role: RoleName;
}): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const user = existing
    ? await prisma.user.update({
        where: { email: input.email },
        data: { fullName: input.fullName, status: 'ACTIVE' },
      })
    : await prisma.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          phone: input.phone,
          passwordHash: hash(input.password),
          status: 'ACTIVE',
        },
      });

  const role = await prisma.role.findUniqueOrThrow({ where: { name: input.role } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });

  return user.id;
}

async function seedUsersAndOperator(): Promise<{ operatorId: string; busIds: string[]; routeIds: string[] }> {
  const adminId = await upsertUser({
    email: 'admin@zambus.zm',
    fullName: 'ZamBus Administrator',
    phone: '0970000001',
    password: 'Admin123!',
    role: RoleName.ADMIN,
  });

  const operatorUserId = await upsertUser({
    email: 'operator@zambus.zm',
    fullName: 'Chanda Mwansa (Operations)',
    phone: '0970000002',
    password: 'Operator123!',
    role: RoleName.OPERATOR,
  });

  const driverId = await upsertUser({
    email: 'driver@zambus.zm',
    fullName: 'Joseph Banda',
    phone: '0970000003',
    password: 'Driver123!',
    role: RoleName.DRIVER,
  });

  const conductorId = await upsertUser({
    email: 'conductor@zambus.zm',
    fullName: 'Mary Phiri',
    phone: '0970000004',
    password: 'Conductor123!',
    role: RoleName.CONDUCTOR,
  });

  await upsertUser({
    email: 'passenger@zambus.zm',
    fullName: 'Thandiwe Zulu',
    phone: '0970000005',
    password: 'Passenger123!',
    role: RoleName.PASSENGER,
  });

  const operator = await prisma.operator.upsert({
    where: { registrationNo: 'ZM-OPS-001' },
    create: {
      name: 'Zambian Express Coaches',
      registrationNo: 'ZM-OPS-001',
      email: 'operations@zambianexpress.zm',
      phone: '0211234567',
      address: 'Plot 42, Great East Road, Lusaka',
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: adminId,
    },
    update: { status: 'APPROVED', approvedById: adminId },
  });

  const staff: Array<{ userId: string; role: OperatorStaffRole; licence?: string }> = [
    { userId: operatorUserId, role: OperatorStaffRole.OPERATOR_ADMIN },
    { userId: driverId, role: OperatorStaffRole.DRIVER, licence: 'DL-ZM-778812' },
    { userId: conductorId, role: OperatorStaffRole.CONDUCTOR },
  ];

  for (const entry of staff) {
    await prisma.operatorStaff.upsert({
      where: { operatorId_userId: { operatorId: operator.id, userId: entry.userId } },
      create: {
        operatorId: operator.id,
        userId: entry.userId,
        staffRole: entry.role,
        licenceNumber: entry.licence ?? null,
      },
      update: { staffRole: entry.role, isActive: true },
    });
  }

  // Passenger profile for the demo passenger.
  const passenger = await prisma.user.findUniqueOrThrow({ where: { email: 'passenger@zambus.zm' } });
  await prisma.passengerProfile.upsert({
    where: { userId: passenger.id },
    create: { userId: passenger.id, nationalId: '123456/78/9' },
    update: {},
  });

  const busSpecs = [
    { registrationNo: 'ZM-1234ABC', capacity: 44, manufacturer: 'Hino', model: 'RM2', year: 2021 },
    { registrationNo: 'ZM-5678DEF', capacity: 36, manufacturer: 'Marcopolo', model: 'Viaggio', year: 2019 },
  ];

  const busIds: string[] = [];
  for (const spec of busSpecs) {
    const bus = await prisma.bus.upsert({
      where: { registrationNo: spec.registrationNo },
      create: { ...spec, operatorId: operator.id, fuelType: FuelType.DIESEL, status: 'ACTIVE' },
      update: { operatorId: operator.id },
    });
    busIds.push(bus.id);

    const seats = seatLabels(spec.capacity);
    await prisma.seat.createMany({
      data: seats.map((seat) => ({
        busId: bus.id,
        seatNumber: seat.label,
        seatType: seat.type,
        row: seat.row,
        column: seat.column,
      })),
      skipDuplicates: true,
    });
  }

  const routeSpecs = [
    { origin: 'Lusaka', destination: 'Livingstone', distanceKm: 470, estimatedDurationMin: 390, fare: 32000 },
    { origin: 'Lusaka', destination: 'Ndola', distanceKm: 320, estimatedDurationMin: 270, fare: 26000 },
    { origin: 'Lusaka', destination: 'Chipata', distanceKm: 570, estimatedDurationMin: 480, fare: 38000 },
  ];

  const routeIds: string[] = [];
  for (const spec of routeSpecs) {
    const existing = await prisma.route.findFirst({
      where: { operatorId: operator.id, origin: spec.origin, destination: spec.destination },
    });
    const route = existing
      ? await prisma.route.update({
          where: { id: existing.id },
          data: { distanceKm: spec.distanceKm, estimatedDurationMin: spec.estimatedDurationMin },
        })
      : await prisma.route.create({
          data: {
            operatorId: operator.id,
            origin: spec.origin,
            destination: spec.destination,
            distanceKm: spec.distanceKm,
            estimatedDurationMin: spec.estimatedDurationMin,
          },
        });
    routeIds.push(route.id);

    await prisma.routeStop.createMany({
      data: [
        { routeId: route.id, stopName: spec.origin, sequenceNo: 1, distanceFromOriginKm: 0 },
        {
          routeId: route.id,
          stopName: spec.destination,
          sequenceNo: 2,
          distanceFromOriginKm: spec.distanceKm,
        },
      ],
      skipDuplicates: true,
    });

    const departureTimes = spec.destination === 'Livingstone' ? ['07:00', '13:00'] : ['06:30', '12:00'];
    for (const departureTime of departureTimes) {
      const existingSchedule = await prisma.schedule.findFirst({
        where: { routeId: route.id, busId: busIds[0], departureTime },
      });
      if (!existingSchedule) {
        await prisma.schedule.create({
          data: {
            routeId: route.id,
            busId: busIds[0],
            departureTime,
            daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
            baseFareNgwee: spec.fare,
          },
        });
      }
    }
  }

  await prisma.systemConfig.upsert({
    where: { key: 'booking.hold_ttl_minutes' },
    create: { key: 'booking.hold_ttl_minutes', value: 5, description: 'Minutes a seat hold stays valid' },
    update: {},
  });
  await prisma.systemConfig.upsert({
    where: { key: 'platform.support_email' },
    create: { key: 'platform.support_email', value: 'support@zambus.zm', description: 'Support contact' },
    update: {},
  });

  console.log('✓ users, operator, fleet and routes seeded');
  return { operatorId: operator.id, busIds, routeIds };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Africa/Lusaka is UTC+2 all year (no daylight saving). */
function departureUtc(dateIso: string, time: string): Date {
  return new Date(`${dateIso}T${time}:00+02:00`);
}

async function seedTrips(): Promise<void> {
  const schedules = await prisma.schedule.findMany({
    include: { route: true, bus: { include: { seats: true } } },
  });

  const today = new Date();
  let created = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(today, offset);
    const dateIso = day.toISOString().slice(0, 10);

    for (const schedule of schedules) {
      const tripId = `seed-trip-${schedule.id}-${dateIso}`;
      const existing = await prisma.trip.findUnique({ where: { id: tripId } });
      if (existing) continue;

      const departureAt = departureUtc(dateIso, schedule.departureTime);
      const arrivalAt = new Date(
        departureAt.getTime() + schedule.route.estimatedDurationMin * 60_000,
      );

      await prisma.trip.create({
        data: {
          id: tripId,
          scheduleId: schedule.id,
          routeId: schedule.routeId,
          busId: schedule.busId,
          operatorId: schedule.route.operatorId,
          departureAt,
          arrivalAt,
          fareNgwee: schedule.baseFareNgwee,
          status: TripStatus.SCHEDULED,
          availableSeatCount: schedule.bus.capacity,
          seats: {
            createMany: {
              data: schedule.bus.seats.map((seat) => ({
                seatNumber: seat.seatNumber,
                seatType: seat.seatType,
              })),
            },
          },
        },
      });

      // Assign the demo driver and conductor to every seeded trip.
      const crew = await prisma.operatorStaff.findMany({
        where: { operatorId: schedule.route.operatorId, staffRole: { in: ['DRIVER', 'CONDUCTOR'] } },
      });
      for (const member of crew) {
        await prisma.tripCrew.upsert({
          where: { tripId_userId: { tripId, userId: member.userId } },
          create: {
            tripId,
            userId: member.userId,
            crewRole: member.staffRole === 'DRIVER' ? 'DRIVER' : 'CONDUCTOR',
          },
          update: {},
        });
      }

      created += 1;
    }
  }

  console.log(`✓ ${created} trips seeded with seat inventories`);
}

async function seedEmissionFactors(): Promise<void> {
  const factors = [
    {
      fuelType: FuelType.DIESEL,
      kgCo2PerLitre: 2.68,
      source:
        'IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Vol. 2, Ch. 3, Table 3.2.1 — default CO2 emission factor for gas/diesel oil.',
      scope: 'Direct operational combustion only (tank-to-wheel, Scope 1). Excludes fuel production and upstream emissions.',
      methodologyVersion: '1.0.0',
      effectiveFrom: new Date('2024-01-01T00:00:00Z'),
      isActive: true,
    },
    {
      fuelType: FuelType.PETROL,
      kgCo2PerLitre: 2.31,
      source:
        'IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Vol. 2, Ch. 3, Table 3.2.1 — default CO2 emission factor for motor gasoline.',
      scope: 'Direct operational combustion only (tank-to-wheel, Scope 1). Excludes fuel production and upstream emissions.',
      methodologyVersion: '1.0.0',
      effectiveFrom: new Date('2024-01-01T00:00:00Z'),
      isActive: true,
    },
  ];

  for (const factor of factors) {
    await prisma.emissionFactor.upsert({
      where: { fuelType_effectiveFrom: { fuelType: factor.fuelType, effectiveFrom: factor.effectiveFrom } },
      create: factor,
      update: { kgCo2PerLitre: factor.kgCo2PerLitre, source: factor.source },
    });
  }

  console.log('✓ emission factors seeded (diesel 2.68 kg CO2/L, petrol 2.31 kg CO2/L)');
}

async function main(): Promise<void> {
  await seedRolesAndPermissions();
  await seedUsersAndOperator();
  await seedTrips();
  await seedEmissionFactors();

  console.log('\nDemo accounts (development only):');
  console.log('  admin@zambus.zm      / Admin123!');
  console.log('  operator@zambus.zm   / Operator123!');
  console.log('  driver@zambus.zm     / Driver123!');
  console.log('  conductor@zambus.zm  / Conductor123!');
  console.log('  passenger@zambus.zm  / Passenger123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
