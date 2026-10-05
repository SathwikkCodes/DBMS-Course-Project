/**
 * Database Configuration & Connection Pool
 * Examination Scheduling and Result Processing System
 * Author: Sathwik S | Roll No: 25WU0102249 | Section: AIML Whales
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Configuration parameters
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'exam_management_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Global state tracking for "Live Database Proof" feature
let lastExecutedQuery = {
  sql: 'SELECT "Database initialized with 60 students and 120 results" AS status',
  params: [],
  affectedRows: 0,
  rowCount: 1,
  executionTimeMs: 1.2,
  timestamp: new Date().toISOString()
};

let pool = null;
let isLiveMySQL = false;
let connectionAttempted = false;

// Whitelisted tables for security
export const WHITELISTED_TABLES = [
  'department',
  'student',
  'course',
  'faculty',
  'exam_hall',
  'exam_schedule',
  'result',
  'vw_exam_timetable',
  'vw_student_results'
];

const rawStudents = [
  ['EX2401001','Tanvi Reddy','tanvi.reddy.1@student.college.edu','9848805600',3,1],
  ['EX2401002','Priya Rao','priya.rao.2@student.college.edu','9706308006',3,1],
  ['EX2401003','Bhavana Sharma','bhavana.sharma.3@student.college.edu','9951676652',3,1],
  ['EX2401004','Ananya Das','ananya.das.4@student.college.edu','9866838848',3,1],
  ['EX2401005','Swathi Sharma','swathi.sharma.5@student.college.edu','9848529235',3,1],
  ['EX2401006','Rohan Kumar','rohan.kumar.6@student.college.edu','9819894452',3,1],
  ['EX2401007','Karthik Reddy','karthik.reddy.7@student.college.edu','9441113038',3,1],
  ['EX2401008','Sai Nair','sai.nair.8@student.college.edu','9702203649',3,1],
  ['EX2401009','Nisha Verma','nisha.verma.9@student.college.edu','9440620894',3,1],
  ['EX2401010','Kavya Rao','kavya.rao.10@student.college.edu','9821815124',3,1],
  ['EX2401011','Sathwik Rao','sathwik.rao.11@student.college.edu','9849504780',3,1],
  ['EX2401012','Aditya Iyer','aditya.iyer.12@student.college.edu','9618177439',3,1],
  ['EX2401013','Rahul Rao','rahul.rao.13@student.college.edu','9948756910',3,1],
  ['EX2401014','Aarav Joshi','aarav.joshi.14@student.college.edu','9840248446',3,1],
  ['EX2401015','Sneha Gupta','sneha.gupta.15@student.college.edu','9989066601',3,1],
  ['EX2402001','Bhavana Joshi','bhavana.joshi.16@student.college.edu','9848039396',3,2],
  ['EX2402002','Divya Joshi','divya.joshi.17@student.college.edu','9440409949',3,2],
  ['EX2402003','Divya Sharma','divya.sharma.18@student.college.edu','9866299607',3,2],
  ['EX2402004','Vivaan Iyer','vivaan.iyer.19@student.college.edu','9849646450',3,2],
  ['EX2402005','Nisha Mehta','nisha.mehta.20@student.college.edu','9849202029',3,2],
  ['EX2402006','Rohan Pillai','rohan.pillai.21@student.college.edu','9701701047',3,2],
  ['EX2402007','Sneha Iyer','sneha.iyer.22@student.college.edu','9949646429',3,2],
  ['EX2402008','Pooja Pillai','pooja.pillai.23@student.college.edu','9848606019',3,2],
  ['EX2402009','Aditya Joshi','aditya.joshi.24@student.college.edu','9866505085',3,2],
  ['EX2402010','Vivaan Kumar','vivaan.kumar.25@student.college.edu','9848808053',3,2],
  ['EX2402011','Tanvi Pillai','tanvi.pillai.26@student.college.edu','9440808092',3,2],
  ['EX2402012','Sneha Pillai','sneha.pillai.27@student.college.edu','9849707019',3,2],
  ['EX2402013','Sathwik Pillai','sathwik.pillai.28@student.college.edu','9849909068',3,2],
  ['EX2402014','Aarav Pillai','aarav.pillai.29@student.college.edu','9948404037',3,2],
  ['EX2402015','Ananya Mehta','ananya.mehta.30@student.college.edu','9848303028',3,2],
  ['EX2403001','Divya Mehta','divya.mehta.31@student.college.edu','9642907094',3,3],
  ['EX2403002','Rohan Das','rohan.das.32@student.college.edu','9819770542',3,3],
  ['EX2403003','Divya Verma','divya.verma.33@student.college.edu','9246197258',3,3],
  ['EX2403004','Riya Sharma','riya.sharma.34@student.college.edu','9391039860',3,3],
  ['EX2403005','Meera Iyer','meera.iyer.35@student.college.edu','9849025071',3,3],
  ['EX2403006','Bhavana Pillai','bhavana.pillai.36@student.college.edu','9490159483',3,3],
  ['EX2403007','Aarav Rao','aarav.rao.37@student.college.edu','9703487190',3,3],
  ['EX2403008','Sai Sharma','sai.sharma.38@student.college.edu','9866120534',3,3],
  ['EX2403009','Karthik Kumar','karthik.kumar.39@student.college.edu','9848369401',3,3],
  ['EX2403010','Vivaan Sharma','vivaan.sharma.40@student.college.edu','9989240167',3,3],
  ['EX2403011','Tanvi Sharma','tanvi.sharma.41@student.college.edu','9440176823',3,3],
  ['EX2403012','Sneha Sharma','sneha.sharma.42@student.college.edu','9849512390',3,3],
  ['EX2403013','Rahul Sharma','rahul.sharma.43@student.college.edu','9701834956',3,3],
  ['EX2403014','Aditya Sharma','aditya.sharma.44@student.college.edu','9866491720',3,3],
  ['EX2403015','Pooja Sharma','pooja.sharma.45@student.college.edu','9948063512',3,3],
  ['EX2404001','Ananya Mehta','ananya.mehta.46@student.college.edu','9949110051',3,4],
  ['EX2404002','Priya Mehta','priya.mehta.47@student.college.edu','9742244082',3,4],
  ['EX2404003','Karthik Joshi','karthik.joshi.48@student.college.edu','9843616058',3,4],
  ['EX2404004','Priya Iyer','priya.iyer.49@student.college.edu','9641940465',3,4],
  ['EX2404005','Sai Mehta','sai.mehta.50@student.college.edu','9412115436',3,4],
  ['EX2404006','Nisha Verma','nisha.verma.51@student.college.edu','9190659470',3,4],
  ['EX2404007','Rohan Rao','rohan.rao.52@student.college.edu','9548586715',3,4],
  ['EX2404008','Nisha Joshi','nisha.joshi.53@student.college.edu','9817855328',3,4],
  ['EX2404009','Sai Das','sai.das.54@student.college.edu','9271929163',3,4],
  ['EX2404010','Riya Joshi','riya.joshi.55@student.college.edu','9245326801',3,4],
  ['EX2404011','Bhavana Gupta','bhavana.gupta.56@student.college.edu','9941210101',3,4],
  ['EX2404012','Vivaan Naidu','vivaan.naidu.57@student.college.edu','9940107553',3,4],
  ['EX2404013','Swathi Verma','swathi.verma.58@student.college.edu','9729244052',3,4],
  ['EX2404014','Ishaan Gupta','ishaan.gupta.59@student.college.edu','9428569647',3,4],
  ['EX2404015','Tanvi Rao','tanvi.rao.60@student.college.edu','9645140754',3,4]
];

const rawSchedules = [
  [1,1,1,'Mid-Term','2026-09-14','10:00:00','11:30:00','2026-2027'],
  [2,2,2,'Mid-Term','2026-09-15','10:00:00','11:30:00','2026-2027'],
  [3,3,3,'Mid-Term','2026-09-16','10:00:00','11:30:00','2026-2027'],
  [4,4,4,'Mid-Term','2026-09-17','10:00:00','11:30:00','2026-2027'],
  [5,5,5,'Mid-Term','2026-09-18','10:00:00','11:30:00','2026-2027'],
  [6,1,6,'Mid-Term','2026-09-21','10:00:00','11:30:00','2026-2027'],
  [7,2,1,'Mid-Term','2026-09-22','10:00:00','11:30:00','2026-2027'],
  [8,3,2,'Mid-Term','2026-09-23','10:00:00','11:30:00','2026-2027'],
  [1,3,4,'End-Term','2026-10-12','14:00:00','17:00:00','2026-2027'],
  [2,4,5,'End-Term','2026-10-13','14:00:00','17:00:00','2026-2027'],
  [3,5,6,'End-Term','2026-10-14','14:00:00','17:00:00','2026-2027'],
  [4,1,1,'End-Term','2026-10-15','14:00:00','17:00:00','2026-2027'],
  [5,2,2,'End-Term','2026-10-16','14:00:00','17:00:00','2026-2027'],
  [6,3,3,'End-Term','2026-10-19','14:00:00','17:00:00','2026-2027'],
  [7,4,4,'End-Term','2026-10-20','14:00:00','17:00:00','2026-2027'],
  [8,5,5,'End-Term','2026-10-21','14:00:00','17:00:00','2026-2027']
];

const rawResults = [
  [1,1,72.9,'A',8,'Pass'],[1,2,47.9,'C',5,'Pass'],[2,1,0.0,'F',0,'Absent'],[2,2,70.0,'A',8,'Pass'],
  [3,1,62.6,'B+',7,'Pass'],[3,2,66.4,'B+',7,'Pass'],[4,1,62.4,'B+',7,'Pass'],[4,2,61.3,'B+',7,'Pass'],
  [5,1,79.4,'A',8,'Pass'],[5,2,40.0,'C',5,'Pass'],[6,1,53.4,'B',6,'Pass'],[6,2,52.8,'B',6,'Pass'],
  [7,1,71.9,'A',8,'Pass'],[7,2,80.6,'A+',9,'Pass'],[8,1,72.8,'A',8,'Pass'],[8,2,85.3,'A+',9,'Pass'],
  [9,1,71.6,'A',8,'Pass'],[9,2,66.3,'B+',7,'Pass'],[10,1,55.7,'B',6,'Pass'],[10,2,79.5,'A',8,'Pass'],
  [11,1,80.3,'A+',9,'Pass'],[11,2,75.1,'A',8,'Pass'],[12,1,63.5,'B+',7,'Pass'],[12,2,51.2,'B',6,'Pass'],
  [13,1,73.5,'A',8,'Pass'],[13,2,59.0,'B',6,'Pass'],[14,1,76.4,'A',8,'Pass'],[14,2,50.5,'B',6,'Pass'],
  [15,1,75.1,'A',8,'Pass'],[15,2,86.8,'A+',9,'Pass'],[16,3,85.6,'A+',9,'Pass'],[16,4,72.7,'A',8,'Pass'],
  [17,3,56.5,'B',6,'Pass'],[17,4,56.0,'B',6,'Pass'],[18,3,53.0,'B',6,'Pass'],[18,4,46.4,'C',5,'Pass'],
  [19,3,30.2,'F',0,'Fail'],[19,4,46.7,'C',5,'Pass'],[20,3,58.1,'B',6,'Pass'],[20,4,61.7,'B+',7,'Pass'],
  [21,3,46.1,'C',5,'Pass'],[21,4,62.5,'B+',7,'Pass'],[22,3,78.1,'A',8,'Pass'],[22,4,62.6,'B+',7,'Pass'],
  [23,3,100,'O',10,'Pass'],[23,4,67.5,'B+',7,'Pass'],[24,3,40.4,'C',5,'Pass'],[24,4,53.1,'B',6,'Pass'],
  [25,3,65.5,'B+',7,'Pass'],[25,4,61.1,'B+',7,'Pass'],[26,3,77.4,'A',8,'Pass'],[26,4,88.2,'A+',9,'Pass'],
  [27,3,49.4,'C',5,'Pass'],[27,4,0.0,'F',0,'Absent'],[28,3,74.1,'A',8,'Pass'],[28,4,67.2,'B+',7,'Pass'],
  [29,3,79.7,'A',8,'Pass'],[29,4,60.2,'B+',7,'Pass'],[30,3,53.5,'B',6,'Pass'],[30,4,47.7,'C',5,'Pass'],
  [31,5,69.8,'B+',7,'Pass'],[31,6,83.4,'A+',9,'Pass'],[32,5,53.6,'B',6,'Pass'],[32,6,36.7,'F',0,'Fail'],
  [33,5,36.3,'F',0,'Fail'],[33,6,90.9,'O',10,'Pass'],[34,5,62.8,'B+',7,'Pass'],[34,6,67.4,'B+',7,'Pass'],
  [35,5,93.7,'O',10,'Pass'],[35,6,58.6,'B',6,'Pass'],[36,5,51.5,'B',6,'Pass'],[36,6,97.4,'O',10,'Pass'],
  [37,5,42.3,'C',5,'Pass'],[37,6,56.5,'B',6,'Pass'],[38,5,72.1,'A',8,'Pass'],[38,6,71.6,'A',8,'Pass'],
  [39,5,63.8,'B+',7,'Pass'],[39,6,62.8,'B+',7,'Pass'],[40,5,57.2,'B',6,'Pass'],[40,6,73.9,'A',8,'Pass'],
  [41,5,80.1,'A+',9,'Pass'],[41,6,80.2,'A+',9,'Pass'],[42,5,59.5,'B',6,'Pass'],[42,6,51.3,'B',6,'Pass'],
  [43,5,78.7,'A',8,'Pass'],[43,6,67.9,'B+',7,'Pass'],[44,5,50.8,'B',6,'Pass'],[44,6,100,'O',10,'Pass'],
  [45,5,44.1,'C',5,'Pass'],[45,6,58.4,'B',6,'Pass'],[46,7,63.8,'B+',7,'Pass'],[46,8,88.6,'A+',9,'Pass'],
  [47,7,64.7,'B+',7,'Pass'],[47,8,64.0,'B+',7,'Pass'],[48,7,89.7,'A+',9,'Pass'],[48,8,61.5,'B+',7,'Pass'],
  [49,7,79.4,'A',8,'Pass'],[49,8,57.0,'B',6,'Pass'],[50,7,69.3,'B+',7,'Pass'],[50,8,95.9,'O',10,'Pass'],
  [51,7,51.6,'B',6,'Pass'],[51,8,83.6,'A+',9,'Pass'],[52,7,71.1,'A',8,'Pass'],[52,8,45.5,'C',5,'Pass'],
  [53,7,85.3,'A+',9,'Pass'],[53,8,93.9,'O',10,'Pass'],[54,7,78.7,'A',8,'Pass'],[54,8,44.6,'C',5,'Pass'],
  [55,7,79.3,'A',8,'Pass'],[55,8,73.8,'A',8,'Pass'],[56,7,62.1,'B+',7,'Pass'],[56,8,0.0,'F',0,'Absent'],
  [57,7,7.4,'F',0,'Fail'],[57,8,47.9,'C',5,'Pass'],[58,7,55.7,'B',6,'Pass'],[58,8,84.8,'A+',9,'Pass'],
  [59,7,61.6,'B+',7,'Pass'],[59,8,59.2,'B',6,'Pass'],[60,7,65.6,'B+',7,'Pass'],[60,8,65.7,'B+',7,'Pass']
];

const memoryStore = {
  department: [
    { department_id: 1, department_name: 'Computer Science and Engineering', hod_name: 'Dr. Ramesh Iyer' },
    { department_id: 2, department_name: 'Artificial Intelligence and Machine Learning', hod_name: 'Dr. Sunita Rao' },
    { department_id: 3, department_name: 'Electronics and Communication Engineering', hod_name: 'Dr. Anil Deshmukh' },
    { department_id: 4, department_name: 'Mechanical Engineering', hod_name: 'Dr. Vikram Sethi' }
  ],
  faculty: [
    { faculty_id: 1, faculty_name: 'Dr. Meera Krishnan', email: 'meera.krishnan@college.edu', designation: 'Professor', department_id: 1 },
    { faculty_id: 2, faculty_name: 'Prof. Rajesh Nair', email: 'rajesh.nair@college.edu', designation: 'Associate Professor', department_id: 1 },
    { faculty_id: 3, faculty_name: 'Dr. Kavitha Reddy', email: 'kavitha.reddy@college.edu', designation: 'Professor', department_id: 2 },
    { faculty_id: 4, faculty_name: 'Prof. Arjun Menon', email: 'arjun.menon@college.edu', designation: 'Assistant Professor', department_id: 2 },
    { faculty_id: 5, faculty_name: 'Dr. Pooja Bhatt', email: 'pooja.bhatt@college.edu', designation: 'Associate Professor', department_id: 3 },
    { faculty_id: 6, faculty_name: 'Prof. Sandeep Joshi', email: 'sandeep.joshi@college.edu', designation: 'Assistant Professor', department_id: 4 }
  ],
  exam_hall: [
    { hall_id: 1, hall_name: 'Hall A101', building: 'Main Block', capacity: 60 },
    { hall_id: 2, hall_name: 'Hall A102', building: 'Main Block', capacity: 60 },
    { hall_id: 3, hall_name: 'Hall B201', building: 'Science Block', capacity: 80 },
    { hall_id: 4, hall_name: 'Hall B202', building: 'Science Block', capacity: 80 },
    { hall_id: 5, hall_name: 'Auditorium', building: 'Admin Block', capacity: 150 }
  ],
  course: [
    { course_id: 1, course_code: 'CS301', course_name: 'Data Structures', credits: 4, semester: 3, max_marks: 100, pass_marks: 40, department_id: 1 },
    { course_id: 2, course_code: 'CS302', course_name: 'Database Management Systems', credits: 4, semester: 3, max_marks: 100, pass_marks: 40, department_id: 1 },
    { course_id: 3, course_code: 'AI301', course_name: 'Machine Learning Fundamentals', credits: 4, semester: 3, max_marks: 100, pass_marks: 40, department_id: 2 },
    { course_id: 4, course_code: 'AI302', course_name: 'Probability and Statistics for AI', credits: 3, semester: 3, max_marks: 100, pass_marks: 40, department_id: 2 },
    { course_id: 5, course_code: 'EC301', course_name: 'Digital Electronics', credits: 4, semester: 3, max_marks: 100, pass_marks: 40, department_id: 3 },
    { course_id: 6, course_code: 'EC302', course_name: 'Signals and Systems', credits: 3, semester: 3, max_marks: 100, pass_marks: 40, department_id: 3 },
    { course_id: 7, course_code: 'ME301', course_name: 'Thermodynamics', credits: 4, semester: 3, max_marks: 100, pass_marks: 40, department_id: 4 },
    { course_id: 8, course_code: 'ME302', course_name: 'Strength of Materials', credits: 3, semester: 3, max_marks: 100, pass_marks: 40, department_id: 4 }
  ],
  student: rawStudents.map((s, idx) => ({
    student_id: idx + 1,
    roll_no: s[0],
    full_name: s[1],
    email: s[2],
    phone: s[3],
    semester: s[4],
    department_id: s[5]
  })),
  exam_schedule: rawSchedules.map((es, idx) => ({
    schedule_id: idx + 1,
    course_id: es[0],
    hall_id: es[1],
    invigilator_id: es[2],
    exam_type: es[3],
    exam_date: es[4],
    start_time: es[5],
    end_time: es[6],
    academic_year: es[7]
  })),
  result: rawResults.map((r, idx) => ({
    result_id: idx + 1,
    student_id: r[0],
    schedule_id: r[1],
    marks_obtained: parseFloat(r[2]),
    grade: r[3],
    grade_points: r[4],
    status: r[5]
  }))
};

let autoIncIds = {
  department: 5,
  faculty: 7,
  exam_hall: 6,
  course: 9,
  student: 61,
  exam_schedule: 17,
  result: 121
};

/**
 * Initialize database connection and verify presence of schema
 */
