import { Router } from 'express';
import { getLastExecutedQuery, getDbStatus } from '../config/db.js';

const router = Router();

// GET last executed query and DB status
router.get('/last-query', (req, res) => {
  const queryInfo = getLastExecutedQuery();
  const dbStatus = getDbStatus();
  res.json({
    success: true,
    message: 'Live database proof metadata',
    data: {
      query: queryInfo,
      dbStatus
    }
  });
});

export default router;
