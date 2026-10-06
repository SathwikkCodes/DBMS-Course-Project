from flask import Flask, render_template, request, redirect, url_for, flash
import mysql.connector

app = Flask(__name__)
app.secret_key = "exam-system-secret-key"

# =========================
# MYSQL CONFIGURATION
# =========================
DB_CONFIG = {
    "host": "localhost",
    "user": "flaskuser",
    "password": "Flask123",
    "database": "project"
}
def get_db():
    return mysql.connector.connect(**DB_CONFIG)


# =========================
# DASHBOARD
# =========================
@app.route("/")
def index():
    db = get_db()
    cur = db.cursor(dictionary=True)

    counts = {}
    for table in ["student", "course", "exam", "room", "scores"]:
        cur.execute(f"SELECT COUNT(*) AS count FROM {table}")
        counts[table] = cur.fetchone()["count"]

    cur.close()
    db.close()

    return render_template("index.html", counts=counts)


# =========================
# STUDENTS
# =========================
@app.route("/students")
def students():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM student ORDER BY Student_ID")
    rows = cur.fetchall()
    cur.close()
    db.close()
    return render_template("students.html", students=rows)


@app.route("/students/add", methods=["POST"])
def add_student():
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO student (First_Name, Last_Name, DOB, Major, Contact)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data["first_name"], data["last_name"], data["dob"],
            data["major"], data["contact"]
        ))
        db.commit()
        flash("Student added successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not add student: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("students"))


@app.route("/students/delete/<int:student_id>", methods=["POST"])
def delete_student(student_id):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM student WHERE Student_ID = %s", (student_id,))
        db.commit()
        flash("Student deleted successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not delete student: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("students"))


# =========================
# COURSES
# =========================
@app.route("/courses")
def courses():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM course ORDER BY Course_Code")
    rows = cur.fetchall()
    cur.close()
    db.close()
    return render_template("courses.html", courses=rows)


@app.route("/courses/add", methods=["POST"])
def add_course():
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO course
            (Course_Code, Course_Name, Department, Credits, Description)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data["course_code"], data["course_name"], data["department"],
            data["credits"], data["description"]
        ))
        db.commit()
        flash("Course added successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not add course: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("courses"))


@app.route("/courses/delete/<course_code>", methods=["POST"])
def delete_course(course_code):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM course WHERE Course_Code = %s", (course_code,))
        db.commit()
        flash("Course deleted successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not delete course: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("courses"))


# =========================
# EXAMS
# =========================
@app.route("/exams")
def exams():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("""
        SELECT e.*, c.Course_Name
        FROM exam e
        JOIN course c ON e.Course_Code = c.Course_Code
        ORDER BY e.Exam_ID
    """)
    rows = cur.fetchall()

    cur.execute("SELECT Course_Code, Course_Name FROM course ORDER BY Course_Code")
    courses_list = cur.fetchall()

    cur.close()
    db.close()
    return render_template("exams.html", exams=rows, courses=courses_list)


@app.route("/exams/add", methods=["POST"])
def add_exam():
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO exam
            (Course_Code, Exam_Name, Exam_Type, Max_Marks, Duration, Attempt)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data["course_code"], data["exam_name"], data["exam_type"],
            data["max_marks"], data["duration"], data["attempt"]
        ))
        db.commit()
        flash("Exam added successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not add exam: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("exams"))


# =========================
# ROOMS
# =========================
@app.route("/rooms")
def rooms():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM room ORDER BY Room_Number")
    rows = cur.fetchall()
    cur.close()
    db.close()
    return render_template("rooms.html", rooms=rows)


@app.route("/rooms/add", methods=["POST"])
def add_room():
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO room
            (Room_Number, Building_Name, Capacity, Floor, Status)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data["room_number"], data["building_name"], data["capacity"],
            data["floor"], data["status"]
        ))
        db.commit()
        flash("Room added successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not add room: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("rooms"))


# =========================
# SCHEDULE
# =========================
@app.route("/schedule")
def schedule():
    db = get_db()
    cur = db.cursor(dictionary=True)

    cur.execute("""
        SELECT s.*, e.Exam_Name, c.Course_Name, r.Building_Name
        FROM scheduled_in s
        JOIN exam e ON s.Exam_ID = e.Exam_ID
        JOIN course c ON e.Course_Code = c.Course_Code
        JOIN room r ON s.Room_Number = r.Room_Number
        ORDER BY s.Exam_Date, s.Start_Time
    """)
    schedules = cur.fetchall()

    cur.execute("SELECT Exam_ID, Exam_Name FROM exam ORDER BY Exam_ID")
    exams_list = cur.fetchall()

    cur.execute("SELECT Room_Number, Building_Name FROM room ORDER BY Room_Number")
    rooms_list = cur.fetchall()

    cur.close()
    db.close()

    return render_template(
        "schedule.html",
        schedules=schedules,
        exams=exams_list,
        rooms=rooms_list
    )


@app.route("/schedule/add", methods=["POST"])
def add_schedule():
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO scheduled_in
            (Exam_ID, Room_Number, Exam_Date, Start_Time, End_Time, Supervisor_ID)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data["exam_id"], data["room_number"], data["exam_date"],
            data["start_time"], data["end_time"], data["supervisor_id"]
        ))
        db.commit()
        flash("Exam scheduled successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not schedule exam: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("schedule"))



# =========================
# UPDATE ROUTES
# =========================
@app.route("/students/update/<int:student_id>", methods=["POST"])
def update_student(student_id):
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE student
            SET First_Name=%s, Last_Name=%s, DOB=%s, Major=%s, Contact=%s
            WHERE Student_ID=%s
        """, (
            data["first_name"], data["last_name"], data["dob"],
            data["major"], data["contact"], student_id
        ))
        db.commit()
        flash("Student updated successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not update student: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("students"))


@app.route("/courses/update/<course_code>", methods=["POST"])
def update_course(course_code):
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE course
            SET Course_Name=%s, Department=%s, Credits=%s, Description=%s
            WHERE Course_Code=%s
        """, (
            data["course_name"], data["department"], data["credits"],
            data["description"], course_code
        ))
        db.commit()
        flash("Course updated successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not update course: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("courses"))


@app.route("/exams/update/<int:exam_id>", methods=["POST"])
def update_exam(exam_id):
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE exam
            SET Course_Code=%s, Exam_Name=%s, Exam_Type=%s,
                Max_Marks=%s, Duration=%s, Attempt=%s
            WHERE Exam_ID=%s
        """, (
            data["course_code"], data["exam_name"], data["exam_type"],
            data["max_marks"], data["duration"], data["attempt"], exam_id
        ))
        db.commit()
        flash("Exam updated successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not update exam: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("exams"))


@app.route("/rooms/update/<room_number>", methods=["POST"])
def update_room(room_number):
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE room
            SET Building_Name=%s, Capacity=%s, Floor=%s, Status=%s
            WHERE Room_Number=%s
        """, (
            data["building_name"], data["capacity"], data["floor"],
            data["status"], room_number
        ))
        db.commit()
        flash("Room updated successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not update room: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("rooms"))


@app.route("/results/update/<int:student_id>/<int:exam_id>", methods=["POST"])
def update_result(student_id, exam_id):
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE scores
            SET Marks_Obtained=%s, Grade=%s, Remarks=%s, Date_Processed=%s
            WHERE Student_ID=%s AND Exam_ID=%s
        """, (
            data["marks_obtained"], data["grade"], data["remarks"],
            data["date_processed"], student_id, exam_id
        ))
        db.commit()
        flash("Result updated successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not update result: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("results"))


@app.route("/schedule/delete/<int:exam_id>/<room_number>", methods=["POST"])
def delete_schedule(exam_id, room_number):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            DELETE FROM scheduled_in
            WHERE Exam_ID=%s AND Room_Number=%s
        """, (exam_id, room_number))
        db.commit()
        flash("Schedule deleted successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not delete schedule: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("schedule"))


@app.route("/schedule/update/<int:exam_id>/<room_number>", methods=["POST"])
def update_schedule(exam_id, room_number):
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE scheduled_in
            SET Exam_Date=%s, Start_Time=%s, End_Time=%s, Supervisor_ID=%s
            WHERE Exam_ID=%s AND Room_Number=%s
        """, (
            data["exam_date"], data["start_time"], data["end_time"],
            data["supervisor_id"], exam_id, room_number
        ))
        db.commit()
        flash("Schedule updated successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not update schedule: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("schedule"))


@app.route("/exams/delete/<int:exam_id>", methods=["POST"])
def delete_exam(exam_id):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM exam WHERE Exam_ID=%s", (exam_id,))
        db.commit()
        flash("Exam deleted successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not delete exam: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("exams"))


@app.route("/rooms/delete/<room_number>", methods=["POST"])
def delete_room(room_number):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM room WHERE Room_Number=%s", (room_number,))
        db.commit()
        flash("Room deleted successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not delete room: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("rooms"))


@app.route("/results/delete/<int:student_id>/<int:exam_id>", methods=["POST"])
def delete_result(student_id, exam_id):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            DELETE FROM scores
            WHERE Student_ID=%s AND Exam_ID=%s
        """, (student_id, exam_id))
        db.commit()
        flash("Result deleted successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not delete result: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("results"))


# =========================
# RESULTS
# =========================
@app.route("/results")
def results():
    db = get_db()
    cur = db.cursor(dictionary=True)

    cur.execute("""
        SELECT sc.*, 
               CONCAT(st.First_Name, ' ', st.Last_Name) AS Student_Name,
               e.Exam_Name
        FROM scores sc
        JOIN student st ON sc.Student_ID = st.Student_ID
        JOIN exam e ON sc.Exam_ID = e.Exam_ID
        ORDER BY sc.Student_ID, sc.Exam_ID
    """)
    rows = cur.fetchall()

    cur.execute("""
        SELECT Student_ID, First_Name, Last_Name
        FROM student
        ORDER BY Student_ID
    """)
    students_list = cur.fetchall()

    cur.execute("SELECT Exam_ID, Exam_Name FROM exam ORDER BY Exam_ID")
    exams_list = cur.fetchall()

    cur.close()
    db.close()

    return render_template(
        "results.html",
        results=rows,
        students=students_list,
        exams=exams_list
    )


@app.route("/results/add", methods=["POST"])
def add_result():
    data = request.form
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO scores
            (Student_ID, Exam_ID, Marks_Obtained, Grade, Remarks, Date_Processed)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data["student_id"], data["exam_id"], data["marks_obtained"],
            data["grade"], data["remarks"], data["date_processed"]
        ))
        db.commit()
        flash("Result added successfully.", "success")
    except mysql.connector.Error as e:
        db.rollback()
        flash(f"Could not add result: {e}", "error")
    finally:
        cur.close()
        db.close()
    return redirect(url_for("results"))


if __name__ == "__main__":
    app.run(debug=True)
