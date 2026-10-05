/**
 * Express Server Entry Point
 * Examination Scheduling and Result Processing System
 * Author: Sathwik S | Roll No: 25WU0102249 | Section: AIML Whales
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import departmentRoutes from './routes/departmentRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import facultyRoutes from './routes/facultyRoutes.js';
import hallRoutes from './routes/hallRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import dropdownRoutes from './routes/dropdownRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import explorerRoutes from './routes/explorerRoutes.js';
import proofRoutes from './routes/proofRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createExpressApp() {
  const app = express();

  // Standard middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static assets from /public folder
  const publicPath = path.resolve(__dirname, '../public');
  app.use(express.static(publicPath));

  // REST API Routes
  app.use('/api/departments', departmentRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/faculty', facultyRoutes);
  app.use('/api/halls', hallRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/results', resultRoutes);
  app.use('/api/dropdowns', dropdownRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/explorer', explorerRoutes);
  app.use('/api/proof', proofRoutes);

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      app: 'Examination Scheduling and Result Processing System',
      student: 'Sathwik S (25WU0102249)',
      time: new Date().toISOString()
    });
  });

  // Central error handling
  app.use(errorHandler);

  return app;
}

// Standalone runner (when run with `node server/server.js`)
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const app = createExpressApp();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  initializeDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('================================================================');
      console.log('DBMS Examination Scheduling and Result Processing System');
      console.log('Student: Sathwik S | Roll: 25WU0102249 | Section: AIML Whales');
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
      console.log('Static frontend served from /public');
      console.log('REST API endpoints available under /api/*');
      console.log('================================================================');
    });
  });
}
