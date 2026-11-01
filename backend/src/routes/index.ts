import { Router } from 'express';
import authRoutes from './auth.routes';
import routeRoutes from './route.routes';
import busRoutes from './bus.routes';
import tripRoutes from './trip.routes';
import bookingRoutes from './booking.routes';
import boardingRoutes from './boarding.routes';
import emergencyRoutes from './emergency.routes';
import adminRoutes from './admin.routes';
import exportRoutes from './export.routes';
import operatorRoutes from './operator.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/operators', operatorRoutes);
router.use('/routes', routeRoutes);
router.use('/buses', busRoutes);
router.use('/trips', tripRoutes);
router.use('/bookings', bookingRoutes);
router.use('/boarding', boardingRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/admin', adminRoutes);
router.use('/exports', exportRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
