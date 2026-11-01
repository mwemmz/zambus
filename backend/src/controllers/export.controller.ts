import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { exportManifestPdf, exportManifestExcel } from '../services/export.service';

export const exportController = {
  async downloadPdf(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { tripId } = req.params;

      await exportManifestPdf(tripId, res);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  },

  async downloadExcel(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { tripId } = req.params;

      await exportManifestExcel(tripId, res);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  },
};
