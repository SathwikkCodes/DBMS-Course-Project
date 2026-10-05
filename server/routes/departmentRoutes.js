import { Router } from 'express';
import { executeQuery, getTableRowCount } from '../config/db.js';

const router = Router();

// GET all departments with COUNT subqueries for total_students and total_courses
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        d.department_id, 
        d.department_name, 
        d.hod_name,
        (SELECT COUNT(*) FROM student s WHERE s.department_id = d.department_id) AS total_students,
        (SELECT COUNT(*) FROM course c WHERE c.department_id = d.department_id) AS total_courses
      FROM department d
      ORDER BY d.department_id ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Departments retrieved successfully', data: rows });
  } catch (err) {
    next(err);
  }
});

// POST insert department
router.post('/', async (req, res, next) => {
  try {
    const { department_name, hod_name } = req.body;

    if (!department_name || !department_name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const rowsBefore = await getTableRowCount('department');
    const sql = 'INSERT INTO department (department_name, hod_name) VALUES (?, ?)';
    const result = await executeQuery(sql, [
      department_name.trim(),
      hod_name && hod_name.trim() ? hod_name.trim() : null
    ]);
    const rowsAfter = await getTableRowCount('department');

    res.status(201).json({
      success: true,
      message: `Department "${department_name.trim()}" added successfully with ID #${result.insertId}`,
      data: {
        department_id: result.insertId,
        department_name: department_name.trim(),
        hod_name: hod_name && hod_name.trim() ? hod_name.trim() : null,
        rowsBefore,
        rowsAfter
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE department
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid department ID.' });
    }

    const rowsBefore = await getTableRowCount('department');
    const sql = 'DELETE FROM department WHERE department_id = ?';
    const result = await executeQuery(sql, [id]);
    const rowsAfter = await getTableRowCount('department');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Department not found or already deleted.' });
    }

    res.json({
      success: true,
      message: `Department #${id} deleted successfully.`,
      data: { rowsBefore, rowsAfter }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
