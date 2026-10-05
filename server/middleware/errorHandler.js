/**
 * Centralized Error Handling Middleware
 * Maps MySQL error numbers and custom business errors to user-friendly messages.
 */

export function errorHandler(err, req, res, next) {
  console.error('[Error Caught]', err);

  let statusCode = 500;
  let userMessage = 'An unexpected server error occurred. Please try again.';

  // MySQL Error 1451: Cannot delete parent row (foreign key constraint fails)
  if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400;
    const msg = err.message || '';
    if (msg.includes('fk_student_dept')) {
      userMessage = 'Cannot delete department: Students are currently enrolled in this department.';
    } else if (msg.includes('fk_course_dept')) {
      userMessage = 'Cannot delete department: Courses are currently assigned to this department.';
    } else if (msg.includes('fk_faculty_dept')) {
      userMessage = 'Cannot delete department: Faculty members belong to this department.';
    } else if (msg.includes('fk_sched_course')) {
      userMessage = 'Cannot delete course: It is scheduled in one or more examinations.';
    } else if (msg.includes('fk_sched_hall')) {
      userMessage = 'Cannot delete exam hall: Examinations are already scheduled in this hall.';
    } else if (msg.includes('fk_sched_faculty')) {
      userMessage = 'Cannot delete faculty: This faculty member is assigned as an exam invigilator.';
    } else if (msg.includes('fk_result_student')) {
      userMessage = 'Cannot delete student: Examination results are registered for this student.';
    } else if (msg.includes('fk_result_sched')) {
      userMessage = 'Cannot delete exam schedule: Student results have already been processed for this exam.';
    } else {
      userMessage = 'Cannot delete this record: It is referenced by other active records in the database.';
    }
  }

  // MySQL Error 1062: Duplicate entry
  else if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    statusCode = 400;
    const msg = err.message || '';
    if (msg.includes('uq_hall_slot')) {
      userMessage = 'Hall clash detected: This exam hall is already booked on this date and starting time.';
    } else if (msg.includes('uq_student_exam')) {
      userMessage = 'Duplicate result entry: A result for this student and exam schedule already exists.';
    } else if (msg.includes('roll_no')) {
      userMessage = 'Duplicate Roll Number: A student with this roll number is already registered.';
    } else if (msg.includes('email')) {
      userMessage = 'Duplicate Email: A user with this email address already exists in the system.';
    } else if (msg.includes('course_code')) {
      userMessage = 'Duplicate Course Code: A course with this code is already registered.';
    } else if (msg.includes('hall_name')) {
      userMessage = 'Duplicate Exam Hall Name: An examination hall with this name already exists.';
    } else if (msg.includes('department_name')) {
      userMessage = 'Duplicate Department Name: A department with this name already exists.';
    } else {
      userMessage = 'Duplicate entry: A record with these unique details already exists.';
    }
  }

  // MySQL Error 1452: Foreign key reference does not exist
  else if (err.errno === 1452 || err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    userMessage = 'Invalid reference: The selected parent record (department, course, faculty, or student) does not exist.';
  }

  // Validation / Bad Request
  else if (err.statusCode === 400 || err.name === 'ValidationError') {
    statusCode = 400;
    userMessage = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message: userMessage,
    errorDetails: process.env.NODE_ENV === 'development' ? err.message : undefined,
    data: null
  });
}
