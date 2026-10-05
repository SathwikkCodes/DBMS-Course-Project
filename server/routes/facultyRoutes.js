import { Router } from 'express';
import { executeQuery, getTableRowCount } from '../config/db.js';

const router = Router();

// GET all faculty
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        f.faculty_id,
        f.faculty_name,
        f.email,
        f.designation,
        f.department_id,
        d.department_name,
        COUNT(es.schedule_id) AS invigilation_count
      FROM faculty f
      INNER JOIN department d ON f.department_id = d.department_id
      LEFT JOIN exam_schedule es ON f.faculty_id = es.invigilator_id
      GROUP BY f.faculty_id, f.faculty_name, f.email, f.designation, f.department_id, d.department_name
      ORDER BY f.faculty_id ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Faculty members retrieved successfully', data: rows });
  } catch (err) {
    next(err);
  }
});

// POST insert faculty
router.post('/', async (req, res, next) => {
  try {
    const { faculty_name, email, designation, department_id } = req.body;

    if (!faculty_name || !faculty_name.trim()) {
      return res.status(400).json({ success: false, message: 'Faculty name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    if (!designation || !designation.trim()) {
      return res.status(400).json({ success: false, message: 'Designation is required.' });
    }
    const deptId = parseInt(department_id, 10);
    if (isNaN(deptId) || deptId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid department selection is required.' });
    }

    const rowsBefore = await getTableRowCount('faculty');
    const sql = `
      INSERT INTO faculty (faculty_name, email, designation, department_id)
      VALUES (?, ?, ?, ?)
    `;
    const result = await executeQuery(sql, [
      faculty_name.trim(),
      email.trim().toLowerCase(),
      designation.trim(),
      deptId
    ]);
    const rowsAfter = await getTableRowCount('faculty');

    res.status(201).json({
      success: true,
      message: `Faculty member "${faculty_name.trim()}" registered with ID #${result.insertId}`,
      data: {
        faculty_id: result.insertId,
        faculty_name: faculty_name.trim(),
        rowsBefore,
        rowsAfter
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE faculty
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid faculty ID.' });
    }

    const rowsBefore = await getTableRowCount('faculty');
    const sql = 'DELETE FROM faculty WHERE faculty_id = ?';
    const result = await executeQuery(sql, [id]);
    const rowsAfter = await getTableRowCount('faculty');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Faculty record not found.' });
    }

    res.json({
      success: true,
      message: `Faculty record #${id} deleted successfully.`,
      data: { rowsBefore, rowsAfter }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
