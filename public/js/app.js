/**
 * Vanilla JavaScript Frontend Application
 * Examination Scheduling and Result Processing System
 * Author: Sathwik S | Roll No: 25WU0102249 | Section: AIML Whales
 */

// Application State
const AppState = {
  currentView: 'dashboard',
  currentTab: {
    departments: 'view',
    students: 'view',
    courses: 'view',
    faculty: 'view',
    halls: 'view',
    schedules: 'view',
    results: 'view'
  },
  reportsCurrentTab: 'timetable',
  tableData: {},
  tableSort: {},
  tableSearch: {},
  tablePagination: {},
  pendingDelete: null,
  operationSummary: null
};

// Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupLiveProofPolling();
  loadDbStatus();
  showView('dashboard');
});

// -------------------------------------------------------------
// Toast Notification Engine
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="flex: 1;">${escapeHtml(message)}</div>
    <button style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4500);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

// -------------------------------------------------------------
// Navigation & View Switching
// -------------------------------------------------------------
function setupNavigation() {
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      showView(targetView);
    });
  });
}

function showView(viewId) {
  AppState.currentView = viewId;

  // Update active state in sidebar
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-view') === viewId);
  });

  // Hide all sections, show target section
  document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.style.display = 'block';
  }

  // Clear previous operation summary banner when changing view
  AppState.operationSummary = null;

  // Load appropriate data
  if (viewId === 'dashboard') {
    loadDashboard();
  } else if (viewId === 'reports') {
    loadReportTab(AppState.reportsCurrentTab);
  } else if (viewId === 'explorer') {
    loadExplorerTables();
  } else {
    // Table modules: load dropdowns for add form and fetch records for view table
    loadDropdownsForEntity(viewId);
    loadEntityData(viewId);
  }

  updateLiveProof();
}

function switchTab(entity, tab) {
  AppState.currentTab[entity] = tab;
  const container = document.getElementById(`view-${entity}`);
  if (!container) return;

  // Update tab buttons
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });

  // Switch tab content
  const addPanel = container.querySelector('.tab-add-panel');
  const viewPanel = container.querySelector('.tab-view-panel');
  if (addPanel) addPanel.style.display = tab === 'add' ? 'block' : 'none';
  if (viewPanel) {
    viewPanel.style.display = tab === 'view' ? 'block' : 'none';
    if (tab === 'view') {
      loadEntityData(entity);
    }
  }
}

// -------------------------------------------------------------
// Live Database Proof & DB Status
// -------------------------------------------------------------
async function loadDbStatus() {
  try {
    const res = await fetch('/api/proof/last-query');
    const json = await res.json();
    if (json.success && json.data.dbStatus) {
      const status = json.data.dbStatus;
      const pill = document.getElementById('db-status-pill');
      if (pill) {
        if (status.isLiveMySQL) {
          pill.className = 'db-pill live';
          pill.innerHTML = `<span class="dot green"></span> MySQL 8.x Live (${status.database})`;
        } else {
          pill.className = 'db-pill sim';
          pill.innerHTML = `<span class="dot amber"></span> MySQL Engine (schema.sql Active)`;
        }
      }
    }
  } catch (e) {
    console.error('Error fetching DB status', e);
  }
}

function setupLiveProofPolling() {
  setInterval(updateLiveProof, 3000);
}

async function updateLiveProof() {
  try {
    const res = await fetch('/api/proof/last-query');
    const json = await res.json();
    if (json.success && json.data.query) {
      const q = json.data.query;
      const sqlEl = document.getElementById('proof-sql');
      const paramsEl = document.getElementById('proof-params');
      const timeEl = document.getElementById('proof-time');
      const rowsEl = document.getElementById('proof-rows');

      if (sqlEl) sqlEl.textContent = q.sql || 'SELECT 1';
      if (paramsEl) {
        paramsEl.textContent = q.params && q.params.length > 0 
          ? `Parameters: [${q.params.map(p => JSON.stringify(p)).join(', ')}]` 
          : 'Parameters: (None / Prepared)';
      }
      if (timeEl) timeEl.textContent = `${parseFloat(q.executionTimeMs || 0).toFixed(1)} ms`;
      if (rowsEl) rowsEl.textContent = q.rowCount !== undefined ? q.rowCount : q.affectedRows;
    }
  } catch (e) {
    // silent catch for background polling
  }
}

