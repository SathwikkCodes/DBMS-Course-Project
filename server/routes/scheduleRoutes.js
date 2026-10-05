import { Router } from 'express';
import { executeQuery, getTableRowCount } from '../config/db.js';

const router = Router();

// GET all exam schedules (human-readable JOIN)
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        es.schedule_id,
        es.course_id,
        c.course_code,
        c.course_name,
        c.semester,
        c.credits,
        es.hall_id,
        h.hall_name,
        h.building,
        h.capacity,
        es.invigilator_id,
        f.faculty_name AS invigilator_name,
        es.exam_type,
        es.exam_date,
        es.start_time,
        es.end_time,
        es.academic_year,
        COUNT(r.result_id) AS results_count
      FROM exam_schedule es
      INNER JOIN course c ON es.course_id = c.course_id
      INNER JOIN exam_hall h ON es.hall_id = h.hall_id
      INNER JOIN faculty f ON es.invigilator_id = f.faculty_id
      LEFT JOIN result r ON es.schedule_id = r.schedule_id
      GROUP BY 
        es.schedule_id, es.course_id, c.course_code, c.course_name, c.semester, c.credits,
        es.hall_id, h.hall_name, h.building, h.capacity,
        es.invigilator_id, f.faculty_name, es.exam_type, es.exam_date,
        es.start_time, es.end_time, es.academic_year
      ORDER BY es.exam_date ASC, es.start_time ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Exam schedules retrieved successfully', data: rows });
  } catch (err) {
    next(err);
  }
});

// POST insert exam schedule
router.post('/', async (req, res, next) => {
  try {
    const {
      course_id,
      hall_id,
      invigilator_id,
      exam_type,
      exam_date,
      start_time,
      end_time,
      academic_year
    } = req.body;

    const courseId = parseInt(course_id, 10);
    const hallId = parseInt(hall_id, 10);
    const invigilatorId = parseInt(invigilator_id, 10);

    if (isNaN(courseId) || isNaN(hallId) || isNaN(invigilatorId)) {
      return res.status(400).json({ success: false, message: 'Course, Hall, and Invigilator must be selected.' });
    }

    if (!['Mid-Term', 'End-Term', 'Supplementary'].includes(exam_type)) {
      return res.status(400).json({ success: false, message: 'Exam type must be Mid-Term, End-Term, or Supplementary.' });
    }

    if (!exam_date || !/^\d{4}-\d{2}-\d{2}$/.test(exam_date)) {
      return res.status(400).json({ success: false, message: 'Exam date must be in YYYY-MM-DD format.' });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Start time and End time are required.' });
    }

    // Validate end_time > start_time
    const normalizedStart = start_time.length === 5 ? `${start_time}:00` : start_time;
    const normalizedEnd = end_time.length === 5 ? `${end_time}:00` : end_time;

    if (normalizedEnd <= normalizedStart) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule timing: Exam end time must be strictly after the start time.'
      });
    }

    const year = (academic_year && academic_year.trim()) ? academic_year.trim() : '2026-2027';

    // Check for hall slot clash
    const clashSql = `
      SELECT schedule_id, exam_date, start_time, end_time, hall_id 
      FROM exam_schedule 
      WHERE hall_id = ? AND exam_date = ? 
        AND (? < end_time AND ? > start_time)
    `;
    const { rows: clashes } = await executeQuery(clashSql, [hallId, exam_date, normalizedStart, normalizedEnd]);
    if (clashes && clashes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Hall conflict: Exam Hall #${hallId} is already booked on ${exam_date} during overlapping time slot.`
      });
    }

    const rowsBefore = await getTableRowCount('exam_schedule');
    const sql = `
      INSERT INTO exam_schedule (
        course_id, hall_id, invigilator_id, exam_type, exam_date, start_time, end_time, academic_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await executeQuery(sql, [
      courseId,
      hallId,
      invigilatorId,
      exam_type,
      exam_date,
      normalizedStart,
      normalizedEnd,
      year
    ]);
    const rowsAfter = await getTableRowCount('exam_schedule');

    res.status(201).json({
      success: true,
      message: `Exam schedule booked successfully with ID #${result.insertId} on ${exam_date} (${normalizedStart.slice(0, 5)} - ${normalizedEnd.slice(0, 5)})`,
      data: {
        schedule_id: result.insertId,
        exam_date,
        start_time: normalizedStart,
        end_time: normalizedEnd,
        rowsBefore,
        rowsAfter
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE exam schedule
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid schedule ID.' });
    }

    const rowsBefore = await getTableRowCount('exam_schedule');
    const sql = 'DELETE FROM exam_schedule WHERE schedule_id = ?';
    const result = await executeQuery(sql, [id]);
    const rowsAfter = await getTableRowCount('exam_schedule');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found.' });
    }

    res.json({
      success: true,
      message: `Exam schedule #${id} deleted successfully.`,
      data: { rowsBefore, rowsAfter }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
