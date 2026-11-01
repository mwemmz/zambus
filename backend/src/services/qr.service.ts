import QRCode from 'qrcode';
import { config } from '../config';

export interface QrTicketData {
  bookingId: string;
  passengerName: string;
  seatNumber: number;
  route: string;
  busReg: string;
  departureTime: string;
  boardingStatus: string;
}

export async function generateQrCodeData(ticket: QrTicketData): Promise<string> {
  return JSON.stringify(ticket);
}

export async function generateQrCodeImage(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

export function parseQrCodeData(qrData: string): QrTicketData | null {
  try {
    return JSON.parse(qrData) as QrTicketData;
  } catch {
    return null;
  }
}