// Render "Rows before: X, Rows after: Y" banner
function renderOperationBanner(containerId, summary) {
  const container = document.getElementById(containerId);
  if (!container || !summary) return;

  const banner = document.createElement('div');
  banner.className = 'op-summary-badge';
  banner.innerHTML = `
    <div><strong>✓ Operation Confirmed:</strong> ${escapeHtml(summary.message)}</div>
    <div class="op-row-counter">
      <span>Rows before: <strong style="color:#0f172a;">${summary.rowsBefore}</strong></span>
      <span>→</span>
      <span>Rows after: <strong style="color:#166534;">${summary.rowsAfter}</strong></span>
    </div>
  `;
  container.prepend(banner);
  setTimeout(() => banner.remove(), 7000);
}

// -------------------------------------------------------------
// Dashboard Module
// -------------------------------------------------------------
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const { counts, aggregates, upcomingExams } = json.data;

    // Update counts
    document.getElementById('count-dept').textContent = counts.departments;
    document.getElementById('count-students').textContent = counts.students;
    document.getElementById('count-courses').textContent = counts.courses;
    document.getElementById('count-faculty').textContent = counts.faculty;
    document.getElementById('count-halls').textContent = counts.halls;
    document.getElementById('count-schedules').textContent = counts.schedules;
    document.getElementById('count-results').textContent = counts.results;

    // Update key metrics
    document.getElementById('metric-total-exams').textContent = aggregates.totalExamsScheduled;
    document.getElementById('metric-pass-pct').textContent = `${aggregates.overallPassPercentage}%`;
    document.getElementById('metric-avg-marks').textContent = aggregates.averageMarks;
    document.getElementById('metric-evaluated').textContent = aggregates.evaluatedResults;

    // Render upcoming exams table
    const upcomingContainer = document.getElementById('dashboard-upcoming-tbody');
    if (upcomingContainer) {
      if (!upcomingExams || upcomingExams.length === 0) {
        upcomingContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;">No upcoming exams scheduled.</td></tr>';
      } else {
        upcomingContainer.innerHTML = upcomingExams.map(ex => `
          <tr>
            <td><strong>${escapeHtml(ex.course_code)}</strong> - ${escapeHtml(ex.course_name)}</td>
            <td><span class="badge badge-info">${escapeHtml(ex.exam_type)}</span></td>
            <td>${escapeHtml(ex.exam_date)}</td>
            <td>${escapeHtml(ex.start_time.slice(0, 5))} - ${escapeHtml(ex.end_time.slice(0, 5))}</td>
            <td>${escapeHtml(ex.hall_name)}</td>
            <td>${escapeHtml(ex.invigilator_name)}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    showToast(`Failed to load dashboard: ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------
// Dropdown Population for Forms
// -------------------------------------------------------------
async function loadDropdownsForEntity(entity) {
  if (entity === 'students') {
    await populateSelect('/api/dropdowns/departments', 'student-dept-select', 'Choose Department...');
  } else if (entity === 'courses') {
    await populateSelect('/api/dropdowns/departments', 'course-dept-select', 'Choose Department...');
  } else if (entity === 'faculty') {
    await populateSelect('/api/dropdowns/departments', 'faculty-dept-select', 'Choose Department...');
  } else if (entity === 'schedules') {
    await Promise.all([
      populateSelect('/api/dropdowns/courses', 'schedule-course-select', 'Choose Course...'),
      populateSelect('/api/dropdowns/halls', 'schedule-hall-select', 'Choose Exam Hall...'),
      populateSelect('/api/dropdowns/faculty', 'schedule-faculty-select', 'Choose Invigilator...')
    ]);
  } else if (entity === 'results') {
    await Promise.all([
      populateSelect('/api/dropdowns/students', 'result-student-select', 'Choose Student...'),
      populateSelect('/api/dropdowns/schedules', 'result-schedule-select', 'Choose Exam Schedule...')
    ]);
  }
}

async function populateSelect(url, selectId, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      select.innerHTML = `<option value="">-- ${placeholder} --</option>` +
        json.data.map(opt => `<option value="${opt.id}">${escapeHtml(opt.name)}</option>`).join('');
    }
  } catch (err) {
    console.error(`Error populating select ${selectId}:`, err);
  }
}

// -------------------------------------------------------------
// Entity CRUD Operations
// -------------------------------------------------------------
async function loadEntityData(entity) {
  const tbody = document.getElementById(`${entity}-tbody`);
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:#64748b;">Loading records from MySQL...</td></tr>';

  try {
    const res = await fetch(`/api/${entity}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    AppState.tableData[entity] = json.data;
    renderEntityTable(entity);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#dc2626;padding:16px;">Failed to load data: ${escapeHtml(err.message)}</td></tr>`;
    showToast(err.message, 'error');
  }
}

function renderEntityTable(entity) {
  const tbody = document.getElementById(`${entity}-tbody`);
  if (!tbody) return;

  let records = AppState.tableData[entity] || [];

  // Search filtering
  const searchTerm = (AppState.tableSearch[entity] || '').toLowerCase().trim();
  if (searchTerm) {
    records = records.filter(row => 
      Object.values(row).some(val => val !== null && String(val).toLowerCase().includes(searchTerm))
    );
  }

  // Sorting
  const sortInfo = AppState.tableSort[entity];
  if (sortInfo && sortInfo.column) {
    records.sort((a, b) => {
      let valA = a[sortInfo.column];
      let valB = b[sortInfo.column];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortInfo.asc ? valA - valB : valB - valA;
      }
      return sortInfo.asc
        ? String(valA || '').localeCompare(String(valB || ''))
        : String(valB || '').localeCompare(String(valA || ''));
    });
  }

  // Pagination
  const pageSize = 10;
  const total = records.length;
  const currentPage = AppState.tablePagination[entity] || 1;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  AppState.tablePagination[entity] = safePage;

  const startIndex = (safePage - 1) * pageSize;
  const pageRecords = records.slice(startIndex, startIndex + pageSize);

  // Render Rows
  if (pageRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:#64748b;">No matching records found.</td></tr>';
  } else {
    tbody.innerHTML = pageRecords.map(item => generateRowHtml(entity, item)).join('');
  }

  // Render pagination controls
  renderPaginationControls(entity, safePage, totalPages, total);
}

function generateRowHtml(entity, item) {
  switch (entity) {
    case 'departments':
      return `
        <tr>
          <td>#${item.department_id}</td>
          <td><strong>${escapeHtml(item.department_name)}</strong></td>
          <td>${escapeHtml(item.hod_name)}</td>
          <td><span class="badge badge-info">${item.total_students || 0} students</span></td>
          <td><span class="badge badge-info">${item.total_courses || 0} courses</span></td>
          <td>
            <button class="btn btn-danger" onclick="confirmDelete('departments', ${item.department_id}, '${escapeHtml(item.department_name)}')">Delete</button>
          </td>
        </tr>
      `;
    case 'students':
      return `
        <tr>
          <td><strong>${escapeHtml(item.roll_no)}</strong></td>
          <td>${escapeHtml(item.full_name)}</td>
          <td>${escapeHtml(item.email)}</td>
          <td>Sem ${item.semester}</td>
          <td>${escapeHtml(item.department_name)}</td>
          <td>${escapeHtml(item.phone || '-')}</td>
          <td>
            <button class="btn btn-danger" onclick="confirmDelete('students', ${item.student_id}, '${escapeHtml(item.full_name)}')">Delete</button>
          </td>
        </tr>
      `;
    case 'courses':
      return `
        <tr>
          <td><strong>${escapeHtml(item.course_code)}</strong></td>
          <td>${escapeHtml(item.course_name)}</td>
          <td>${item.credits} Credits</td>
          <td>Sem ${item.semester}</td>
          <td>${item.pass_marks} / ${item.max_marks}</td>
          <td>${escapeHtml(item.department_name)}</td>
          <td>
            <button class="btn btn-danger" onclick="confirmDelete('courses', ${item.course_id}, '${escapeHtml(item.course_name)}')">Delete</button>
          </td>
        </tr>
      `;
    case 'faculty':
      return `
        <tr>
          <td>#${item.faculty_id}</td>
          <td><strong>${escapeHtml(item.faculty_name)}</strong></td>
          <td>${escapeHtml(item.email)}</td>
          <td>${escapeHtml(item.designation)}</td>
          <td>${escapeHtml(item.department_name)}</td>
          <td><span class="badge badge-info">${item.invigilation_count || 0} duties</span></td>
          <td>
            <button class="btn btn-danger" onclick="confirmDelete('faculty', ${item.faculty_id}, '${escapeHtml(item.faculty_name)}')">Delete</button>
          </td>
        </tr>
      `;
    case 'halls':
      return `
        <tr>
          <td>#${item.hall_id}</td>
          <td><strong>${escapeHtml(item.hall_name)}</strong></td>
          <td>${escapeHtml(item.building)}</td>
          <td><strong>${item.capacity} seats</strong></td>
          <td><span class="badge badge-info">${item.scheduled_exams_count || 0} exams scheduled</span></td>
          <td>
            <button class="btn btn-danger" onclick="confirmDelete('halls', ${item.hall_id}, '${escapeHtml(item.hall_name)}')">Delete</button>
          </td>
        </tr>
      `;
    case 'schedules':
      return `
        <tr>
          <td>#${item.schedule_id}</td>
          <td><strong>${escapeHtml(item.course_code)}</strong>: ${escapeHtml(item.course_name)}</td>
          <td><span class="badge badge-info">${escapeHtml(item.exam_type)}</span></td>
          <td>${escapeHtml(item.exam_date)}</td>
          <td>${escapeHtml(item.start_time.slice(0, 5))} - ${escapeHtml(item.end_time.slice(0, 5))}</td>
          <td>${escapeHtml(item.hall_name)}</td>
          <td>${escapeHtml(item.invigilator_name)}</td>
          <td>
            <button class="btn btn-danger" onclick="confirmDelete('schedules', ${item.schedule_id}, 'Exam on ${escapeHtml(item.exam_date)}')">Delete</button>
          </td>
        </tr>
      `;
    case 'results':
      const badgeCls = item.status === 'Pass' ? 'badge-success' : (item.status === 'Absent' ? 'badge-warning' : 'badge-danger');
      return `
        <tr>
          <td>#${item.result_id}</td>
          <td><strong>${escapeHtml(item.roll_no)}</strong> - ${escapeHtml(item.student_name)}</td>
          <td>${escapeHtml(item.course_code)}: ${escapeHtml(item.course_name)}</td>
          <td><strong>${item.marks_obtained}</strong> / ${item.max_marks}</td>
          <td><span class="badge badge-grade">${escapeHtml(item.grade)} (${item.grade_points} pts)</span></td>
          <td><span class="badge ${badgeCls}">${escapeHtml(item.status)}</span></td>
          <td>
            <button class="btn btn-danger" onclick="confirmDelete('results', ${item.result_id}, 'Result for ${escapeHtml(item.student_name)}')">Delete</button>
          </td>
        </tr>
      `;
    default:
      return '';
  }
}

function renderPaginationControls(entity, current, totalPages, totalCount) {
  const container = document.getElementById(`${entity}-pagination`);
  if (!container) return;

  container.innerHTML = `
    <div>Showing page <strong>${current}</strong> of <strong>${totalPages}</strong> (${totalCount} total entries)</div>
    <div class="page-controls">
      <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="changePage('${entity}', ${current - 1})">Prev</button>
      <button class="page-btn" ${current >= totalPages ? 'disabled' : ''} onclick="changePage('${entity}', ${current + 1})">Next</button>
    </div>
  `;
}

function changePage(entity, newPage) {
  AppState.tablePagination[entity] = newPage;
  renderEntityTable(entity);
}

function handleTableSearch(entity, value) {
  AppState.tableSearch[entity] = value;
  AppState.tablePagination[entity] = 1;
  renderEntityTable(entity);
}

function handleTableSort(entity, column) {
  const currentSort = AppState.tableSort[entity] || {};
  if (currentSort.column === column) {
    currentSort.asc = !currentSort.asc;
  } else {
    currentSort.column = column;
    currentSort.asc = true;
  }
  AppState.tableSort[entity] = currentSort;
  renderEntityTable(entity);
}

// -------------------------------------------------------------
// Form Submissions (INSERTION)
// -------------------------------------------------------------
async function handleFormSubmit(event, entity, endpoint) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message);
    }

    // Success response
    showToast(json.message, 'success');
    form.reset();

    // Store operation summary for Live Database Proof display
    if (json.data && json.data.rowsBefore !== undefined && json.data.rowsAfter !== undefined) {
      renderOperationBanner(`${entity}-view-banner`, {
        message: json.message,
        rowsBefore: json.data.rowsBefore,
        rowsAfter: json.data.rowsAfter
      });
    }

    // Switch to View tab and reload table
    switchTab(entity, 'view');
    updateLiveProof();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Record Deletion with Modal & FK Error Handling
