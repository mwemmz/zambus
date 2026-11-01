import { getSeatLockDuration } from '../src/services/seat-lock.service';

// Mock the database
jest.mock('../src/models', () => ({
  CommissionSettings: {
    findOne: jest.fn(),
  },
}));

describe('Seat Lock Service', () => {
  describe('getSeatLockDuration', () => {
    it('should return default duration when no settings exist', async () => {
      const { CommissionSettings } = require('../src/models');
      CommissionSettings.findOne.mockResolvedValue(null);

      const duration = await getSeatLockDuration();
      expect(duration).toBe(10); // default 10 minutes
    });

    it('should return configured duration from settings', async () => {
      const { CommissionSettings } = require('../src/models');
      CommissionSettings.findOne.mockResolvedValue({
        seatLockDurationMinutes: 15,
      });

      const duration = await getSeatLockDuration();
      expect(duration).toBe(15);
    });

    it('should return default when settings table throws', async () => {
      const { CommissionSettings } = require('../src/models');
      CommissionSettings.findOne.mockRejectedValue(new Error('Table not found'));

      const duration = await getSeatLockDuration();
      expect(duration).toBe(10);
    });
  });
});
