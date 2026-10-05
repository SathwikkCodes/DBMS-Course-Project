-- =====================================================================
-- Examination Scheduling and Result Processing System
-- Database: exam_management_db   (MySQL 8.x)
-- Contents: DDL, sample data (60 students, 120 results), SELECT queries, views
-- Run:  mysql -u root -p < database/schema.sql
-- Author: Sathwik S | Roll No: 25WU0102249 | Section: AIML Whales
-- =====================================================================

DROP DATABASE IF EXISTS exam_management_db;
CREATE DATABASE exam_management_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE exam_management_db;

-- ---------------------------- DDL ------------------------------------
CREATE TABLE department (
  department_id   INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  hod_name        VARCHAR(80)
);

CREATE TABLE student (
  student_id    INT AUTO_INCREMENT PRIMARY KEY,
  roll_no       VARCHAR(20) NOT NULL UNIQUE,
  full_name     VARCHAR(80) NOT NULL,
  email         VARCHAR(100) UNIQUE,
  phone         VARCHAR(15),
  semester      TINYINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  department_id INT NOT NULL,
  CONSTRAINT fk_student_dept FOREIGN KEY (department_id)
    REFERENCES department(department_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE course (
  course_id     INT AUTO_INCREMENT PRIMARY KEY,
  course_code   VARCHAR(15) NOT NULL UNIQUE,
  course_name   VARCHAR(100) NOT NULL,
  credits       TINYINT NOT NULL CHECK (credits > 0),
  semester      TINYINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  max_marks     INT NOT NULL DEFAULT 100,
  pass_marks    INT NOT NULL DEFAULT 40,
  department_id INT NOT NULL,
  CONSTRAINT fk_course_dept FOREIGN KEY (department_id)
    REFERENCES department(department_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE faculty (
  faculty_id    INT AUTO_INCREMENT PRIMARY KEY,
  faculty_name  VARCHAR(80) NOT NULL,
  email         VARCHAR(100) UNIQUE,
  designation   VARCHAR(50),
  department_id INT NOT NULL,
  CONSTRAINT fk_faculty_dept FOREIGN KEY (department_id)
    REFERENCES department(department_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE exam_hall (
  hall_id   INT AUTO_INCREMENT PRIMARY KEY,
  hall_name VARCHAR(50) NOT NULL UNIQUE,
  building  VARCHAR(50),
  capacity  INT NOT NULL CHECK (capacity > 0)
);

CREATE TABLE exam_schedule (
  schedule_id    INT AUTO_INCREMENT PRIMARY KEY,
  course_id      INT NOT NULL,
  hall_id        INT NOT NULL,
  invigilator_id INT NOT NULL,
  exam_type      ENUM('Mid-Term','End-Term','Supplementary') NOT NULL,
  exam_date      DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  academic_year  VARCHAR(9) NOT NULL DEFAULT '2026-2027',
  CONSTRAINT chk_time CHECK (end_time > start_time),
  CONSTRAINT uq_hall_slot UNIQUE (hall_id, exam_date, start_time),
  CONSTRAINT fk_sched_course FOREIGN KEY (course_id)
    REFERENCES course(course_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_sched_hall FOREIGN KEY (hall_id)
    REFERENCES exam_hall(hall_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_sched_faculty FOREIGN KEY (invigilator_id)
    REFERENCES faculty(faculty_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Junction table: student M:N exam_schedule
CREATE TABLE result (
  result_id      INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  schedule_id    INT NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
  grade          VARCHAR(3) NOT NULL,
  grade_points   TINYINT NOT NULL,
  status         ENUM('Pass','Fail','Absent') NOT NULL,
  CONSTRAINT uq_student_exam UNIQUE (student_id, schedule_id),
  CONSTRAINT fk_result_student FOREIGN KEY (student_id)
    REFERENCES student(student_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_result_sched FOREIGN KEY (schedule_id)
    REFERENCES exam_schedule(schedule_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------- DML ------------------------------------

INSERT INTO department (department_name, hod_name) VALUES
('Computer Science and Engineering','Dr. Ramesh Iyer'),
('Artificial Intelligence and Machine Learning','Dr. Sunita Rao'),
('Electronics and Communication Engineering','Dr. Anil Deshmukh'),
('Mechanical Engineering','Dr. Vikram Sethi');

INSERT INTO faculty (faculty_name, email, designation, department_id) VALUES
('Dr. Meera Krishnan','meera.krishnan@college.edu','Professor',1),
('Prof. Rajesh Nair','rajesh.nair@college.edu','Associate Professor',1),
('Dr. Kavitha Reddy','kavitha.reddy@college.edu','Professor',2),
('Prof. Arjun Menon','arjun.menon@college.edu','Assistant Professor',2),
('Dr. Pooja Bhatt','pooja.bhatt@college.edu','Associate Professor',3),
('Prof. Sandeep Joshi','sandeep.joshi@college.edu','Assistant Professor',4);

INSERT INTO exam_hall (hall_name, building, capacity) VALUES
('Hall A101','Main Block',60),
('Hall A102','Main Block',60),
('Hall B201','Science Block',80),
('Hall B202','Science Block',80),
('Auditorium','Admin Block',150);

INSERT INTO course (course_code, course_name, credits, semester, max_marks, pass_marks, department_id) VALUES
('CS301','Data Structures',4,3,100,40,1),
('CS302','Database Management Systems',4,3,100,40,1),
('AI301','Machine Learning Fundamentals',4,3,100,40,2),
('AI302','Probability and Statistics for AI',3,3,100,40,2),
('EC301','Digital Electronics',4,3,100,40,3),
('EC302','Signals and Systems',3,3,100,40,3),
('ME301','Thermodynamics',4,3,100,40,4),
('ME302','Strength of Materials',3,3,100,40,4);

-- 60 students (15 per department, semester 3)
INSERT INTO student (roll_no, full_name, email, phone, semester, department_id) VALUES
('EX2401001','Tanvi Reddy','tanvi.reddy.1@student.college.edu','9635175209',3,1),
('EX2401002','Priya Rao','priya.rao.2@student.college.edu','9497422744',3,1),
('EX2401003','Pooja Verma','pooja.verma.3@student.college.edu','9203790621',3,1),
('EX2401004','Pooja Gupta','pooja.gupta.4@student.college.edu','9308935783',3,1),
('EX2401005','Lakshmi Kumar','lakshmi.kumar.5@student.college.edu','9902677112',3,1),
('EX2401006','Diya Iyer','diya.iyer.6@student.college.edu','9541641653',3,1),
('EX2401007','Ananya Kumar','ananya.kumar.7@student.college.edu','9257151433',3,1),
('EX2401008','Suresh Sharma','suresh.sharma.8@student.college.edu','9582534007',3,1),
('EX2401009','Lakshmi Joshi','lakshmi.joshi.9@student.college.edu','9115067335',3,1),
('EX2401010','Manish Kumar','manish.kumar.10@student.college.edu','9198965313',3,1),
('EX2401011','Shruti Reddy','shruti.reddy.11@student.college.edu','9100229748',3,1),
('EX2401012','Tanvi Naidu','tanvi.naidu.12@student.college.edu','9584504869',3,1),
('EX2401013','Arjun Gupta','arjun.gupta.13@student.college.edu','9723457447',3,1),
('EX2401014','Arjun Das','arjun.das.14@student.college.edu','9686897113',3,1),
('EX2401015','Swathi Singh','swathi.singh.15@student.college.edu','9998029442',3,1),
('EX2402001','Aditya Kumar','aditya.kumar.16@student.college.edu','9189190971',3,2),
('EX2402002','Harsh Das','harsh.das.17@student.college.edu','9755126092',3,2),
('EX2402003','Rahul Verma','rahul.verma.18@student.college.edu','9952304698',3,2),
('EX2402004','Meghana Naidu','meghana.naidu.19@student.college.edu','9313450963',3,2),
('EX2402005','Priya Verma','priya.verma.20@student.college.edu','9366113609',3,2),
('EX2402006','Manish Verma','manish.verma.21@student.college.edu','9229728319',3,2),
('EX2402007','Divya Singh','divya.singh.22@student.college.edu','9766873846',3,2),
('EX2402008','Arjun Iyer','arjun.iyer.23@student.college.edu','9147952316',3,2),
('EX2402009','Diya Joshi','diya.joshi.24@student.college.edu','9907298165',3,2),
('EX2402010','Karthik Das','karthik.das.25@student.college.edu','9686744735',3,2),
('EX2402011','Shruti Das','shruti.das.26@student.college.edu','9388338803',3,2),
('EX2402012','Rahul Sharma','rahul.sharma.27@student.college.edu','9817771848',3,2),
('EX2402013','Tanvi Singh','tanvi.singh.28@student.college.edu','9913532746',3,2),
('EX2402014','Suresh Rao','suresh.rao.29@student.college.edu','9782264666',3,2),
('EX2402015','Nikhil Gupta','nikhil.gupta.30@student.college.edu','9483594950',3,2),
('EX2403001','Lakshmi Gupta','lakshmi.gupta.31@student.college.edu','9266173260',3,3),
('EX2403002','Diya Das','diya.das.32@student.college.edu','9105509473',3,3),
('EX2403003','Aditya Rao','aditya.rao.33@student.college.edu','9436556570',3,3),
('EX2403004','Aarav Singh','aarav.singh.34@student.college.edu','9813588766',3,3),
('EX2403005','Karthik Sharma','karthik.sharma.35@student.college.edu','9726061744',3,3),
('EX2403006','Kavya Reddy','kavya.reddy.36@student.college.edu','9716632306',3,3),
('EX2403007','Diya Kumar','diya.kumar.37@student.college.edu','9926274195',3,3),
('EX2403008','Meghana Reddy','meghana.reddy.38@student.college.edu','9628269078',3,3),
('EX2403009','Sneha Das','sneha.das.39@student.college.edu','9840620525',3,3),
('EX2403010','Sneha Verma','sneha.verma.40@student.college.edu','9873601592',3,3),
('EX2403011','Pooja Reddy','pooja.reddy.41@student.college.edu','9244809748',3,3),
('EX2403012','Riya Rao','riya.rao.42@student.college.edu','9686052164',3,3),
('EX2403013','Sai Verma','sai.verma.43@student.college.edu','9339366764',3,3),
('EX2403014','Kavya Singh','kavya.singh.44@student.college.edu','9607862197',3,3),
('EX2403015','Riya Singh','riya.singh.45@student.college.edu','9731289885',3,3),
('EX2404001','Meghana Mehta','meghana.mehta.46@student.college.edu','9240892401',3,4),
('EX2404002','Priya Mehta','priya.mehta.47@student.college.edu','9742244082',3,4),
('EX2404003','Karthik Joshi','karthik.joshi.48@student.college.edu','9843616058',3,4),
('EX2404004','Priya Iyer','priya.iyer.49@student.college.edu','9641940465',3,4),
('EX2404005','Sai Mehta','sai.mehta.50@student.college.edu','9412115436',3,4),
('EX2404006','Nisha Verma','nisha.verma.51@student.college.edu','9190659470',3,4),
('EX2404007','Rohan Rao','rohan.rao.52@student.college.edu','9548586715',3,4),
('EX2404008','Nisha Joshi','nisha.joshi.53@student.college.edu','9817855328',3,4),
('EX2404009','Sai Das','sai.das.54@student.college.edu','9271929163',3,4),
('EX2404010','Riya Joshi','riya.joshi.55@student.college.edu','9245326801',3,4),
('EX2404011','Bhavana Gupta','bhavana.gupta.56@student.college.edu','9941210101',3,4),
('EX2404012','Vivaan Naidu','vivaan.naidu.57@student.college.edu','9940107553',3,4),
('EX2404013','Swathi Verma','swathi.verma.58@student.college.edu','9729244052',3,4),
('EX2404014','Ishaan Gupta','ishaan.gupta.59@student.college.edu','9428569647',3,4),
('EX2404015','Tanvi Rao','tanvi.rao.60@student.college.edu','9645140754',3,4);

-- Exam schedule: 8 Mid-Term exams (held in September) + 8 End-Term exams (upcoming, results not yet entered)
INSERT INTO exam_schedule (course_id, hall_id, invigilator_id, exam_type, exam_date, start_time, end_time, academic_year) VALUES
(1,1,1,'Mid-Term','2026-09-14','10:00:00','11:30:00','2026-2027'),
(2,2,2,'Mid-Term','2026-09-15','10:00:00','11:30:00','2026-2027'),
(3,3,3,'Mid-Term','2026-09-16','10:00:00','11:30:00','2026-2027'),
(4,4,4,'Mid-Term','2026-09-17','10:00:00','11:30:00','2026-2027'),
(5,5,5,'Mid-Term','2026-09-18','10:00:00','11:30:00','2026-2027'),
(6,1,6,'Mid-Term','2026-09-21','10:00:00','11:30:00','2026-2027'),
(7,2,1,'Mid-Term','2026-09-22','10:00:00','11:30:00','2026-2027'),
(8,3,2,'Mid-Term','2026-09-23','10:00:00','11:30:00','2026-2027'),
(1,3,4,'End-Term','2026-10-12','14:00:00','17:00:00','2026-2027'),
(2,4,5,'End-Term','2026-10-13','14:00:00','17:00:00','2026-2027'),
(3,5,6,'End-Term','2026-10-14','14:00:00','17:00:00','2026-2027'),
(4,1,1,'End-Term','2026-10-15','14:00:00','17:00:00','2026-2027'),
(5,2,2,'End-Term','2026-10-16','14:00:00','17:00:00','2026-2027'),
(6,3,3,'End-Term','2026-10-19','14:00:00','17:00:00','2026-2027'),
(7,4,4,'End-Term','2026-10-20','14:00:00','17:00:00','2026-2027'),
(8,5,5,'End-Term','2026-10-21','14:00:00','17:00:00','2026-2027');

-- Mid-Term results: 120 rows (each student appears for the 2 courses of their department)
INSERT INTO result (student_id, schedule_id, marks_obtained, grade, grade_points, status) VALUES
(1,1,72.9,'A',8,'Pass'),
(1,2,47.9,'C',5,'Pass'),
(2,1,0.0,'F',0,'Absent'),
(2,2,70.0,'A',8,'Pass'),
(3,1,62.6,'B+',7,'Pass'),
(3,2,66.4,'B+',7,'Pass'),
(4,1,62.4,'B+',7,'Pass'),
(4,2,61.3,'B+',7,'Pass'),
(5,1,79.4,'A',8,'Pass'),
(5,2,40.0,'C',5,'Pass'),
(6,1,53.4,'B',6,'Pass'),
(6,2,52.8,'B',6,'Pass'),
(7,1,71.9,'A',8,'Pass'),
(7,2,80.6,'A+',9,'Pass'),
(8,1,72.8,'A',8,'Pass'),
(8,2,85.3,'A+',9,'Pass'),
(9,1,71.6,'A',8,'Pass'),
(9,2,66.3,'B+',7,'Pass'),
(10,1,55.7,'B',6,'Pass'),
(10,2,79.5,'A',8,'Pass'),
(11,1,80.3,'A+',9,'Pass'),
(11,2,75.1,'A',8,'Pass'),
(12,1,63.5,'B+',7,'Pass'),
(12,2,51.2,'B',6,'Pass'),
(13,1,73.5,'A',8,'Pass'),
(13,2,59.0,'B',6,'Pass'),
(14,1,76.4,'A',8,'Pass'),
(14,2,50.5,'B',6,'Pass'),
(15,1,75.1,'A',8,'Pass'),
(15,2,86.8,'A+',9,'Pass'),
(16,3,85.6,'A+',9,'Pass'),
(16,4,72.7,'A',8,'Pass'),
(17,3,56.5,'B',6,'Pass'),
(17,4,56.0,'B',6,'Pass'),
(18,3,53.0,'B',6,'Pass'),
(18,4,46.4,'C',5,'Pass'),
(19,3,30.2,'F',0,'Fail'),
(19,4,46.7,'C',5,'Pass'),
(20,3,58.1,'B',6,'Pass'),
(20,4,61.7,'B+',7,'Pass'),
(21,3,46.1,'C',5,'Pass'),
(21,4,62.5,'B+',7,'Pass'),
(22,3,78.1,'A',8,'Pass'),
(22,4,62.6,'B+',7,'Pass'),
(23,3,100,'O',10,'Pass'),
(23,4,67.5,'B+',7,'Pass'),
(24,3,40.4,'C',5,'Pass'),
(24,4,53.1,'B',6,'Pass'),
(25,3,65.5,'B+',7,'Pass'),
(25,4,61.1,'B+',7,'Pass'),
(26,3,77.4,'A',8,'Pass'),
(26,4,88.2,'A+',9,'Pass'),
(27,3,49.4,'C',5,'Pass'),
(27,4,0.0,'F',0,'Absent'),
(28,3,74.1,'A',8,'Pass'),
(28,4,67.2,'B+',7,'Pass'),
(29,3,79.7,'A',8,'Pass'),
(29,4,60.2,'B+',7,'Pass'),
(30,3,53.5,'B',6,'Pass'),
(30,4,47.7,'C',5,'Pass'),
(31,5,69.8,'B+',7,'Pass'),
(31,6,83.4,'A+',9,'Pass'),
(32,5,53.6,'B',6,'Pass'),
(32,6,36.7,'F',0,'Fail'),
(33,5,36.3,'F',0,'Fail'),
(33,6,90.9,'O',10,'Pass'),
(34,5,62.8,'B+',7,'Pass'),
(34,6,67.4,'B+',7,'Pass'),
(35,5,93.7,'O',10,'Pass'),
(35,6,58.6,'B',6,'Pass'),
(36,5,51.5,'B',6,'Pass'),
(36,6,97.4,'O',10,'Pass'),
(37,5,42.3,'C',5,'Pass'),
(37,6,56.5,'B',6,'Pass'),
(38,5,72.1,'A',8,'Pass'),
(38,6,71.6,'A',8,'Pass'),
(39,5,63.8,'B+',7,'Pass'),
(39,6,62.8,'B+',7,'Pass'),
(40,5,57.2,'B',6,'Pass'),
(40,6,73.9,'A',8,'Pass'),
(41,5,80.1,'A+',9,'Pass'),
(41,6,80.2,'A+',9,'Pass'),
(42,5,59.5,'B',6,'Pass'),
(42,6,51.3,'B',6,'Pass'),
(43,5,78.7,'A',8,'Pass'),
(43,6,67.9,'B+',7,'Pass'),
(44,5,50.8,'B',6,'Pass'),
(44,6,100,'O',10,'Pass'),
(45,5,44.1,'C',5,'Pass'),
(45,6,58.4,'B',6,'Pass'),
(46,7,63.8,'B+',7,'Pass'),
(46,8,88.6,'A+',9,'Pass'),
(47,7,64.7,'B+',7,'Pass'),
(47,8,64.0,'B+',7,'Pass'),
(48,7,89.7,'A+',9,'Pass'),
(48,8,61.5,'B+',7,'Pass'),
(49,7,79.4,'A',8,'Pass'),
(49,8,57.0,'B',6,'Pass'),
(50,7,69.3,'B+',7,'Pass'),
(50,8,95.9,'O',10,'Pass'),
(51,7,51.6,'B',6,'Pass'),
(51,8,83.6,'A+',9,'Pass'),
(52,7,71.1,'A',8,'Pass'),
(52,8,45.5,'C',5,'Pass'),
(53,7,85.3,'A+',9,'Pass'),
(53,8,93.9,'O',10,'Pass'),
(54,7,78.7,'A',8,'Pass'),
(54,8,44.6,'C',5,'Pass'),
(55,7,79.3,'A',8,'Pass'),
(55,8,73.8,'A',8,'Pass'),
(56,7,62.1,'B+',7,'Pass'),
(56,8,0.0,'F',0,'Absent'),
(57,7,7.4,'F',0,'Fail'),
(57,8,47.9,'C',5,'Pass'),
(58,7,55.7,'B',6,'Pass'),
(58,8,84.8,'A+',9,'Pass'),
(59,7,61.6,'B+',7,'Pass'),
(59,8,59.2,'B',6,'Pass'),
(60,7,65.6,'B+',7,'Pass'),
(60,8,65.7,'B+',7,'Pass');

-- ---------------------------- VIEWS ----------------------------------
CREATE VIEW vw_exam_timetable AS
SELECT es.schedule_id, c.course_code, c.course_name, es.exam_type, es.exam_date,
       es.start_time, es.end_time, h.hall_name, f.faculty_name AS invigilator
FROM exam_schedule es
JOIN course c    ON es.course_id = c.course_id
JOIN exam_hall h ON es.hall_id = h.hall_id
JOIN faculty f   ON es.invigilator_id = f.faculty_id;

CREATE VIEW vw_student_results AS
SELECT r.result_id, s.roll_no, s.full_name, c.course_code, c.course_name, es.exam_type,
       r.marks_obtained, r.grade, r.grade_points, r.status
FROM result r
JOIN student s        ON r.student_id = s.student_id
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
JOIN course c         ON es.course_id = c.course_id;

-- ---------------------------- QUERIES --------------------------------
-- Q1: Students of semester 3 ordered by name (WHERE + ORDER BY)
SELECT roll_no, full_name, email FROM student WHERE semester = 3 ORDER BY full_name;

-- Q2: Students with their department (JOIN of 2 tables)
SELECT s.roll_no, s.full_name, d.department_name
FROM student s JOIN department d ON s.department_id = d.department_id;

-- Q3: Exam timetable (JOIN of 4 tables)
SELECT c.course_code, c.course_name, es.exam_type, es.exam_date, es.start_time,
       h.hall_name, f.faculty_name AS invigilator
FROM exam_schedule es
JOIN course c    ON es.course_id = c.course_id
JOIN exam_hall h ON es.hall_id = h.hall_id
JOIN faculty f   ON es.invigilator_id = f.faculty_id
ORDER BY es.exam_date, es.start_time;

-- Q4: Student result card (JOIN of 4 tables)
SELECT s.roll_no, s.full_name, c.course_code, r.marks_obtained, r.grade, r.status
FROM result r
JOIN student s        ON r.student_id = s.student_id
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
JOIN course c         ON es.course_id = c.course_id
WHERE s.roll_no = 'EX2401001';

-- Q5: Aggregates per course: COUNT, AVG, MAX, MIN, SUM
SELECT c.course_code, COUNT(*) AS appeared, ROUND(AVG(r.marks_obtained),2) AS avg_marks,
       MAX(r.marks_obtained) AS highest, MIN(r.marks_obtained) AS lowest,
       SUM(r.marks_obtained) AS total_marks
FROM result r
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
JOIN course c         ON es.course_id = c.course_id
GROUP BY c.course_id, c.course_code;

-- Q6: GROUP BY + HAVING: courses where the pass percentage is below 100
SELECT c.course_code, c.course_name,
       ROUND(100 * SUM(r.status = 'Pass') / COUNT(*), 2) AS pass_percentage
FROM result r
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
JOIN course c         ON es.course_id = c.course_id
GROUP BY c.course_id, c.course_code, c.course_name
HAVING pass_percentage < 100;

-- Q7: Subquery: students scoring above their course average
SELECT s.roll_no, s.full_name, c.course_code, r.marks_obtained
FROM result r
JOIN student s        ON r.student_id = s.student_id
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
JOIN course c         ON es.course_id = c.course_id
WHERE r.marks_obtained > (SELECT AVG(r2.marks_obtained)
                          FROM result r2
                          JOIN exam_schedule es2 ON r2.schedule_id = es2.schedule_id
                          WHERE es2.course_id = c.course_id)
ORDER BY c.course_code, r.marks_obtained DESC;

-- Q8: Topper of each course
SELECT c.course_code, s.full_name, r.marks_obtained
FROM result r
JOIN student s        ON r.student_id = s.student_id
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
JOIN course c         ON es.course_id = c.course_id
WHERE r.marks_obtained = (SELECT MAX(r2.marks_obtained)
                          FROM result r2
                          JOIN exam_schedule es2 ON r2.schedule_id = es2.schedule_id
                          WHERE es2.course_id = c.course_id);

-- Q9: LIKE: students whose name starts with 'A'
SELECT roll_no, full_name FROM student WHERE full_name LIKE 'A%';

-- Q10: IN: courses of two departments
SELECT course_code, course_name FROM course WHERE department_id IN (1, 2);

-- Q11: SGPA of each student = SUM(credits * grade_points) / SUM(credits)
SELECT s.roll_no, s.full_name,
       ROUND(SUM(c.credits * r.grade_points) / SUM(c.credits), 2) AS sgpa
FROM result r
JOIN student s        ON r.student_id = s.student_id
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
JOIN course c         ON es.course_id = c.course_id
GROUP BY s.student_id, s.roll_no, s.full_name
ORDER BY sgpa DESC;

-- Q12: Halls with no exam on a given date (LEFT JOIN ... IS NULL)
SELECT h.hall_name, h.capacity
FROM exam_hall h
LEFT JOIN exam_schedule es ON h.hall_id = es.hall_id AND es.exam_date = '2026-10-12'
WHERE es.schedule_id IS NULL;

-- Q13: Students with at least one failed or absent entry
SELECT DISTINCT s.roll_no, s.full_name
FROM student s JOIN result r ON s.student_id = r.student_id
WHERE r.status IN ('Fail','Absent');

-- Q14: Students per department (GROUP BY)
SELECT d.department_name, COUNT(s.student_id) AS total_students
FROM department d LEFT JOIN student s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name;

-- PRESENTATION-II QUERY
-- [PASTE THE QUERY QUESTION GIVEN TO YOU IN PRESENTATION-II HERE]
-- Retrieve the student name, roll number, department name, total number of 'O' grades achieved,
-- and overall average marks for all students who have secured an outstanding grade ('O')
-- in more than one examination during Academic Year 2026-2027.
SELECT 
    s.roll_no,
    s.full_name AS student_name,
    d.department_name,
    COUNT(CASE WHEN r.grade = 'O' THEN 1 END) AS total_o_grades,
    ROUND(AVG(r.marks_obtained), 2) AS overall_avg_marks
FROM student s
JOIN department d ON s.department_id = d.department_id
JOIN result r ON s.student_id = r.student_id
JOIN exam_schedule es ON r.schedule_id = es.schedule_id
WHERE es.academic_year = '2026-2027'
GROUP BY s.student_id, s.roll_no, s.full_name, d.department_name
HAVING total_o_grades > 1
ORDER BY total_o_grades DESC, overall_avg_marks DESC;