// -------------------------------------------------------------
function confirmDelete(entity, id, label) {
  AppState.pendingDelete = { entity, id, label };
  const modal = document.getElementById('delete-modal');
  const msgEl = document.getElementById('delete-modal-msg');
  if (msgEl) {
    msgEl.innerHTML = `Are you sure you want to delete <strong>${escapeHtml(label)}</strong> (ID #${id})?<br><br>
    <small style="color:#64748b;">Note: If this record is referenced by other database tables, deletion will be blocked by MySQL foreign key constraints.</small>`;
  }
  if (modal) modal.classList.add('active');
}

function closeDeleteModal() {
  AppState.pendingDelete = null;
  const modal = document.getElementById('delete-modal');
  if (modal) modal.classList.remove('active');
}

async function executeDelete() {
  if (!AppState.pendingDelete) return;
  const { entity, id, label } = AppState.pendingDelete;
  closeDeleteModal();

  try {
    const res = await fetch(`/api/${entity}/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message);
    }

    showToast(json.message, 'success');

    // Display operation banner (before/after row counts)
    if (json.data && json.data.rowsBefore !== undefined && json.data.rowsAfter !== undefined) {
      renderOperationBanner(`${entity}-view-banner`, {
        message: json.message,
        rowsBefore: json.data.rowsBefore,
        rowsAfter: json.data.rowsAfter
      });
    }

    // Reload table
    loadEntityData(entity);
    updateLiveProof();
  } catch (err) {
    // Shows user-friendly FK error message (e.g. "Cannot delete: this record is referenced...")
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Reports Module
// -------------------------------------------------------------
function switchReportTab(reportName) {
  AppState.reportsCurrentTab = reportName;
  document.querySelectorAll('.report-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-report') === reportName);
  });
  loadReportTab(reportName);
}

async function loadReportTab(reportName) {
  const container = document.getElementById('report-output-container');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b;">Executing SQL Query for report...</div>';

  try {
    let url = `/api/reports/${reportName}`;
    if (reportName === 'hall-utilisation') {
      const dateVal = document.getElementById('report-hall-date')?.value || '2026-10-12';
      url += `?date=${encodeURIComponent(dateVal)}`;
    } else if (reportName === 'student-card') {
      const studentId = document.getElementById('report-student-select')?.value || '';
      if (studentId) url += `?student_id=${encodeURIComponent(studentId)}`;
    }

    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    renderReportOutput(reportName, json.data);
    updateLiveProof();
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;padding:20px;text-align:center;">Report generation failed: ${escapeHtml(err.message)}</div>`;
    showToast(err.message, 'error');
  }
}

function renderReportOutput(reportName, data) {
  const container = document.getElementById('report-output-container');
  if (!container) return;

  if (reportName === 'timetable') {
    container.innerHTML = `
      <div class="card-title">
        <span>Master Examination Timetable</span>
        <span class="badge badge-info">${data.length} Exams Scheduled</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Course</th>
              <th>Dept & Sem</th>
              <th>Hall & Bldg</th>
              <th>Invigilator</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td><strong>${escapeHtml(r.exam_date)}</strong> (${escapeHtml(r.exam_type)})</td>
                <td>${escapeHtml(r.start_time.slice(0, 5))} - ${escapeHtml(r.end_time.slice(0, 5))}</td>
                <td><strong>${escapeHtml(r.course_code)}</strong>: ${escapeHtml(r.course_name)}</td>
                <td>${escapeHtml(r.department_name)} (Sem ${r.semester})</td>
                <td>${escapeHtml(r.hall_name)} (${escapeHtml(r.building)})</td>
                <td>${escapeHtml(r.invigilator_name)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (reportName === 'student-card') {
    if (data.student) {
      // Individual transcript
      container.innerHTML = `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="font-size:18px;color:#1e3a8a;">${escapeHtml(data.student.full_name)}</h3>
            <p style="font-size:13px;color:#64748b;">Roll No: <strong>${escapeHtml(data.student.roll_no)}</strong> | Dept: ${escapeHtml(data.student.department_name)} | Semester: ${data.student.semester}</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;text-transform:uppercase;color:#64748b;font-weight:600;">Calculated SGPA</div>
            <div style="font-size:28px;font-weight:800;color:#047857;">${data.summary.sgpa}</div>
            <div style="font-size:11.5px;color:#64748b;">Credits: ${data.summary.creditsEarned} / ${data.summary.totalCredits}</div>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Credits</th>
                <th>Marks</th>
                <th>Grade</th>
                <th>Grade Points</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.courses.map(c => `
                <tr>
                  <td><strong>${escapeHtml(c.course_code)}</strong></td>
                  <td>${escapeHtml(c.course_name)}</td>
                  <td>${c.credits}</td>
                  <td>${c.marks_obtained} / ${c.max_marks}</td>
                  <td><span class="badge badge-grade">${escapeHtml(c.grade)}</span></td>
                  <td>${c.grade_points}</td>
                  <td><span class="badge ${c.status === 'Pass' ? 'badge-success' : 'badge-danger'}">${escapeHtml(c.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Summary table of all students
      container.innerHTML = `
        <div class="card-title">All Students SGPA & Performance Ranking</div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Department</th>
                <th>Credits Earned</th>
                <th>Total Weighted Pts</th>
                <th>SGPA</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((s, idx) => `
                <tr>
                  <td>#${idx + 1}</td>
                  <td><strong>${escapeHtml(s.roll_no)}</strong></td>
                  <td>${escapeHtml(s.full_name)} (Sem ${s.semester})</td>
                  <td>${escapeHtml(s.department_name)}</td>
                  <td>${s.credits_earned} / ${s.total_credits_registered}</td>
                  <td>${s.total_weighted_points}</td>
                  <td><strong style="color:#047857;font-size:14px;">${s.sgpa}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } else if (reportName === 'pass-percentage') {
    container.innerHTML = `
      <div class="card-title">Course-wise Pass Percentage Analysis</div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Department</th>
              <th>Evaluated</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Absent</th>
              <th>Pass %</th>
              <th>Average Marks</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(c => {
              const passPct = parseFloat(c.pass_percentage);
              const color = passPct >= 80 ? '#059669' : (passPct >= 50 ? '#d97706' : '#dc2626');
              return `
                <tr>
                  <td><strong>${escapeHtml(c.course_code)}</strong></td>
                  <td>${escapeHtml(c.course_name)}</td>
                  <td>${escapeHtml(c.department_name)}</td>
                  <td>${c.total_students_evaluated}</td>
                  <td><span class="badge badge-success">${c.total_passed}</span></td>
                  <td><span class="badge badge-danger">${c.total_failed}</span></td>
                  <td><span class="badge badge-warning">${c.total_absent}</span></td>
                  <td><strong style="color:${color};font-size:14px;">${c.pass_percentage}%</strong></td>
                  <td>${c.average_marks}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (reportName === 'toppers') {
    container.innerHTML = `
      <div class="card-title">Course Subject Toppers</div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Topper Roll No</th>
              <th>Topper Student Name</th>
              <th>Highest Marks</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(t => `
              <tr>
                <td><strong>${escapeHtml(t.course_code)}</strong></td>
                <td>${escapeHtml(t.course_name)}</td>
                <td><span class="badge badge-info">${escapeHtml(t.topper_roll_no)}</span></td>
                <td><strong>${escapeHtml(t.topper_name)}</strong></td>
                <td><strong style="color:#047857;font-size:14px;">${t.topper_marks}</strong> / ${t.max_marks || 100}</td>
                <td><span class="badge badge-grade">${escapeHtml(t.grade)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (reportName === 'hall-utilisation') {
    container.innerHTML = `
      <div class="card-title">Exam Hall Occupancy & Vacancy Status</div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Hall Name</th>
              <th>Building</th>
              <th>Seating Capacity</th>
              <th>Status</th>
              <th>Exams Scheduled on Target Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(h => `
              <tr>
                <td><strong>${escapeHtml(h.hall_name)}</strong></td>
                <td>${escapeHtml(h.building)}</td>
                <td>${h.capacity} seats</td>
                <td>
                  <span class="badge ${h.status === 'Occupied' ? 'badge-danger' : 'badge-success'}">
                    ${escapeHtml(h.status)}
                  </span>
                </td>
                <td>${escapeHtml(h.scheduled_exams || 'None')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (reportName === 'presentation-ii') {
    container.innerHTML = `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin-bottom:16px;">
        <strong style="color:#1e40af;">Presentation-II Query Question:</strong>
        <p style="font-size:13px;color:#1e3a8a;margin-top:4px;">
          "Retrieve the student name, roll number, department name, total number of 'O' grades achieved, and overall average marks for all students who have secured an outstanding grade ('O') in more than one examination during Academic Year 2026-2027."
        </p>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Student Name</th>
              <th>Department</th>
              <th>Total 'O' Grades</th>
              <th>Overall Average Marks</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                <td><strong>${escapeHtml(row.roll_no)}</strong></td>
                <td>${escapeHtml(row.student_name)}</td>
                <td>${escapeHtml(row.department_name)}</td>
                <td><span class="badge badge-success" style="font-size:13px;">${row.total_o_grades} 'O' Grades</span></td>
                <td><strong>${row.overall_avg_marks}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// -------------------------------------------------------------
// Database Explorer Module
// -------------------------------------------------------------
async function loadExplorerTables() {
  const select = document.getElementById('explorer-table-select');
  if (!select) return;

  try {
    const res = await fetch('/api/explorer/tables');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      select.innerHTML = json.data.map(tbl => `<option value="${tbl}">TABLE / VIEW: ${tbl}</option>`).join('');
      // Auto-load first table
      if (json.data.length > 0) {
        inspectTable(json.data[0]);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function inspectTable(tableName) {
  const container = document.getElementById('explorer-table-output');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:24px;color:#64748b;">Executing SELECT * FROM `' + escapeHtml(tableName) + '`...</div>';

  try {
    const res = await fetch(`/api/explorer/${encodeURIComponent(tableName)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const { columns, rows, totalRows } = json.data;

    if (rows.length === 0) {
      container.innerHTML = `<div style="padding:20px;text-align:center;color:#64748b;">Table <strong>${escapeHtml(tableName)}</strong> is currently empty (0 rows).</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:13px;color:#64748b;">SQL: <code style="color:#0369a1;background:#f0f9ff;padding:2px 6px;border-radius:4px;">SELECT * FROM \`${escapeHtml(tableName)}\`</code></span>
        <span class="badge badge-info">${totalRows} Total Rows in Database</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                ${columns.map(c => `<td>${escapeHtml(r[c] !== null && r[c] !== undefined ? String(r[c]) : 'NULL')}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    updateLiveProof();
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;padding:16px;">Failed to inspect table: ${escapeHtml(err.message)}</div>`;
    showToast(err.message, 'error');
  }
}

// Global Exports
window.showView = showView;
window.switchTab = switchTab;
window.handleFormSubmit = handleFormSubmit;
window.confirmDelete = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
window.executeDelete = executeDelete;
window.handleTableSearch = handleTableSearch;
window.handleTableSort = handleTableSort;
window.changePage = changePage;
window.switchReportTab = switchReportTab;
window.loadReportTab = loadReportTab;
window.inspectTable = inspectTable;
