import { Router } from 'express';
import { executeQuery, getTableRowCount, calculateGradeAndPoints } from '../config/db.js';

const router = Router();

// GET all results (human-readable JOIN)
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        r.result_id,
        r.student_id,
        s.roll_no,
        s.full_name AS student_name,
        s.semester,
        d.department_name,
        r.schedule_id,
        c.course_code,
        c.course_name,
        c.credits,
        c.max_marks,
        c.pass_marks,
        es.exam_type,
        es.exam_date,
        h.hall_name,
        r.marks_obtained,
        r.grade,
        r.grade_points,
        r.status
      FROM result r
      INNER JOIN student s ON r.student_id = s.student_id
      INNER JOIN department d ON s.department_id = d.department_id
      INNER JOIN exam_schedule es ON r.schedule_id = es.schedule_id
      INNER JOIN course c ON es.course_id = c.course_id
      INNER JOIN exam_hall h ON es.hall_id = h.hall_id
      ORDER BY r.result_id DESC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Examination results retrieved successfully', data: rows });
  } catch (err) {
    next(err);
  }
});

// POST insert result
router.post('/', async (req, res, next) => {
  try {
    const { student_id, schedule_id, marks_obtained, is_absent } = req.body;

    const studentId = parseInt(student_id, 10);
    const scheduleId = parseInt(schedule_id, 10);

    if (isNaN(studentId) || isNaN(scheduleId)) {
      return res.status(400).json({ success: false, message: 'Student and Exam Schedule selections are required.' });
    }

    // Lookup course max_marks and pass_marks for this schedule
    const courseLookupSql = `
      SELECT c.course_id, c.course_code, c.course_name, c.max_marks, c.pass_marks
      FROM exam_schedule es
      INNER JOIN course c ON es.course_id = c.course_id
      WHERE es.schedule_id = ?
    `;
    const { rows: courseRows } = await executeQuery(courseLookupSql, [scheduleId]);
    if (!courseRows || courseRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid exam schedule: Course information not found.' });
    }

    const courseInfo = courseRows[0];
    const maxMarks = parseFloat(courseInfo.max_marks);
    const passMarks = parseFloat(courseInfo.pass_marks);

    let marks = 0;
    const absent = is_absent === true || is_absent === 'true' || is_absent === 'on';

    if (!absent) {
      if (marks_obtained === undefined || marks_obtained === null || marks_obtained === '') {
        return res.status(400).json({ success: false, message: 'Marks obtained is required (or mark as Absent).' });
      }
      marks = parseFloat(marks_obtained);
      if (isNaN(marks) || marks < 0) {
        return res.status(400).json({ success: false, message: 'Marks obtained must be a non-negative number.' });
      }
      if (marks > maxMarks) {
        return res.status(400).json({
          success: false,
          message: `Marks obtained (${marks}) exceeds maximum marks (${maxMarks}) for course ${courseInfo.course_code}.`
        });
      }
    }

    // Server-side grade and status calculation
    const { grade, gradePoints, status } = calculateGradeAndPoints(marks, passMarks, absent);

    const rowsBefore = await getTableRowCount('result');
    const sql = `
      INSERT INTO result (student_id, schedule_id, marks_obtained, grade, grade_points, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const insertResult = await executeQuery(sql, [
      studentId,
      scheduleId,
      absent ? 0 : marks,
      grade,
      gradePoints,
      status
    ]);
    const rowsAfter = await getTableRowCount('result');

    res.status(201).json({
      success: true,
      message: `Result processed successfully! Grade: "${grade}" (${gradePoints} pts), Status: ${status}`,
      data: {
        result_id: insertResult.insertId,
        student_id: studentId,
        schedule_id: scheduleId,
        course_code: courseInfo.course_code,
        marks_obtained: absent ? 0 : marks,
        max_marks: maxMarks,
        pass_marks: passMarks,
        grade,
        grade_points: gradePoints,
        status,
        rowsBefore,
        rowsAfter
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE result
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid result ID.' });
    }

    const rowsBefore = await getTableRowCount('result');
    const sql = 'DELETE FROM result WHERE result_id = ?';
    const result = await executeQuery(sql, [id]);
    const rowsAfter = await getTableRowCount('result');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Result record not found.' });
    }

    res.json({
      success: true,
      message: `Result record #${id} deleted successfully.`,
      data: { rowsBefore, rowsAfter }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
