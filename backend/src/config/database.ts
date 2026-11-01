import { Sequelize } from 'sequelize';
import pg from 'pg';
import { config } from './index';

export const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  // Required for bundled serverless runtimes (Vercel) to resolve the driver.
  dialectModule: pg,
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

/**
 * Seat uniqueness, stated as a partial index.
 *
 * A seat may only have one live booking (PENDING or CONFIRMED) per trip, but
 * REFUNDED rows are history: they must stay in the table for the audit trail
 * and must not stop the seat being sold to somebody else. A plain
 * UNIQUE("tripId", "seatNumber") cannot express that, so the index is created
 * here (idempotently) instead of in the model definition.
 */
export async function ensureSeatUniqueness(): Promise<void> {
  try {
    await sequelize.query('DROP INDEX IF EXISTS "unique_trip_seat"');
    await sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "unique_trip_seat"
         ON "bookings" ("tripId", "seatNumber")
         WHERE "paymentStatus" <> 'REFUNDED'`,
    );
  } catch (error) {
    // Never block boot on index housekeeping; booking creation still checks
    // seat availability at the application level.
    console.error('Could not reconcile the seat uniqueness index:', error);
  }
}

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}
