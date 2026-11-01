import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { sequelize } from './config/database';
import { initModels } from './models';
import routes from './routes';
import { errorHandler } from './middleware';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: config.app.name,
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Initialize models
    await initModels();
    console.log('Models initialized');

    // Auto-sync database tables (development only)
    await sequelize.sync({ alter: true });
    console.log('Database tables synchronized');

    // Start server
    app.listen(config.port, () => {
      console.log(`${config.app.name} server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`API available at: http://localhost:${config.port}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { app };

// Start server if run directly
if (require.main === module) {
  startServer();
}
