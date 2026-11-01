import { generateQrCodeData, parseQrCodeData } from '../src/services/qr.service';

describe('QR Service', () => {
  describe('generateQrCodeData', () => {
    it('should generate valid QR code data', async () => {
      const qrData = await generateQrCodeData({
        bookingId: 'booking-123',
        passengerName: 'John Doe',
        seatNumber: 12,
        route: 'Lusaka - Livingstone',
        busReg: 'ZB-BUS-001',
        departureTime: '2026-09-15T08:00:00.000Z',
        boardingStatus: 'NOT_BOARDED',
      });

      expect(qrData).toBeDefined();
      expect(typeof qrData).toBe('string');
      expect(qrData.length).toBeGreaterThan(0);
    });

    it('should generate QR data containing booking info', async () => {
      const qrData = await generateQrCodeData({
        bookingId: 'booking-456',
        passengerName: 'Jane Smith',
        seatNumber: 5,
        route: 'Lusaka - Ndola',
        busReg: 'ZB-BUS-002',
        departureTime: '2026-09-16T10:00:00.000Z',
        boardingStatus: 'NOT_BOARDED',
      });

      // The generated data should be parseable
      const parsed = parseQrCodeData(qrData);
      expect(parsed).toBeDefined();
      expect(parsed?.bookingId).toBe('booking-456');
      expect(parsed?.passengerName).toBe('Jane Smith');
      expect(parsed?.seatNumber).toBe(5);
    });
  });

  describe('parseQrCodeData', () => {
    it('should parse valid QR code data', async () => {
      const originalData = {
        bookingId: 'booking-789',
        passengerName: 'Bob Wilson',
        seatNumber: 20,
        route: 'Lusaka - Chipata',
        busReg: 'ZB-BUS-003',
        departureTime: '2026-09-17T12:00:00.000Z',
        boardingStatus: 'NOT_BOARDED',
      };

      const qrData = await generateQrCodeData(originalData);
      const parsed = parseQrCodeData(qrData);

      expect(parsed).toBeDefined();
      expect(parsed?.bookingId).toBe('booking-789');
      expect(parsed?.passengerName).toBe('Bob Wilson');
      expect(parsed?.seatNumber).toBe(20);
      expect(parsed?.route).toBe('Lusaka - Chipata');
      expect(parsed?.busReg).toBe('ZB-BUS-003');
      expect(parsed?.boardingStatus).toBe('NOT_BOARDED');
    });

    it('should return null for invalid QR data', () => {
      const parsed = parseQrCodeData('invalid-qr-data');
      expect(parsed).toBeNull();
    });

    it('should return null for empty string', () => {
      const parsed = parseQrCodeData('');
      expect(parsed).toBeNull();
    });

    it('should handle QR data with boarded status', async () => {
      const qrData = await generateQrCodeData({
        bookingId: 'booking-999',
        passengerName: 'Alice Brown',
        seatNumber: 3,
        route: 'Lusaka - Livingstone',
        busReg: 'ZB-BUS-001',
        departureTime: '2026-09-15T08:00:00.000Z',
        boardingStatus: 'BOARDED',
      });

      const parsed = parseQrCodeData(qrData);
      expect(parsed?.boardingStatus).toBe('BOARDED');
    });
  });

  describe('QR round-trip', () => {
    it('should generate and parse QR data consistently', async () => {
      const testData = {
        bookingId: 'rt-test-001',
        passengerName: 'Round Trip',
        seatNumber: 15,
        route: 'Lusaka - Kabwe',
        busReg: 'ZB-BUS-002',
        departureTime: new Date().toISOString(),
        boardingStatus: 'NOT_BOARDED' as const,
      };

      const qrData = await generateQrCodeData(testData);
      const parsed = parseQrCodeData(qrData);

      expect(parsed).toEqual(
        expect.objectContaining({
          bookingId: testData.bookingId,
          passengerName: testData.passengerName,
          seatNumber: testData.seatNumber,
          route: testData.route,
          busReg: testData.busReg,
          boardingStatus: testData.boardingStatus,
        })
      );
    });
  });
});
