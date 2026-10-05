import { Router } from 'express';
import { executeQuery, getTableRowCount } from '../config/db.js';

const router = Router();

// GET all exam halls
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        h.hall_id,
        h.hall_name,
        h.building,
        h.capacity,
        COUNT(es.schedule_id) AS scheduled_exams_count
      FROM exam_hall h
      LEFT JOIN exam_schedule es ON h.hall_id = es.hall_id
      GROUP BY h.hall_id, h.hall_name, h.building, h.capacity
      ORDER BY h.hall_name ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Exam halls retrieved successfully', data: rows });
  } catch (err) {
    next(err);
  }
});

// POST insert exam hall
router.post('/', async (req, res, next) => {
  try {
    const { hall_name, building, capacity } = req.body;

    if (!hall_name || !hall_name.trim()) {
      return res.status(400).json({ success: false, message: 'Hall name is required.' });
    }
    if (!building || !building.trim()) {
      return res.status(400).json({ success: false, message: 'Building location is required.' });
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap <= 0) {
      return res.status(400).json({ success: false, message: 'Capacity must be a positive integer.' });
    }

    const rowsBefore = await getTableRowCount('exam_hall');
    const sql = 'INSERT INTO exam_hall (hall_name, building, capacity) VALUES (?, ?, ?)';
    const result = await executeQuery(sql, [hall_name.trim(), building.trim(), cap]);
    const rowsAfter = await getTableRowCount('exam_hall');

    res.status(201).json({
      success: true,
      message: `Exam Hall "${hall_name.trim()}" added with ID #${result.insertId}`,
      data: {
        hall_id: result.insertId,
        hall_name: hall_name.trim(),
        rowsBefore,
        rowsAfter
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE exam hall
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid hall ID.' });
    }

    const rowsBefore = await getTableRowCount('exam_hall');
    const sql = 'DELETE FROM exam_hall WHERE hall_id = ?';
    const result = await executeQuery(sql, [id]);
    const rowsAfter = await getTableRowCount('exam_hall');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Exam hall not found.' });
    }

    res.json({
      success: true,
      message: `Exam hall #${id} deleted successfully.`,
      data: { rowsBefore, rowsAfter }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
