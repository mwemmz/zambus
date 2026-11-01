import { Op } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Seat Lock Expiration Service
 *
 * PENDING bookings lock a seat for a configurable duration (default: 10 minutes).
 * This service releases seats whose PENDING bookings have exceeded the TTL,
 * preventing indefinite seat locks when passengers abandon the checkout flow.
 *
 * The check runs on-demand (called before seat availability queries) and
 * optionally on a timer for proactive cleanup.
 */

const DEFAULT_LOCK_MINUTES = 10;

/**
 * Release PENDING bookings that have exceeded the seat lock duration.
 * Returns the number of bookings released.
 */
export async function releaseExpiredSeatLocks(): Promise<number> {
  const { Booking, CommissionSettings } = await import('../models');

  // Read configured lock duration (fallback to default)
  let lockMinutes = DEFAULT_LOCK_MINUTES;
  try {
    const settings = await CommissionSettings.findOne();
    if (settings && settings.seatLockDurationMinutes) {
      lockMinutes = settings.seatLockDurationMinutes;
    }
  } catch {
    // Settings table may not exist yet — use default
  }

  const cutoff = new Date(Date.now() - lockMinutes * 60 * 1000);

  const expired = await Booking.findAll({
    where: {
      paymentStatus: 'PENDING',
      createdAt: { [Op.lt]: cutoff },
    },
  });

  if (expired.length === 0) return 0;

  // Delete expired PENDING bookings to free seats
  const deleted = await Booking.destroy({
    where: {
      paymentStatus: 'PENDING',
      createdAt: { [Op.lt]: cutoff },
    },
  });

  console.log(`[SeatLock] Released ${deleted} expired PENDING bookings (lock TTL: ${lockMinutes}m)`);
  return deleted;
}

/**
 * Get the current seat lock duration in minutes.
 */
export async function getSeatLockDuration(): Promise<number> {
  const { CommissionSettings } = await import('../models');
  try {
    const settings = await CommissionSettings.findOne();
    if (settings && settings.seatLockDurationMinutes) {
      return settings.seatLockDurationMinutes;
    }
  } catch {
    // fallback
  }
  return DEFAULT_LOCK_MINUTES;
}
