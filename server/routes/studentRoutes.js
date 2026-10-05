import { Router } from 'express';
import { executeQuery, getTableRowCount } from '../config/db.js';

const router = Router();

// GET all students
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        s.student_id,
        s.roll_no,
        s.full_name,
        s.email,
        s.phone,
        s.semester,
        s.department_id,
        d.department_name
      FROM student s
      INNER JOIN department d ON s.department_id = d.department_id
      ORDER BY s.semester ASC, s.roll_no ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Students retrieved successfully', data: rows });
  } catch (err) {
    next(err);
  }
});

// POST insert student
router.post('/', async (req, res, next) => {
  try {
    const { roll_no, full_name, email, phone, semester, department_id } = req.body;

    if (!roll_no || !roll_no.trim()) {
      return res.status(400).json({ success: false, message: 'Roll number is required.' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const sem = parseInt(semester, 10);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, message: 'Semester must be an integer between 1 and 8.' });
    }
    const deptId = parseInt(department_id, 10);
    if (isNaN(deptId) || deptId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid department selection is required.' });
    }

    const rowsBefore = await getTableRowCount('student');
    const sql = `
      INSERT INTO student (roll_no, full_name, email, phone, semester, department_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await executeQuery(sql, [
      roll_no.trim().toUpperCase(),
      full_name.trim(),
      email.trim().toLowerCase(),
      phone ? phone.trim() : null,
      sem,
      deptId
    ]);
    const rowsAfter = await getTableRowCount('student');

    res.status(201).json({
      success: true,
      message: `Student "${full_name.trim()}" (${roll_no.trim().toUpperCase()}) registered successfully with ID #${result.insertId}`,
      data: {
        student_id: result.insertId,
        roll_no: roll_no.trim().toUpperCase(),
        full_name: full_name.trim(),
        rowsBefore,
        rowsAfter
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE student
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    const rowsBefore = await getTableRowCount('student');
    const sql = 'DELETE FROM student WHERE student_id = ?';
    const result = await executeQuery(sql, [id]);
    const rowsAfter = await getTableRowCount('student');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    res.json({
      success: true,
      message: `Student record #${id} deleted successfully.`,
      data: { rowsBefore, rowsAfter }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
