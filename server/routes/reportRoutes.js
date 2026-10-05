import { Router } from 'express';
import { executeQuery } from '../config/db.js';

const router = Router();

// 1. REPORT: Exam Timetable (all dates or filtered by date)
router.get('/timetable', async (req, res, next) => {
  try {
    const { date } = req.query;
    let sql = `
      SELECT 
        es.schedule_id,
        es.exam_date,
        es.start_time,
        es.end_time,
        es.exam_type,
        c.course_code,
        c.course_name,
        c.credits,
        c.semester,
        d.department_name,
        h.hall_name,
        h.building,
        h.capacity,
        f.faculty_name AS invigilator_name,
        es.academic_year
      FROM exam_schedule es
      INNER JOIN course c ON es.course_id = c.course_id
      INNER JOIN department d ON c.department_id = d.department_id
      INNER JOIN exam_hall h ON es.hall_id = h.hall_id
      INNER JOIN faculty f ON es.invigilator_id = f.faculty_id
    `;
    const params = [];
    if (date) {
      sql += ' WHERE es.exam_date = ?';
      params.push(date);
    }
    sql += ' ORDER BY es.exam_date ASC, es.start_time ASC';

    const { rows } = await executeQuery(sql, params);
    res.json({
      success: true,
      message: 'Exam timetable report generated',
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

// 2. REPORT: Student-wise Result Card with SGPA
router.get('/student-card', async (req, res, next) => {
  try {
    const { student_id } = req.query;

    if (!student_id) {
      // Return SGPA summary for all students
      const summarySql = `
        SELECT 
          s.student_id,
          s.roll_no,
          s.full_name,
          s.semester,
          d.department_name,
          COUNT(r.result_id) AS total_subjects,
          SUM(c.credits) AS total_credits_registered,
          SUM(CASE WHEN r.status = 'Pass' THEN c.credits ELSE 0 END) AS credits_earned,
          SUM(c.credits * r.grade_points) AS total_weighted_points,
          ROUND(SUM(c.credits * r.grade_points) / SUM(c.credits), 2) AS sgpa
        FROM student s
        INNER JOIN department d ON s.department_id = d.department_id
        INNER JOIN result r ON s.student_id = r.student_id
        INNER JOIN exam_schedule es ON r.schedule_id = es.schedule_id
        INNER JOIN course c ON es.course_id = c.course_id
        GROUP BY s.student_id, s.roll_no, s.full_name, s.semester, d.department_name
        ORDER BY sgpa DESC, s.roll_no ASC
      `;
      const { rows } = await executeQuery(summarySql);
      return res.json({ success: true, message: 'All students SGPA report', data: rows });
    }

    // Detailed report for a specific student
    const studentId = parseInt(student_id, 10);
    const detailsSql = `
      SELECT 
        s.student_id,
        s.roll_no,
        s.full_name,
        s.email,
        s.semester,
        d.department_name,
        c.course_code,
        c.course_name,
        c.credits,
        c.max_marks,
        c.pass_marks,
        es.exam_type,
        es.exam_date,
        r.marks_obtained,
        r.grade,
        r.grade_points,
        r.status
      FROM student s
      INNER JOIN department d ON s.department_id = d.department_id
      INNER JOIN result r ON s.student_id = r.student_id
      INNER JOIN exam_schedule es ON r.schedule_id = es.schedule_id
      INNER JOIN course c ON es.course_id = c.course_id
      WHERE s.student_id = ?
      ORDER BY c.course_code ASC
    `;
    const { rows } = await executeQuery(detailsSql, [studentId]);

    if (!rows || rows.length === 0) {
      return res.json({
        success: true,
        message: 'No results found for this student',
        data: { student: null, courses: [], summary: null }
      });
    }

    const first = rows[0];
    const totalCredits = rows.reduce((sum, r) => sum + r.credits, 0);
    const creditsEarned = rows.reduce((sum, r) => sum + (r.status === 'Pass' ? r.credits : 0), 0);
    const totalWeightedPoints = rows.reduce((sum, r) => sum + (r.credits * r.grade_points), 0);
    const sgpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : '0.00';

    res.json({
      success: true,
      message: `Report card for ${first.full_name} (${first.roll_no})`,
      data: {
        student: {
          student_id: first.student_id,
          roll_no: first.roll_no,
          full_name: first.full_name,
          email: first.email,
          semester: first.semester,
          department_name: first.department_name
        },
        courses: rows,
        summary: {
          totalCredits,
          creditsEarned,
          totalWeightedPoints,
          sgpa
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// 3. REPORT: Course-wise Pass Percentage
router.get('/pass-percentage', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        c.course_id,
        c.course_code,
        c.course_name,
        c.credits,
        c.semester,
        d.department_name,
        COUNT(r.result_id) AS total_students_evaluated,
        SUM(CASE WHEN r.status = 'Pass' THEN 1 ELSE 0 END) AS total_passed,
        SUM(CASE WHEN r.status = 'Fail' THEN 1 ELSE 0 END) AS total_failed,
        SUM(CASE WHEN r.status = 'Absent' THEN 1 ELSE 0 END) AS total_absent,
        ROUND((SUM(CASE WHEN r.status = 'Pass' THEN 1 ELSE 0 END) * 100.0) / COUNT(r.result_id), 2) AS pass_percentage,
        ROUND(AVG(r.marks_obtained), 2) AS average_marks
      FROM course c
      INNER JOIN department d ON c.department_id = d.department_id
      INNER JOIN exam_schedule es ON c.course_id = es.course_id
      INNER JOIN result r ON es.schedule_id = r.schedule_id
      GROUP BY c.course_id, c.course_code, c.course_name, c.credits, c.semester, d.department_name
      ORDER BY pass_percentage ASC, c.course_code ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Course-wise pass percentage report', data: rows });
  } catch (err) {
    next(err);
  }
});

// 4. REPORT: Topper per Course
router.get('/toppers', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        c.course_code,
        c.course_name,
        s.roll_no AS topper_roll_no,
        s.full_name AS topper_name,
        d.department_name,
        r.marks_obtained AS topper_marks,
        c.max_marks,
        r.grade
      FROM result r
      INNER JOIN student s ON r.student_id = s.student_id
      INNER JOIN department d ON s.department_id = d.department_id
      INNER JOIN exam_schedule es ON r.schedule_id = es.schedule_id
      INNER JOIN course c ON es.course_id = c.course_id
      WHERE r.marks_obtained = (
        SELECT MAX(r2.marks_obtained)
        FROM result r2
        INNER JOIN exam_schedule es2 ON r2.schedule_id = es2.schedule_id
        WHERE es2.course_id = c.course_id
      )
      ORDER BY c.course_code ASC
    `;
    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: 'Course toppers report', data: rows });
  } catch (err) {
    next(err);
  }
});

// 5. REPORT: Hall Utilisation & Vacant Halls
router.get('/hall-utilisation', async (req, res, next) => {
  try {
    const targetDate = req.query.date || '2026-10-12';
    const sql = `
      SELECT 
        h.hall_id,
        h.hall_name,
        h.building,
        h.capacity,
        COUNT(es.schedule_id) AS booked_exams_count,
        CASE 
          WHEN COUNT(es.schedule_id) > 0 THEN 'Occupied' 
          ELSE 'Vacant / Available' 
        END AS status,
        COALESCE(
          GROUP_CONCAT(CONCAT(c.course_code, ' (', SUBSTRING(es.start_time, 1, 5), ' - ', SUBSTRING(es.end_time, 1, 5), ')') SEPARATOR ', '), 
          'None'
        ) AS scheduled_exams
      FROM exam_hall h
      LEFT JOIN exam_schedule es 
        ON h.hall_id = es.hall_id AND es.exam_date = ?
      LEFT JOIN course c ON es.course_id = c.course_id
      GROUP BY h.hall_id, h.hall_name, h.building, h.capacity
      ORDER BY h.capacity DESC
    `;
    const { rows } = await executeQuery(sql, [targetDate]);
    res.json({
      success: true,
      message: `Hall utilisation report for ${targetDate}`,
      targetDate,
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

// 6. REPORT: Presentation-II Query
router.get('/presentation-ii', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        s.roll_no,
        s.full_name AS student_name,
        d.department_name,
        COUNT(CASE WHEN r.grade = 'O' THEN 1 END) AS total_o_grades,
        ROUND(AVG(r.marks_obtained), 2) AS overall_avg_marks
      FROM student s
      INNER JOIN department d ON s.department_id = d.department_id
      INNER JOIN result r ON s.student_id = r.student_id
      INNER JOIN exam_schedule es ON r.schedule_id = es.schedule_id
      WHERE es.academic_year = '2026-2027'
      GROUP BY s.student_id, s.roll_no, s.full_name, d.department_name
      HAVING total_o_grades > 1
      ORDER BY total_o_grades DESC, overall_avg_marks DESC
    `;
    const { rows } = await executeQuery(sql);
    res.json({
      success: true,
      message: 'Presentation-II query executed successfully',
      question: "Retrieve student name, roll number, department name, total number of 'O' grades achieved, and overall average marks for students who secured grade 'O' in more than 1 exam in AY 2026-2027.",
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

export default router;
