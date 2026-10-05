import { Router } from 'express';
import { executeQuery, getTableRowCount } from '../config/db.js';

const router = Router();

// GET all courses
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        c.course_id,
        c.course_code,
        c.course_name,
        c.credits,
        c.semester,
        c.max_marks,
        c.pass_marks,
        c.department_id,
        d.department_name
      FROM course c
      INNER JOIN department d ON c.department_id = d.department_id
      ORDER BY c.semester ASC, c.course_code ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Courses retrieved successfully', data: rows });
  } catch (err) {
    next(err);
  }
});

// POST insert course
router.post('/', async (req, res, next) => {
  try {
    const { course_code, course_name, credits, semester, max_marks, pass_marks, department_id } = req.body;

    if (!course_code || !course_code.trim()) {
      return res.status(400).json({ success: false, message: 'Course code is required.' });
    }
    if (!course_name || !course_name.trim()) {
      return res.status(400).json({ success: false, message: 'Course name is required.' });
    }
    const cr = parseInt(credits, 10);
    if (isNaN(cr) || cr <= 0) {
      return res.status(400).json({ success: false, message: 'Credits must be a positive integer.' });
    }
    const sem = parseInt(semester, 10);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, message: 'Semester must be between 1 and 8.' });
    }
    const maxM = parseFloat(max_marks || 100);
    const passM = parseFloat(pass_marks || 40);
    if (passM >= maxM) {
      return res.status(400).json({ success: false, message: 'Pass marks must be strictly less than maximum marks.' });
    }
    const deptId = parseInt(department_id, 10);
    if (isNaN(deptId) || deptId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid department selection is required.' });
    }

    const rowsBefore = await getTableRowCount('course');
    const sql = `
      INSERT INTO course (course_code, course_name, credits, semester, max_marks, pass_marks, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await executeQuery(sql, [
      course_code.trim().toUpperCase(),
      course_name.trim(),
      cr,
      sem,
      maxM,
      passM,
      deptId
    ]);
    const rowsAfter = await getTableRowCount('course');

    res.status(201).json({
      success: true,
      message: `Course "${course_name.trim()}" (${course_code.trim().toUpperCase()}) created with ID #${result.insertId}`,
      data: {
        course_id: result.insertId,
        course_code: course_code.trim().toUpperCase(),
        course_name: course_name.trim(),
        rowsBefore,
        rowsAfter
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE course
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID.' });
    }

    const rowsBefore = await getTableRowCount('course');
    const sql = 'DELETE FROM course WHERE course_id = ?';
    const result = await executeQuery(sql, [id]);
    const rowsAfter = await getTableRowCount('course');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    res.json({
      success: true,
      message: `Course #${id} deleted successfully.`,
      data: { rowsBefore, rowsAfter }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