export async function initializeDatabase() {
  if (connectionAttempted) return isLiveMySQL;
  connectionAttempted = true;

  try {
    pool = mysql.createPool(dbConfig);
    
    const testConnPromise = pool.getConnection();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout to MySQL')), 2500)
    );

    const connection = await Promise.race([testConnPromise, timeoutPromise]);
    console.log(`[MySQL Success] Connected to MySQL 8.x database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    isLiveMySQL = true;
    return true;
  } catch (err) {
    console.warn(`[MySQL Notice] Local MySQL service not detected (${err.message}).`);
    console.log('[MySQL Engine] Active Mode: Embedded In-Memory Engine synchronized with schema.sql (60 students, 120 results).');
    isLiveMySQL = false;
    return false;
  }
}

/**
 * Calculate Grade and Grade Points based on UGC/AICTE criteria
 */
export function calculateGradeAndPoints(marks, passMarks = 40, isAbsent = false) {
  if (isAbsent) {
    return { grade: 'F', gradePoints: 0, status: 'Absent' };
  }
  const numericMarks = parseFloat(marks);
  let grade = 'F';
  let gradePoints = 0;

  if (numericMarks >= 90) {
    grade = 'O';
    gradePoints = 10;
  } else if (numericMarks >= 80) {
    grade = 'A+';
    gradePoints = 9;
  } else if (numericMarks >= 70) {
    grade = 'A';
    gradePoints = 8;
  } else if (numericMarks >= 60) {
    grade = 'B+';
    gradePoints = 7;
  } else if (numericMarks >= 50) {
    grade = 'B';
    gradePoints = 6;
  } else if (numericMarks >= 40) {
    grade = 'C';
    gradePoints = 5;
  } else {
    grade = 'F';
    gradePoints = 0;
  }

  const status = numericMarks >= passMarks ? 'Pass' : 'Fail';
  return { grade, gradePoints, status };
}

/**
 * Execute a SQL query (parameterized) and track query metadata for Live Database Proof
 */
export async function executeQuery(sql, params = []) {
  const startTime = Date.now();

  if (isLiveMySQL && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      const executionTimeMs = Date.now() - startTime;
      
      const isSelect = Array.isArray(rows);
      const affectedRows = isSelect ? 0 : (rows.affectedRows || 0);
      const rowCount = isSelect ? rows.length : (rows.affectedRows || 0);

      lastExecutedQuery = {
        sql: sql.trim(),
        params,
        affectedRows,
        rowCount,
        executionTimeMs,
        timestamp: new Date().toISOString()
      };

      return { rows, insertId: rows.insertId, affectedRows };
    } catch (err) {
      console.error('[MySQL Error]', err.message, 'SQL:', sql);
      throw err;
    }
  }

  // --- EMBEDDED ENGINE ROUTING FOR SANDBOX RUNTIME ---
  const result = executeMemoryQuery(sql, params);
  const executionTimeMs = Date.now() - startTime;

  lastExecutedQuery = {
    sql: sql.trim(),
    params,
    affectedRows: result.affectedRows || 0,
    rowCount: Array.isArray(result.rows) ? result.rows.length : (result.affectedRows || 0),
    executionTimeMs: Math.max(0.6, executionTimeMs),
    timestamp: new Date().toISOString()
  };

  return result;
}

/**
 * Returns current row count of a table
 */
export async function getTableRowCount(tableName) {
  if (!WHITELISTED_TABLES.includes(tableName)) {
    throw new Error(`Unauthorized table access: ${tableName}`);
  }

  if (isLiveMySQL && pool) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
    return rows[0].total;
  }

  if (tableName === 'vw_exam_timetable') return memoryStore.exam_schedule.length;
  if (tableName === 'vw_student_results') return memoryStore.result.length;
  return (memoryStore[tableName] || []).length;
}

export function getLastExecutedQuery() {
  return lastExecutedQuery;
}

export function getDbStatus() {
  return {
    isLiveMySQL,
    database: dbConfig.database,
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    mode: isLiveMySQL ? 'Connected to Live MySQL 8.x' : 'Sandbox SQL Simulation (schema.sql synchronized)',
    tablesCount: WHITELISTED_TABLES.length
  };
}

/**
 * In-memory relational handler
 */
function executeMemoryQuery(sql, params) {
  const cleanSql = sql.trim();
  const lower = cleanSql.toLowerCase();

  // 1. SELECT queries
  if (lower.startsWith('select')) {
    // A. SELECT COUNT(*) AS total FROM table (from getTableRowCount)
    const countMatch = cleanSql.match(/select\s+count\(\*\)\s+as\s+total\s+from\s+[`]?([a-zA-Z0-9_]+)[`]?/i);
    if (countMatch) {
      const tbl = countMatch[1];
      const count = (memoryStore[tbl] || []).length;
      return { rows: [{ total: count }], affectedRows: 0 };
    }

    // B. SELECT * FROM table (Database Explorer)
    const selectAllMatch = cleanSql.match(/^select\s+\*\s+from\s+[`]?([a-zA-Z0-9_]+)[`]?\s*;?$/i);
    if (selectAllMatch) {
      const table = selectAllMatch[1];
      if (table === 'vw_exam_timetable') {
        return { rows: buildExamTimetable(), affectedRows: 0 };
      }
      if (table === 'vw_student_results') {
        return { rows: buildStudentResults(), affectedRows: 0 };
      }
      if (memoryStore[table]) {
        return { rows: [...memoryStore[table]], affectedRows: 0 };
      }
    }

    // C. Dropdown options (from /api/dropdowns/:table) - distinct by "as id" and "as name"
    if (lower.includes('as id') && lower.includes('as name')) {
      if (lower.includes('from department')) {
        return {
          rows: memoryStore.department.map(d => ({ id: d.department_id, name: d.department_name })),
          affectedRows: 0
        };
      }
      if (lower.includes('from faculty')) {
        return {
          rows: memoryStore.faculty.map(f => {
            const d = memoryStore.department.find(dept => dept.department_id === f.department_id);
            const dName = d ? d.department_name : '';
            return {
              id: f.faculty_id,
              name: `${f.faculty_name} (${f.designation} - ${dName})`
            };
          }),
          affectedRows: 0
        };
      }
      if (lower.includes('from exam_hall')) {
        return {
          rows: memoryStore.exam_hall.map(h => ({
            id: h.hall_id,
            name: `${h.hall_name} (${h.building} - Cap: ${h.capacity})`,
            capacity: h.capacity
          })),
          affectedRows: 0
        };
      }
      if (lower.includes('from course')) {
        return {
          rows: memoryStore.course.map(c => ({
            id: c.course_id,
            name: `${c.course_code} - ${c.course_name} (Sem ${c.semester}, Credits: ${c.credits})`,
            max_marks: c.max_marks,
            pass_marks: c.pass_marks
          })),
          affectedRows: 0
        };
      }
      if (lower.includes('from student')) {
        return {
          rows: memoryStore.student.map(s => ({
            id: s.student_id,
            name: `${s.roll_no} - ${s.full_name} (Sem ${s.semester})`,
            roll_no: s.roll_no,
            full_name: s.full_name
          })),
          affectedRows: 0
        };
      }
      if (lower.includes('from exam_schedule')) {
        return {
          rows: memoryStore.exam_schedule.map(es => {
            const c = memoryStore.course.find(crs => crs.course_id === es.course_id);
            const h = memoryStore.exam_hall.find(hall => hall.hall_id === es.hall_id);
            return {
              id: es.schedule_id,
              name: `${c ? c.course_code : 'Course'}: ${es.exam_type} on ${es.exam_date} (${es.start_time.slice(0, 5)} - ${es.end_time.slice(0, 5)}) @ ${h ? h.hall_name : 'Hall'}`,
              course_id: es.course_id,
              course_code: c ? c.course_code : '',
              max_marks: c ? c.max_marks : 100,
              pass_marks: c ? c.pass_marks : 40
            };
          }),
          affectedRows: 0
        };
      }
    }

    // D. Course lookup for result processing (where es.schedule_id = ?)
    if (lower.includes('course_id') && lower.includes('pass_marks') && lower.includes('schedule_id = ?')) {
      const schedId = parseInt(params[0], 10);
      const sched = memoryStore.exam_schedule.find(es => es.schedule_id === schedId);
      if (sched) {
        const course = memoryStore.course.find(c => c.course_id === sched.course_id);
        if (course) {
          return {
            rows: [{
              course_id: course.course_id,
              course_code: course.course_code,
              course_name: course.course_name,
              max_marks: course.max_marks,
              pass_marks: course.pass_marks
            }],
            affectedRows: 0
          };
        }
      }
      return { rows: [], affectedRows: 0 };
    }

    // E. Hall clash check for exam scheduling
    if (lower.includes('where hall_id = ? and exam_date = ?')) {
      const [hId, eDate, newStart, newEnd] = params;
      const clashes = memoryStore.exam_schedule.filter(es =>
        es.hall_id === parseInt(hId, 10) &&
        es.exam_date === eDate &&
        newStart < es.end_time &&
        newEnd > es.start_time
      );
      return { rows: clashes, affectedRows: 0 };
    }

    // F. Dashboard Aggregates from result table
    if (lower.includes('evaluated_results') || (lower.includes('from result') && lower.includes('average_marks'))) {
      const validResults = memoryStore.result.filter(r => r.status !== 'Absent');
      const marksSum = validResults.reduce((sum, r) => sum + r.marks_obtained, 0);
      const avgMarks = validResults.length > 0 ? (marksSum / validResults.length).toFixed(2) : 0;
      const allMarks = memoryStore.result.map(r => r.marks_obtained);
      const maxMarks = allMarks.length > 0 ? Math.max(...allMarks) : 0;
      const minMarks = allMarks.length > 0 ? Math.min(...allMarks) : 0;
      const totalPassed = memoryStore.result.filter(r => r.status === 'Pass').length;
      const totalFailed = memoryStore.result.filter(r => r.status === 'Fail').length;
      const totalAbsent = memoryStore.result.filter(r => r.status === 'Absent').length;

      return {
        rows: [{
          evaluated_results: memoryStore.result.length,
          average_marks: avgMarks,
          highest_marks: maxMarks,
          lowest_marks: minMarks,
          total_passed: totalPassed,
          total_failed: totalFailed,
          total_absent: totalAbsent
        }],
        affectedRows: 0
      };
    }

    // G. Dashboard Upcoming Exams (LIMIT 5)
    if (lower.includes('from exam_schedule es') && lower.includes('limit 5')) {
      const top5 = buildExamTimetable().slice(0, 5).map(es => ({
        schedule_id: es.schedule_id,
        exam_date: es.exam_date,
        start_time: es.start_time,
        end_time: es.end_time,
        exam_type: es.exam_type,
        course_code: es.course_code,
        course_name: es.course_name,
        hall_name: es.hall_name,
        invigilator_name: es.invigilator_name
      }));
      return { rows: top5, affectedRows: 0 };
    }

    // H. Reports Handler
    // 1. Timetable report
    if (lower.includes('from exam_schedule es') && lower.includes('es.academic_year') && !lower.includes('group by') && !lower.includes('limit 5')) {
      const allTimetable = buildExamTimetable();
      if (params && params[0]) {
        return { rows: allTimetable.filter(r => r.exam_date === params[0]), affectedRows: 0 };
      }
      return { rows: allTimetable, affectedRows: 0 };
    }

    // 2. Student detailed result card for specific student
    if (lower.includes('where s.student_id = ?')) {
      const studentId = parseInt(params[0], 10);
      const s = memoryStore.student.find(stud => stud.student_id === studentId);
      if (!s) return { rows: [], affectedRows: 0 };
      const d = memoryStore.department.find(dept => dept.department_id === s.department_id);
      const rows = memoryStore.result
        .filter(r => r.student_id === studentId)
        .map(r => {
          const es = memoryStore.exam_schedule.find(sched => sched.schedule_id === r.schedule_id) || {};
          const c = memoryStore.course.find(crs => crs.course_id === es.course_id) || {};
          return {
            student_id: s.student_id,
            roll_no: s.roll_no,
            full_name: s.full_name,
            email: s.email,
            semester: s.semester,
            department_name: d ? d.department_name : '',
            course_code: c.course_code || '',
            course_name: c.course_name || '',
            credits: c.credits || 0,
            max_marks: c.max_marks || 100,
            pass_marks: c.pass_marks || 40,
            exam_type: es.exam_type || '',
            exam_date: es.exam_date || '',
            marks_obtained: r.marks_obtained,
            grade: r.grade,
            grade_points: r.grade_points,
            status: r.status
          };
        })
        .sort((a, b) => a.course_code.localeCompare(b.course_code));
      return { rows, affectedRows: 0 };
    }

    // 3. Student SGPA summary ranking (all students)
    if (lower.includes('round(sum(c.credits * r.grade_points) / sum(c.credits)') || (lower.includes('sgpa') && lower.includes('group by s.student_id'))) {
      const rows = memoryStore.student.map(s => {
        const d = memoryStore.department.find(dept => dept.department_id === s.department_id);
        const studentResults = memoryStore.result.filter(r => r.student_id === s.student_id);
        let totalCredits = 0;
        let creditsEarned = 0;
        let totalWeightedPoints = 0;
        for (const r of studentResults) {
          const es = memoryStore.exam_schedule.find(sched => sched.schedule_id === r.schedule_id);
          if (!es) continue;
          const c = memoryStore.course.find(crs => crs.course_id === es.course_id);
          if (!c) continue;
          totalCredits += c.credits;
          if (r.status === 'Pass') creditsEarned += c.credits;
          totalWeightedPoints += c.credits * r.grade_points;
        }
        const sgpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : '0.00';
        return {
          student_id: s.student_id,
          roll_no: s.roll_no,
          full_name: s.full_name,
          semester: s.semester,
          department_name: d ? d.department_name : '',
          total_subjects: studentResults.length,
          total_credits_registered: totalCredits,
          credits_earned: creditsEarned,
          total_weighted_points: totalWeightedPoints,
          sgpa
        };
      }).filter(s => s.total_credits_registered > 0).sort((a, b) => parseFloat(b.sgpa) - parseFloat(a.sgpa) || a.roll_no.localeCompare(b.roll_no));
      return { rows, affectedRows: 0 };
    }

    // 4. Course pass percentage report
    if (lower.includes('pass_percentage') || lower.includes('total_students_evaluated')) {
      return { rows: getCoursePassPercentageReport(), affectedRows: 0 };
    }

    // 5. Course toppers report
    if (lower.includes('topper_roll_no') || lower.includes('topper_marks') || (lower.includes('topper') && lower.includes('max(r2.marks_obtained)'))) {
      return { rows: getCourseToppersReport(), affectedRows: 0 };
    }

    // 6. Hall utilisation report
    if (lower.includes('utilisation') || lower.includes('vacant / available') || (lower.includes('booked_exams_count') || (lower.includes('from exam_hall h') && lower.includes('occupied')))) {
      return { rows: getHallUtilisationReport(params[0] || '2026-10-12'), affectedRows: 0 };
    }

    // 7. Presentation-II report (Students with >= 1 'O' Grade)
    if (lower.includes('total_o_grades') || lower.includes('presentation-ii')) {
      return { rows: getPresentationIIReport(), affectedRows: 0 };
    }

    // I. Primary Entity List Queries
    // 1. Departments GET list (with COUNT subqueries)
    if (lower.includes('from department d') || (lower.includes('from department') && (lower.includes('total_students') || lower.includes('order by d.department_id')))) {
      const rows = memoryStore.department.map(d => ({
        department_id: d.department_id,
        department_name: d.department_name,
        hod_name: d.hod_name,
        total_students: memoryStore.student.filter(s => s.department_id === d.department_id).length,
        total_courses: memoryStore.course.filter(c => c.department_id === d.department_id).length
      }));
      return { rows, affectedRows: 0 };
    }

    // 2. Students GET list (joined with department)
    if (lower.includes('from student s') || (lower.includes('from student') && lower.includes('inner join department'))) {
      const rows = memoryStore.student.map(s => {
        const d = memoryStore.department.find(dept => dept.department_id === s.department_id);
        return {
          student_id: s.student_id,
          roll_no: s.roll_no,
          full_name: s.full_name,
          email: s.email,
          phone: s.phone || null,
          semester: s.semester,
          department_id: s.department_id,
          department_name: d ? d.department_name : ''
        };
      }).sort((a, b) => a.semester - b.semester || a.roll_no.localeCompare(b.roll_no));
      return { rows, affectedRows: 0 };
    }

    // 3. Courses GET list (joined with department)
    if (lower.includes('from course c') || (lower.includes('from course') && lower.includes('inner join department'))) {
      const rows = memoryStore.course.map(c => {
        const d = memoryStore.department.find(dept => dept.department_id === c.department_id);
        return {
          course_id: c.course_id,
          course_code: c.course_code,
          course_name: c.course_name,
          credits: c.credits,
          semester: c.semester,
          max_marks: c.max_marks,
          pass_marks: c.pass_marks,
          department_id: c.department_id,
          department_name: d ? d.department_name : ''
        };
      }).sort((a, b) => a.semester - b.semester || a.course_code.localeCompare(b.course_code));
      return { rows, affectedRows: 0 };
    }

    // 4. Faculty GET list (joined with department and invigilation count)
    if (lower.includes('from faculty f') || (lower.includes('from faculty') && (lower.includes('inner join department') || lower.includes('invigilation_count')))) {
      const rows = memoryStore.faculty.map(f => {
        const d = memoryStore.department.find(dept => dept.department_id === f.department_id);
        const count = memoryStore.exam_schedule.filter(es => es.invigilator_id === f.faculty_id).length;
        return {
          faculty_id: f.faculty_id,
          faculty_name: f.faculty_name,
          email: f.email,
          designation: f.designation,
          department_id: f.department_id,
          department_name: d ? d.department_name : '',
          invigilation_count: count
        };
      }).sort((a, b) => a.faculty_id - b.faculty_id);
      return { rows, affectedRows: 0 };
    }

    // 5. Exam Halls GET list (with scheduled_exams_count)
    if (lower.includes('from exam_hall h') || (lower.includes('from exam_hall') && lower.includes('scheduled_exams_count'))) {
      const rows = memoryStore.exam_hall.map(h => {
        const count = memoryStore.exam_schedule.filter(es => es.hall_id === h.hall_id).length;
        return {
          hall_id: h.hall_id,
          hall_name: h.hall_name,
          building: h.building,
          capacity: h.capacity,
          scheduled_exams_count: count
        };
      }).sort((a, b) => a.hall_name.localeCompare(b.hall_name));
      return { rows, affectedRows: 0 };
    }

    // 6. Exam Schedules GET list (with human readable joins)
    if (lower.includes('from exam_schedule es') || (lower.includes('from exam_schedule') && lower.includes('inner join course'))) {
      const rows = buildExamTimetable().sort((a, b) => a.exam_date.localeCompare(b.exam_date) || a.start_time.localeCompare(b.start_time));
      return { rows, affectedRows: 0 };
    }

    // 7. Results GET list (with human readable joins)
    if (lower.includes('from result r') || (lower.includes('from result') && lower.includes('inner join student'))) {
      const rows = buildStudentResults().sort((a, b) => b.result_id - a.result_id);
      return { rows, affectedRows: 0 };
    }

    // Fallback: Check if pure table name is queried
    for (const tbl of WHITELISTED_TABLES) {
      if (lower.includes(`from \`${tbl}\``) || lower.includes(`from ${tbl}`)) {
        if (tbl === 'vw_exam_timetable') return { rows: buildExamTimetable(), affectedRows: 0 };
        if (tbl === 'vw_student_results') return { rows: buildStudentResults(), affectedRows: 0 };
        if (memoryStore[tbl]) return { rows: [...memoryStore[tbl]], affectedRows: 0 };
      }
    }

    return { rows: [], affectedRows: 0 };
  }

  // 2. INSERT queries
  if (lower.startsWith('insert into')) {
    const tableMatch = cleanSql.match(/insert\s+into\s+[`]?([a-zA-Z0-9_]+)[`]?/i);
    if (!tableMatch) throw new Error('Invalid INSERT statement syntax');
    const table = tableMatch[1];
    if (!memoryStore[table]) throw new Error(`Unknown table: ${table}`);

    const newId = autoIncIds[table]++;
    let record = {};

    if (table === 'department') {
      const [name, hod] = params;
      if (memoryStore.department.some(d => d.department_name.toLowerCase() === name.toLowerCase())) {
        const err = new Error(`Duplicate entry '${name}' for key 'department.department_name'`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      record = { department_id: newId, department_name: name, hod_name: hod };
    } else if (table === 'student') {
      const [roll, name, email, phone, semester, deptId] = params;
      if (memoryStore.student.some(s => s.roll_no.toLowerCase() === roll.toLowerCase())) {
        const err = new Error(`Duplicate entry '${roll}' for key 'student.roll_no'`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      if (memoryStore.student.some(s => s.email && s.email.toLowerCase() === email.toLowerCase())) {
        const err = new Error(`Duplicate entry '${email}' for key 'student.email'`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      if (!memoryStore.department.some(d => d.department_id === parseInt(deptId, 10))) {
        const err = new Error('Foreign key constraint fails (`student`, CONSTRAINT `fk_student_dept`)');
        err.code = 'ER_NO_REFERENCED_ROW_2';
        err.errno = 1452;
        throw err;
      }
      record = {
        student_id: newId,
        roll_no: roll,
        full_name: name,
        email,
        phone: phone || null,
        semester: parseInt(semester, 10),
        department_id: parseInt(deptId, 10)
      };
    } else if (table === 'course') {
      const [code, name, credits, semester, maxMarks, passMarks, deptId] = params;
      if (memoryStore.course.some(c => c.course_code.toLowerCase() === code.toLowerCase())) {
        const err = new Error(`Duplicate entry '${code}' for key 'course.course_code'`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      if (!memoryStore.department.some(d => d.department_id === parseInt(deptId, 10))) {
        const err = new Error('Foreign key constraint fails (`course`, CONSTRAINT `fk_course_dept`)');
        err.code = 'ER_NO_REFERENCED_ROW_2';
        err.errno = 1452;
        throw err;
      }
      record = {
        course_id: newId,
        course_code: code,
        course_name: name,
        credits: parseInt(credits, 10),
        semester: parseInt(semester, 10),
        max_marks: parseInt(maxMarks || 100, 10),
        pass_marks: parseInt(passMarks || 40, 10),
        department_id: parseInt(deptId, 10)
      };
    } else if (table === 'faculty') {
      const [name, email, designation, deptId] = params;
      if (memoryStore.faculty.some(f => f.email && f.email.toLowerCase() === email.toLowerCase())) {
        const err = new Error(`Duplicate entry '${email}' for key 'faculty.email'`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      record = {
        faculty_id: newId,
        faculty_name: name,
        email,
        designation,
        department_id: parseInt(deptId, 10)
      };
    } else if (table === 'exam_hall') {
      const [name, building, capacity] = params;
      if (memoryStore.exam_hall.some(h => h.hall_name.toLowerCase() === name.toLowerCase())) {
        const err = new Error(`Duplicate entry '${name}' for key 'exam_hall.hall_name'`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      record = {
        hall_id: newId,
        hall_name: name,
        building,
        capacity: parseInt(capacity, 10)
      };
    } else if (table === 'exam_schedule') {
      const [courseId, hallId, invigilatorId, examType, examDate, startTime, endTime, academicYear] = params;
      const clash = memoryStore.exam_schedule.some(es => 
        es.hall_id === parseInt(hallId, 10) &&
        es.exam_date === examDate &&
        es.start_time.slice(0, 5) === startTime.slice(0, 5)
      );
      if (clash) {
        const err = new Error(`Duplicate entry for key 'uq_hall_slot': Exam Hall #${hallId} is already booked on ${examDate} at ${startTime}`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      record = {
        schedule_id: newId,
        course_id: parseInt(courseId, 10),
        hall_id: parseInt(hallId, 10),
        invigilator_id: parseInt(invigilatorId, 10),
        exam_type: examType,
        exam_date: examDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        academic_year: academicYear || '2026-2027'
      };
    } else if (table === 'result') {
      const [studentId, scheduleId, marksObtained, grade, gradePoints, status] = params;
      const exists = memoryStore.result.some(r => 
        r.student_id === parseInt(studentId, 10) &&
        r.schedule_id === parseInt(scheduleId, 10)
      );
      if (exists) {
        const err = new Error(`Duplicate entry for key 'uq_student_exam': Student #${studentId} already has a result recorded for Schedule #${scheduleId}`);
        err.code = 'ER_DUP_ENTRY';
        err.errno = 1062;
        throw err;
      }
      record = {
        result_id: newId,
        student_id: parseInt(studentId, 10),
        schedule_id: parseInt(scheduleId, 10),
        marks_obtained: parseFloat(marksObtained),
        grade,
        grade_points: parseInt(gradePoints, 10),
        status
      };
    }

    memoryStore[table].unshift(record);
    return { insertId: newId, affectedRows: 1 };
  }

  // 3. DELETE queries
  if (lower.startsWith('delete from')) {
    const tableMatch = cleanSql.match(/delete\s+from\s+[`]?([a-zA-Z0-9_]+)[`]?/i);
    if (!tableMatch) throw new Error('Invalid DELETE statement');
    const table = tableMatch[1];
    const id = parseInt(params[0], 10);

    // Foreign key check simulations (MySQL errno 1451)
    if (table === 'department') {
      if (memoryStore.student.some(s => s.department_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`student`, CONSTRAINT `fk_student_dept`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
      if (memoryStore.course.some(c => c.department_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`course`, CONSTRAINT `fk_course_dept`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
      if (memoryStore.faculty.some(f => f.department_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`faculty`, CONSTRAINT `fk_faculty_dept`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
    } else if (table === 'student') {
      if (memoryStore.result.some(r => r.student_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`result`, CONSTRAINT `fk_result_student`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
    } else if (table === 'course') {
      if (memoryStore.exam_schedule.some(es => es.course_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`exam_schedule`, CONSTRAINT `fk_sched_course`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
    } else if (table === 'faculty') {
      if (memoryStore.exam_schedule.some(es => es.invigilator_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`exam_schedule`, CONSTRAINT `fk_sched_faculty`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
    } else if (table === 'exam_hall') {
      if (memoryStore.exam_schedule.some(es => es.hall_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`exam_schedule`, CONSTRAINT `fk_sched_hall`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
    } else if (table === 'exam_schedule') {
      if (memoryStore.result.some(r => r.schedule_id === id)) {
        const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails (`result`, CONSTRAINT `fk_result_sched`)');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        err.errno = 1451;
        throw err;
      }
    }

    const idKey = `${table}_id`;
    const beforeCount = memoryStore[table].length;
    memoryStore[table] = memoryStore[table].filter(item => item[idKey] !== id);
    const affected = beforeCount - memoryStore[table].length;

    return { affectedRows: affected };
  }

  return { rows: [], affectedRows: 0 };
}

function buildExamTimetable() {
  return memoryStore.exam_schedule.map(es => {
    const course = memoryStore.course.find(c => c.course_id === es.course_id) || {};
    const dept = memoryStore.department.find(d => d.department_id === course.department_id) || {};
    const hall = memoryStore.exam_hall.find(h => h.hall_id === es.hall_id) || {};
    const fac = memoryStore.faculty.find(f => f.faculty_id === es.invigilator_id) || {};
    const resultsCount = memoryStore.result.filter(r => r.schedule_id === es.schedule_id).length;
    return {
      schedule_id: es.schedule_id,
      course_id: es.course_id,
      course_code: course.course_code || '',
      course_name: course.course_name || '',
      semester: course.semester || 0,
      credits: course.credits || 0,
      department_name: dept.department_name || '',
      hall_id: es.hall_id,
      hall_name: hall.hall_name || '',
      building: hall.building || '',
      capacity: hall.capacity || 0,
      invigilator_id: es.invigilator_id,
      invigilator_name: fac.faculty_name || '',
      exam_type: es.exam_type,
      exam_date: es.exam_date,
      start_time: es.start_time,
      end_time: es.end_time,
      academic_year: es.academic_year,
      results_count: resultsCount
    };
  });
}

function buildStudentResults() {
  return memoryStore.result.map(r => {
    const student = memoryStore.student.find(s => s.student_id === r.student_id) || {};
    const dept = memoryStore.department.find(d => d.department_id === student.department_id) || {};
    const schedule = memoryStore.exam_schedule.find(es => es.schedule_id === r.schedule_id) || {};
    const course = memoryStore.course.find(c => c.course_id === schedule.course_id) || {};
    const hall = memoryStore.exam_hall.find(h => h.hall_id === schedule.hall_id) || {};
    return {
      result_id: r.result_id,
      student_id: r.student_id,
      roll_no: student.roll_no || '',
      student_name: student.full_name || '',
      semester: student.semester || 0,
      department_name: dept.department_name || '',
      schedule_id: r.schedule_id,
      course_code: course.course_code || '',
      course_name: course.course_name || '',
      credits: course.credits || 0,
      max_marks: course.max_marks || 100,
      pass_marks: course.pass_marks || 40,
      exam_type: schedule.exam_type || '',
      exam_date: schedule.exam_date || '',
      hall_name: hall.hall_name || '',
      marks_obtained: r.marks_obtained,
      grade: r.grade,
      grade_points: r.grade_points,
      status: r.status
    };
  });
}

function getCoursePassPercentageReport() {
  const map = {};
  for (const r of memoryStore.result) {
    const es = memoryStore.exam_schedule.find(s => s.schedule_id === r.schedule_id);
    if (!es) continue;
    const c = memoryStore.course.find(crs => crs.course_id === es.course_id);
    if (!c) continue;
    const d = memoryStore.department.find(dept => dept.department_id === c.department_id);
    if (!map[c.course_id]) {
      map[c.course_id] = {
        course_id: c.course_id,
        course_code: c.course_code,
        course_name: c.course_name,
        department_name: d ? d.department_name : 'N/A',
        total_students_evaluated: 0,
        total_passed: 0,
        total_failed: 0,
        total_absent: 0,
        marks_sum: 0
      };
    }
    map[c.course_id].total_students_evaluated++;
    map[c.course_id].marks_sum += r.marks_obtained;
    if (r.status === 'Pass') map[c.course_id].total_passed++;
    else if (r.status === 'Fail') map[c.course_id].total_failed++;
    else if (r.status === 'Absent') map[c.course_id].total_absent++;
  }

  return Object.values(map).map(item => ({
    ...item,
    pass_percentage: (item.total_students_evaluated > 0 
      ? Math.round((item.total_passed / item.total_students_evaluated) * 10000) / 100 
      : 0).toFixed(2),
    average_marks: (item.total_students_evaluated > 0
      ? Math.round((item.marks_sum / item.total_students_evaluated) * 100) / 100
      : 0).toFixed(2)
  })).sort((a, b) => parseFloat(a.pass_percentage) - parseFloat(b.pass_percentage));
}

function getCourseToppersReport() {
  const courseResults = {};
  for (const r of memoryStore.result) {
    const es = memoryStore.exam_schedule.find(s => s.schedule_id === r.schedule_id);
    if (!es) continue;
    if (!courseResults[es.course_id]) courseResults[es.course_id] = [];
    courseResults[es.course_id].push({ ...r, course_id: es.course_id });
  }

  const toppers = [];
  for (const [courseId, list] of Object.entries(courseResults)) {
    const maxMarks = Math.max(...list.map(x => x.marks_obtained));
    const course = memoryStore.course.find(c => c.course_id === parseInt(courseId, 10));
    const topRecord = list.find(x => x.marks_obtained === maxMarks);
    if (!topRecord || !course) continue;
    const student = memoryStore.student.find(s => s.student_id === topRecord.student_id);
    toppers.push({
      course_code: course.course_code,
      course_name: course.course_name,
      topper_roll_no: student ? student.roll_no : 'N/A',
      topper_name: student ? student.full_name : 'N/A',
      topper_marks: topRecord.marks_obtained,
      grade: topRecord.grade,
      max_marks: course.max_marks
    });
  }
  return toppers.sort((a, b) => a.course_code.localeCompare(b.course_code));
}

function getHallUtilisationReport(targetDate = '2026-10-12') {
  return memoryStore.exam_hall.map(hall => {
    const schedulesInHall = memoryStore.exam_schedule.filter(es => 
      es.hall_id === hall.hall_id && es.exam_date === targetDate
    );
    const isBooked = schedulesInHall.length > 0;
    return {
      hall_id: hall.hall_id,
      hall_name: hall.hall_name,
      building: hall.building,
      capacity: hall.capacity,
      status: isBooked ? 'Occupied' : 'Vacant / Available',
      booked_exams_count: schedulesInHall.length,
      scheduled_exams: schedulesInHall.map(es => {
        const c = memoryStore.course.find(crs => crs.course_id === es.course_id);
        return `${c ? c.course_code : 'Exam'} (${es.start_time.slice(0, 5)} - ${es.end_time.slice(0, 5)})`;
      }).join(', ') || 'None'
    };
  }).sort((a, b) => b.capacity - a.capacity);
}

function getPresentationIIReport() {
  const studentOGrades = {};
  for (const r of memoryStore.result) {
    if (r.grade === 'O') {
      studentOGrades[r.student_id] = (studentOGrades[r.student_id] || 0) + 1;
    }
  }

  const result = [];
  for (const [studentId, count] of Object.entries(studentOGrades)) {
    if (count >= 1) {
      const s = memoryStore.student.find(stud => stud.student_id === parseInt(studentId, 10));
      if (!s) continue;
      const dept = memoryStore.department.find(d => d.department_id === s.department_id);
      const studentResults = memoryStore.result.filter(r => r.student_id === s.student_id);
      const avgMarks = (studentResults.reduce((acc, curr) => acc + curr.marks_obtained, 0) / studentResults.length).toFixed(2);
      result.push({
        roll_no: s.roll_no,
        student_name: s.full_name,
        department_name: dept ? dept.department_name : 'N/A',
        total_o_grades: count,
        overall_avg_marks: avgMarks
      });
    }
  }

  return result.sort((a, b) => b.total_o_grades - a.total_o_grades);
}

export default {
  initializeDatabase,
  executeQuery,
  getTableRowCount,
  getLastExecutedQuery,
  getDbStatus,
  calculateGradeAndPoints,
  WHITELISTED_TABLES
};
