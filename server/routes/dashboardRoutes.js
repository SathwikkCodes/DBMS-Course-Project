import { Router } from 'express';
import { executeQuery, getTableRowCount, getDbStatus } from '../config/db.js';

const router = Router();

// GET dashboard statistics
router.get('/', async (req, res, next) => {
  try {
    const [
      totalDepartments,
      totalStudents,
      totalCourses,
      totalFaculty,
      totalHalls,
      totalSchedules,
      totalResults
    ] = await Promise.all([
      getTableRowCount('department'),
      getTableRowCount('student'),
      getTableRowCount('course'),
      getTableRowCount('faculty'),
      getTableRowCount('exam_hall'),
      getTableRowCount('exam_schedule'),
      getTableRowCount('result')
    ]);

    // SQL Aggregates for evaluation & performance metrics
    const statsSql = `
      SELECT 
        COUNT(result_id) AS evaluated_results,
        ROUND(AVG(marks_obtained), 2) AS average_marks,
        MAX(marks_obtained) AS highest_marks,
        MIN(marks_obtained) AS lowest_marks,
        SUM(CASE WHEN status = 'Pass' THEN 1 ELSE 0 END) AS total_passed,
        SUM(CASE WHEN status = 'Fail' THEN 1 ELSE 0 END) AS total_failed,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS total_absent
      FROM result
    `;
    const { rows: statsRows } = await executeQuery(statsSql);
    const stats = statsRows[0] || {};

    const evaluatedCount = parseInt(stats.evaluated_results || 0, 10);
    const passedCount = parseInt(stats.total_passed || 0, 10);
    const overallPassPercentage = evaluatedCount > 0 
      ? ((passedCount / evaluatedCount) * 100).toFixed(1)
      : '0.0';

    // Upcoming exams query
    const upcomingSql = `
      SELECT 
        es.schedule_id,
        es.exam_date,
        es.start_time,
        es.end_time,
        es.exam_type,
        c.course_code,
        c.course_name,
        h.hall_name,
        f.faculty_name AS invigilator_name
      FROM exam_schedule es
      INNER JOIN course c ON es.course_id = c.course_id
      INNER JOIN exam_hall h ON es.hall_id = h.hall_id
      INNER JOIN faculty f ON es.invigilator_id = f.faculty_id
      ORDER BY es.exam_date ASC, es.start_time ASC
      LIMIT 5
    `;
    const { rows: upcomingExams } = await executeQuery(upcomingSql);

    res.json({
      success: true,
      message: 'Dashboard metrics calculated successfully',
      data: {
        dbStatus: getDbStatus(),
        counts: {
          departments: totalDepartments,
          students: totalStudents,
          courses: totalCourses,
          faculty: totalFaculty,
          halls: totalHalls,
          schedules: totalSchedules,
          results: totalResults
        },
        aggregates: {
          totalExamsScheduled: totalSchedules,
          evaluatedResults: evaluatedCount,
          averageMarks: stats.average_marks || 0,
          highestMarks: stats.highest_marks || 0,
          lowestMarks: stats.lowest_marks || 0,
          totalPassed: passedCount,
          totalFailed: parseInt(stats.total_failed || 0, 10),
          totalAbsent: parseInt(stats.total_absent || 0, 10),
          overallPassPercentage
        },
        upcomingExams
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
