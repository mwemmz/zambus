import { SeatType } from '@prisma/client';

export interface GeneratedSeat {
  seatNumber: string;
  seatType: SeatType;
  row: number;
  column: number;
}

/**
 * Generates a 2+2 coach layout: window seats in the outer columns, aisle seats
 * inside. Used when an operator creates a bus without supplying a custom layout.
 */
export function generateSeatLayout(capacity: number): GeneratedSeat[] {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error('Bus capacity must be a positive integer');
  }

  const letters = ['A', 'B', 'C', 'D'];
  const seats: GeneratedSeat[] = [];
  const rows = Math.ceil(capacity / 4);

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= 4; column += 1) {
      if (seats.length >= capacity) {
        return seats;
      }
      seats.push({
        seatNumber: `${row}${letters[column - 1]}`,
        seatType: column === 1 || column === 4 ? SeatType.WINDOW : SeatType.AISLE,
        row,
        column,
      });
    }
  }

  return seats;
}

/** Parses "YYYY-MM-DD" into a UTC instant at the start of that Zambia day (UTC+2). */
export function zambiaDayRange(dateIso: string): { start: Date; end: Date; valid: boolean } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return { start: new Date(NaN), end: new Date(NaN), valid: false };
  }
  const start = new Date(`${dateIso}T00:00:00+02:00`);
  if (Number.isNaN(start.getTime())) {
    return { start: new Date(NaN), end: new Date(NaN), valid: false };
  }
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end, valid: true };
}
