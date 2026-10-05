/**
 * Main Full-Stack Server Entry Point
 * Examination Scheduling and Result Processing System
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/server.js';
import { initializeDatabase } from './server/config/db.js';

async function start() {
  const app = createExpressApp();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Initialize Database (tries live MySQL first; falls back gracefully to schema.sql simulation)
  await initializeDatabase();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite middlewares in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built frontend dist folder
    app.use(express.static(path.resolve('.', 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve('.', 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Running on http://0.0.0.0:${PORT}`);
    console.log('Project: DBMS Examination Scheduling and Result Processing System');
    console.log('Student: Sathwik S | Roll: 25WU0102249 | Section: AIML Whales');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
