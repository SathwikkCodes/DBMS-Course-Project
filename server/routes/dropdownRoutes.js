import { Router } from 'express';
import { executeQuery } from '../config/db.js';

const router = Router();

// GET dropdown options for a table
router.get('/:table', async (req, res, next) => {
  try {
    const { table } = req.params;

    let sql = '';
    switch (table) {
      case 'departments':
        sql = 'SELECT department_id AS id, department_name AS name FROM department ORDER BY department_name ASC';
        break;
      case 'faculty':
        sql = `
          SELECT 
            f.faculty_id AS id, 
            CONCAT(f.faculty_name, ' (', f.designation, ' - ', d.department_name, ')') AS name 
          FROM faculty f
          INNER JOIN department d ON f.department_id = d.department_id
          ORDER BY f.faculty_name ASC
        `;
        break;
      case 'halls':
        sql = `
          SELECT 
            hall_id AS id, 
            CONCAT(hall_name, ' (', building, ' - Cap: ', capacity, ')') AS name,
            capacity
          FROM exam_hall 
          ORDER BY hall_name ASC
        `;
        break;
      case 'courses':
        sql = `
          SELECT 
            c.course_id AS id, 
            CONCAT(c.course_code, ' - ', c.course_name, ' (Sem ', c.semester, ', Credits: ', c.credits, ')') AS name,
            c.max_marks,
            c.pass_marks
          FROM course c
          ORDER BY c.semester ASC, c.course_code ASC
        `;
        break;
      case 'students':
        sql = `
          SELECT 
            s.student_id AS id, 
            CONCAT(s.roll_no, ' - ', s.full_name, ' (Sem ', s.semester, ')') AS name,
            s.roll_no,
            s.full_name
          FROM student s 
          ORDER BY s.semester ASC, s.roll_no ASC
        `;
        break;
      case 'schedules':
        sql = `
          SELECT 
            es.schedule_id AS id,
            CONCAT(c.course_code, ': ', es.exam_type, ' on ', es.exam_date, ' (', SUBSTRING(es.start_time, 1, 5), ' - ', SUBSTRING(es.end_time, 1, 5), ') @ ', h.hall_name) AS name,
            es.course_id,
            c.course_code,
            c.max_marks,
            c.pass_marks
          FROM exam_schedule es
          INNER JOIN course c ON es.course_id = c.course_id
          INNER JOIN exam_hall h ON es.hall_id = h.hall_id
          ORDER BY es.exam_date ASC, es.start_time ASC
        `;
        break;
      default:
        return res.status(400).json({ success: false, message: `No dropdown mapping for "${table}".` });
    }

    const { rows } = await executeQuery(sql);
    res.json({ success: true, message: `Dropdown options for ${table}`, data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
