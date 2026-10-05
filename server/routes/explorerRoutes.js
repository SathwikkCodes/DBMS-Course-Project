import { Router } from 'express';
import { executeQuery, WHITELISTED_TABLES, getTableRowCount } from '../config/db.js';

const router = Router();

// GET whitelisted table list
router.get('/tables', (req, res) => {
  res.json({
    success: true,
    message: 'Whitelisted database tables and views',
    data: WHITELISTED_TABLES
  });
});

// GET raw records from a whitelisted table
router.get('/:table', async (req, res, next) => {
  try {
    const { table } = req.params;

    if (!WHITELISTED_TABLES.includes(table)) {
      return res.status(403).json({
        success: false,
        message: `Security violation: Table "${table}" is not whitelisted for explorer queries. Only permitted DBMS schema tables may be inspected.`
      });
    }

    // Execute parameterized SELECT * FROM whitelisted table name
    const sql = `SELECT * FROM \`${table}\``;
    const totalRows = await getTableRowCount(table);
    const { rows } = await executeQuery(sql);

    res.json({
      success: true,
      message: `Table "${table}" retrieved (${rows.length} rows)`,
      data: {
        table,
        totalRows,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        rows
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
