import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { getManifest } from './boarding.service';
import { Response } from 'express';
import { config } from '../config';

export async function exportManifestPdf(tripId: string, res: Response): Promise<void> {
  const manifest = await getManifest(tripId);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=manifest-${tripId}.pdf`);

  doc.pipe(res);

  doc
    .fontSize(24)
    .font('Helvetica', 'bold')
    .text(config.app.name, { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(16)
    .font('Helvetica')
    .text('Passenger Manifest', { align: 'center' })
    .moveDown(1);

  doc
    .fontSize(12)
    .text(`Route: ${manifest.trip.origin} → ${manifest.trip.destination}`, { align: 'left' })
    .text(`Bus: ${manifest.trip.busReg} (${manifest.trip.busModel})`, { align: 'left' })
    .text(`Departure: ${new Date(manifest.trip.departureTime).toLocaleString()}`, { align: 'left' })
    .moveDown(0.5);

  doc
    .fontSize(11)
    .text(`Total Passengers: ${manifest.totals.totalPassengers}`, { align: 'left' })
    .text(`Boarded: ${manifest.totals.boarded} | Not Boarded: ${manifest.totals.notBoarded} | Dropped Off: ${manifest.totals.droppedOff}`, { align: 'left' })
    .moveDown(0.5);

  const tableTop = doc.y;
  const tableLeft = doc.x;
  const colWidths = [60, 120, 80, 100, 90];

  doc
    .font('Helvetica', 'bold')
    .fontSize(10)
    .text('Seat', tableLeft, tableTop)
    .text('Passenger Name', tableLeft + colWidths[0], tableTop)
    .text('Phone', tableLeft + colWidths[0] + colWidths[1], tableTop)
    .text('Status', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop)
    .text('Ticket ID', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop)
    .moveDown(0.3);

  doc.font('Helvetica').fontSize(10);

  manifest.passengers.forEach((p: any, index: number) => {
    const rowY = tableTop + 15 + index * 18;

    doc.text(p.seatNumber.toString(), tableLeft, rowY, { width: colWidths[0] });
    doc.text((p.passengerName || '').padEnd(25), tableLeft + colWidths[0], rowY, { width: colWidths[1] });
    doc.text((p.passengerPhone || '').padEnd(15), tableLeft + colWidths[0] + colWidths[1], rowY, { width: colWidths[2] });
    doc.text(p.boardingStatus.replace('_', ' '), tableLeft + colWidths[0] + colWidths[1] + colWidths[2], rowY, { width: colWidths[3] });

    try {
      const qrData = JSON.parse(p.qrCodeData);
      doc.text(qrData.bookingId || '', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY, { width: colWidths[4] });
    } catch {
      doc.text('', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY, { width: colWidths[4] });
    }
  });

  doc.end();
}

export async function exportManifestExcel(tripId: string, res: Response): Promise<void> {
  const manifest = await getManifest(tripId);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Passenger Manifest');

  worksheet.columns = [
    { header: 'Seat Number', key: 'seatNumber', width: 12 },
    { header: 'Passenger Name', key: 'passengerName', width: 30 },
    { header: 'Phone Number', key: 'phoneNumber', width: 18 },
    { header: 'Ticket ID', key: 'ticketId', width: 25 },
    { header: 'Boarding Status', key: 'boardingStatus', width: 18 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
  ];

  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = `${config.app.name} - Passenger Manifest`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };

  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = `Route: ${manifest.trip.origin} → ${manifest.trip.destination}`;
  worksheet.getCell('A2').font = { size: 12 };

  worksheet.mergeCells('A3:F3');
  worksheet.getCell('A3').value = `Bus: ${manifest.trip.busReg} (${manifest.trip.busModel})`;
  worksheet.getCell('A3').font = { size: 12 };

  worksheet.mergeCells('A4:F4');
  worksheet.getCell('A4').value = `Departure: ${new Date(manifest.trip.departureTime).toLocaleString()}`;
  worksheet.getCell('A4').font = { size: 12 };

  worksheet.mergeCells('A6:F6');
  worksheet.getCell('A6').value = `Total: ${manifest.totals.totalPassengers} | Boarded: ${manifest.totals.boarded} | Not Boarded: ${manifest.totals.notBoarded} | Dropped Off: ${manifest.totals.droppedOff}`;

  manifest.passengers.forEach((p: any) => {
    let ticketId = '';
    try {
      const qrData = JSON.parse(p.qrCodeData);
      ticketId = qrData.bookingId || '';
    } catch {
      ticketId = '';
    }

    worksheet.addRow({
      seatNumber: p.seatNumber,
      passengerName: p.passengerName,
      phoneNumber: p.passengerPhone,
      ticketId,
      boardingStatus: p.boardingStatus.replace('_', ' '),
      paymentStatus: p.paymentStatus,
    });
  });

  worksheet.getRow(7).font = { bold: true };
  worksheet.getRow(7).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' },
  };
  worksheet.getRow(7).font = { color: { argb: 'FFFFFFFF' } };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=manifest-${tripId}.xlsx`);

  await workbook.xlsx.write(res);
}
