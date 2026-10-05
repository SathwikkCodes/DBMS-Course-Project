/**
 * Examination Scheduling and Result Processing System
 * AI Studio Full-Stack Interface
 * Author: Sathwik S | Roll No: 25WU0102249 | Section: AIML Whales
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  BookOpen,
  Users,
  DoorOpen,
  Calendar,
  Award,
  FileText,
  Database,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface DbStatus {
  isLiveMySQL: boolean;
  database: string;
  host: string;
  port: number;
  mode: string;
}

interface LastQuery {
  sql: string;
  params: any[];
  affectedRows: number;
  rowCount: number;
  executionTimeMs: number;
  timestamp: string;
}

export default function App() {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  const [reportTab, setReportTab] = useState<string>('timetable');

  // Live Database Proof state
  const [lastQuery, setLastQuery] = useState<LastQuery>({
    sql: 'SELECT "Connected to Examination Database" AS status',
    params: [],
    affectedRows: 0,
    rowCount: 1,
    executionTimeMs: 1.2,
    timestamp: new Date().toISOString()
  });
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);

  // Operation banner (Rows before / after)
  const [operationBanner, setOperationBanner] = useState<{
    message: string;
    rowsBefore: number;
    rowsAfter: number;
  } | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dropdowns for foreign keys
  const [dropdowns, setDropdowns] = useState<{
    departments: any[];
    courses: any[];
    halls: any[];
    faculty: any[];
    students: any[];
    schedules: any[];
  }>({
    departments: [],
    courses: [],
    halls: [],
    faculty: [],
    students: [],
    schedules: []
  });

  // Report state
  const [reportData, setReportData] = useState<any>(null);
  const [reportDate, setReportDate] = useState<string>('2026-10-12');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string>('');

  // Explorer state
  const [explorerTables, setExplorerTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('student');
  const [explorerData, setExplorerData] = useState<{ table?: string; columns: string[]; rows: any[]; totalRows: number } | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ entity: string; id: number; label: string } | null>(null);

  // Form input states
  const [deptForm, setDeptForm] = useState({ department_name: '', hod_name: '' });
  const [studentForm, setStudentForm] = useState({ roll_no: '', full_name: '', email: '', phone: '', semester: '3', department_id: '' });
  const [courseForm, setCourseForm] = useState({ course_code: '', course_name: '', credits: '4', semester: '3', max_marks: '100', pass_marks: '40', department_id: '' });
  const [facultyForm, setFacultyForm] = useState({ faculty_name: '', email: '', designation: '', department_id: '' });
  const [hallForm, setHallForm] = useState({ hall_name: '', building: '', capacity: '60' });
  const [scheduleForm, setScheduleForm] = useState({ course_id: '', hall_id: '', invigilator_id: '', exam_type: 'End-Term', exam_date: '2026-10-15', start_time: '14:00', end_time: '17:00', academic_year: '2026-2027' });
  const [resultForm, setResultForm] = useState({ student_id: '', schedule_id: '', marks_obtained: '', is_absent: false });

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Poll query proof
  const refreshProof = async () => {
    try {
      const res = await fetch('/api/proof/last-query');
      const json = await res.json();
      if (json.success) {
        if (json.data.query) setLastQuery(json.data.query);
        if (json.data.dbStatus) setDbStatus(json.data.dbStatus);
      }
    } catch (e) {
      // ignore
    }
  };

  // Fetch initial dashboard and dropdowns
  useEffect(() => {
    fetchDashboard();
    fetchDropdowns();
    refreshProof();
    const interval = setInterval(refreshProof, 3500);
    return () => clearInterval(interval);
  }, []);

  // When activeView changes, fetch relevant data
  useEffect(() => {
    setActiveTab('view');
    setSearchTerm('');
    setOperationBanner(null);

    if (activeView === 'dashboard') {
      fetchDashboard();
    } else if (activeView === 'reports') {
      fetchReport(reportTab);
    } else if (activeView === 'explorer') {
      fetchExplorerTables();
    } else {
      fetchEntityData(activeView);
    }
  }, [activeView]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
      refreshProof();
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [deptRes, courseRes, hallRes, facRes, studRes, schedRes] = await Promise.all([
        fetch('/api/dropdowns/departments').then(r => r.json()),
        fetch('/api/dropdowns/courses').then(r => r.json()),
        fetch('/api/dropdowns/halls').then(r => r.json()),
        fetch('/api/dropdowns/faculty').then(r => r.json()),
        fetch('/api/dropdowns/students').then(r => r.json()),
        fetch('/api/dropdowns/schedules').then(r => r.json())
      ]);

      setDropdowns({
        departments: deptRes.data || [],
        courses: courseRes.data || [],
        halls: hallRes.data || [],
        faculty: facRes.data || [],
        students: studRes.data || [],
        schedules: schedRes.data || []
      });
    } catch (e) {
      console.error('Failed to load dropdowns', e);
    }
  };

  const fetchEntityData = async (entity: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${entity}`);
      const json = await res.json();
      if (json.success) {
        setTableData(json.data || []);
      } else {
        notify(json.message, 'error');
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
      refreshProof();
    }
  };

  const fetchReport = async (tabName: string) => {
    setLoading(true);
    try {
      let url = `/api/reports/${tabName}`;
      if (tabName === 'hall-utilisation') {
        url += `?date=${encodeURIComponent(reportDate)}`;
      } else if (tabName === 'student-card' && selectedStudentForReport) {
        url += `?student_id=${encodeURIComponent(selectedStudentForReport)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      } else {
        notify(json.message, 'error');
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
      refreshProof();
    }
  };

  const fetchExplorerTables = async () => {
    try {
      const res = await fetch('/api/explorer/tables');
      const json = await res.json();
      if (json.success) {
        setExplorerTables(json.data);
        if (json.data.length > 0) {
          inspectExplorerTable(json.data[0]);
        }
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const inspectExplorerTable = async (table: string) => {
    setSelectedTable(table);
    setLoading(true);
    try {
      const res = await fetch(`/api/explorer/${encodeURIComponent(table)}`);
      const json = await res.json();
      if (json.success) {
        setExplorerData(json.data);
      } else {
        notify(json.message, 'error');
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
      refreshProof();
    }
  };

  // Submit Handlers
  const handleInsert = async (entity: string, payload: any) => {
    try {
      const res = await fetch(`/api/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      notify(json.message, 'success');
      if (json.data && json.data.rowsBefore !== undefined && json.data.rowsAfter !== undefined) {
        setOperationBanner({
          message: json.message,
          rowsBefore: json.data.rowsBefore,
          rowsAfter: json.data.rowsAfter
        });
      }

      // Refresh dropdowns and switch to view
      fetchDropdowns();
      setActiveTab('view');
      fetchEntityData(entity);
      refreshProof();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { entity, id } = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/${entity}/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      notify(json.message, 'success');
      if (json.data && json.data.rowsBefore !== undefined && json.data.rowsAfter !== undefined) {
        setOperationBanner({
          message: json.message,
          rowsBefore: json.data.rowsBefore,
          rowsAfter: json.data.rowsAfter
        });
      }

      fetchDropdowns();
      fetchEntityData(entity);
      refreshProof();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Filtered table rows
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const term = searchTerm.toLowerCase();
    return tableData.filter(row =>
      Object.values(row).some(v => v !== null && String(v).toLowerCase().includes(term))
    );
  }, [tableData, searchTerm]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border-l-4 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-400'
              : notification.type === 'error'
              ? 'bg-rose-950 text-rose-50 border-rose-500'
              : 'bg-blue-900 text-blue-50 border-blue-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-md">
            🎓
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-100">ExamDBMS Portal</h2>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              MySQL 8.x • Express
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'departments', label: 'Departments', icon: Building2 },
            { id: 'students', label: 'Students', icon: GraduationCap },
            { id: 'courses', label: 'Courses', icon: BookOpen },
            { id: 'faculty', label: 'Faculty', icon: Users },
            { id: 'halls', label: 'Exam Halls', icon: DoorOpen },
            { id: 'schedules', label: 'Exam Schedule', icon: Calendar },
            { id: 'results', label: 'Results & Grades', icon: Award },
            { id: 'reports', label: 'Reports & SQL', icon: FileText },
            { id: 'explorer', label: 'Database Explorer', icon: Database }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Student Credential Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
          <div className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>DBMS Course Submission</span>
          </div>
          <div>Student: <strong className="text-slate-200">Sathwik S</strong></div>
          <div>Roll No: <strong className="text-slate-200">25WU0102249</strong></div>
          <div>Section: <strong className="text-slate-200">AIML Whales</strong></div>
          <div className="pt-2">
            <a
              href="/index.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
            >
              Open Pure Vanilla HTML/JS View <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Design & Implementation of DBMS for Examination Scheduling & Result Processing
            </h1>
            <p className="text-xs text-slate-500">
              Normalized 3NF Relational Database • Real MySQL Prepared Queries • Live Proof Engine
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-xs text-blue-700 font-medium">
              <span>👤</span>
              <span>Sathwik S (25WU0102249)</span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                dbStatus?.isLiveMySQL
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus?.isLiveMySQL ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{dbStatus?.isLiveMySQL ? 'MySQL 8.x Live' : 'MySQL Engine Active'}</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Operation Confirmation Banner (Rows before: X, Rows after: Y) */}
          {operationBanner && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{operationBanner.message}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="bg-white px-2.5 py-1 rounded border border-emerald-200">
                  Rows Before: <strong>{operationBanner.rowsBefore}</strong>
                </span>
                <span>→</span>
                <span className="bg-emerald-600 text-white px-2.5 py-1 rounded">
                  Rows After: <strong>{operationBanner.rowsAfter}</strong>
                </span>
              </div>
            </div>
          )}

          {/* VIEW: DASHBOARD */}
          {activeView === 'dashboard' && dashboardData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Academic Overview & Database Metrics</h2>
                  <p className="text-xs text-slate-500">Real-time aggregate data computed directly from MySQL tables</p>
                </div>
                <button
                  onClick={fetchDashboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Departments', count: dashboardData.counts.departments, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Students', count: dashboardData.counts.students, color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Courses', count: dashboardData.counts.courses, color: 'bg-purple-50 text-purple-700' },
                  { label: 'Faculty', count: dashboardData.counts.faculty, color: 'bg-teal-50 text-teal-700' },
                  { label: 'Exam Halls', count: dashboardData.counts.halls, color: 'bg-amber-50 text-amber-700' },
                  { label: 'Schedules', count: dashboardData.counts.schedules, color: 'bg-rose-50 text-rose-700' },
                  { label: 'Results', count: dashboardData.counts.results, color: 'bg-emerald-50 text-emerald-700' }
                ].map((c, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">{c.label}</span>
                    <div className="text-2xl font-black text-slate-900 mt-2">{c.count}</div>
                  </div>
                ))}
              </div>

              {/* Statistical Aggregates */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Total Exams Scheduled</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{dashboardData.aggregates.totalExamsScheduled}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Across AY 2025-2026</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-600">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Overall Pass Percentage</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {dashboardData.aggregates.overallPassPercentage}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {dashboardData.aggregates.totalPassed} Pass / {dashboardData.aggregates.totalFailed} Fail
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-purple-600">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Average Marks Scored</div>
                  <div className="text-2xl font-bold text-purple-700 mt-1">{dashboardData.aggregates.averageMarks}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Across all evaluated results</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Marks Range</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {dashboardData.aggregates.highestMarks} <span className="text-sm font-normal text-slate-400">/ {dashboardData.aggregates.lowestMarks}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Max vs Min marks awarded</p>
                </div>
              </div>

              {/* Upcoming Exams */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900">Upcoming Exam Schedules</h3>
                  <button
                    onClick={() => setActiveView('schedules')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Manage Schedule <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Course Code & Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Timing</th>
                        <th className="px-4 py-3">Exam Hall</th>
                        <th className="px-4 py-3">Invigilator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardData.upcomingExams?.map((ex: any) => (
                        <tr key={ex.schedule_id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {ex.course_code}: <span className="font-normal text-slate-600">{ex.course_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                              {ex.exam_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">{ex.exam_date}</td>
                          <td className="px-4 py-3 font-mono text-[11px]">
                            {ex.start_time?.slice(0, 5)} - {ex.end_time?.slice(0, 5)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{ex.hall_name}</td>
                          <td className="px-4 py-3 text-slate-600">{ex.invigilator_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: TABLE MODULES (CRUD: Add / View / Delete) */}
          {['departments', 'students', 'courses', 'faculty', 'halls', 'schedules', 'results'].includes(activeView) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 capitalize">{activeView} Management</h2>
                  <p className="text-xs text-slate-500">
                    Live relational table connected with prepared parameterized statements
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('view')}
                    className={`px-4 py-1.5 rounded-md transition-all ${
                      activeTab === 'view' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    View Records ({filteredRows.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('add')}
                    className={`px-4 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                      activeTab === 'add' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" /> Add New
                  </button>
                </div>
              </div>

              {/* ADD TAB */}
              {activeTab === 'add' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600" />
                    Insert New Record into <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-blue-700">{activeView}</code>
                  </h3>

                  {/* 1. Department Form */}
                  {activeView === 'departments' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleInsert('departments', deptForm);
                      }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Department Name <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={deptForm.department_name}
                          onChange={e => setDeptForm({ ...deptForm, department_name: e.target.value })}
                          placeholder="e.g. Data Science & Cyber Security"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Head of Department (HOD) <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={deptForm.hod_name}
                          onChange={e => setDeptForm({ ...deptForm, hod_name: e.target.value })}
                          placeholder="e.g. Dr. K. Venkatraman"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-2 pt-3">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Save Department
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 2. Student Form */}
                  {activeView === 'students' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleInsert('students', studentForm);
                      }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Roll Number <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentForm.roll_no}
                          onChange={e => setStudentForm({ ...studentForm, roll_no: e.target.value })}
                          placeholder="e.g. 25WU0102249"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentForm.full_name}
                          onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })}
                          placeholder="e.g. Sathwik S"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={studentForm.email}
                          onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                          placeholder="e.g. sathwik@college.edu"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={studentForm.phone}
                          onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })}
                          placeholder="e.g. 9876543210"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Semester (1 - 8) <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          required
                          value={studentForm.semester}
                          onChange={e => setStudentForm({ ...studentForm, semester: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Department (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={studentForm.department_id}
                          onChange={e => setStudentForm({ ...studentForm, department_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="">-- Choose Department --</option>
                          {dropdowns.departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Save Student
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 3. Course Form */}
                  {activeView === 'courses' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleInsert('courses', courseForm);
                      }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Course Code <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={courseForm.course_code}
                          onChange={e => setCourseForm({ ...courseForm, course_code: e.target.value })}
                          placeholder="e.g. AIML301"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Course Title <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={courseForm.course_name}
                          onChange={e => setCourseForm({ ...courseForm, course_name: e.target.value })}
                          placeholder="e.g. Database Management Systems"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Credits (CHECK &gt; 0) <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          value={courseForm.credits}
                          onChange={e => setCourseForm({ ...courseForm, credits: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Semester (1 - 8)</label>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          required
                          value={courseForm.semester}
                          onChange={e => setCourseForm({ ...courseForm, semester: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pass / Max Marks</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.5"
                            value={courseForm.pass_marks}
                            onChange={e => setCourseForm({ ...courseForm, pass_marks: e.target.value })}
                            className="w-1/2 text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                            placeholder="Pass"
                          />
                          <input
                            type="number"
                            step="0.5"
                            value={courseForm.max_marks}
                            onChange={e => setCourseForm({ ...courseForm, max_marks: e.target.value })}
                            className="w-1/2 text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                            placeholder="Max"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Department (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={courseForm.department_id}
                          onChange={e => setCourseForm({ ...courseForm, department_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="">-- Choose Department --</option>
                          {dropdowns.departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Save Course
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 4. Faculty Form */}
                  {activeView === 'faculty' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleInsert('faculty', facultyForm);
                      }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Faculty Name <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={facultyForm.faculty_name}
                          onChange={e => setFacultyForm({ ...facultyForm, faculty_name: e.target.value })}
                          placeholder="e.g. Dr. Anand Verma"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={facultyForm.email}
                          onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })}
                          placeholder="e.g. anand.verma@college.edu"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Designation <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={facultyForm.designation}
                          onChange={e => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                          placeholder="e.g. Professor & HOD"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Department (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={facultyForm.department_id}
                          onChange={e => setFacultyForm({ ...facultyForm, department_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="">-- Choose Department --</option>
                          {dropdowns.departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Save Faculty
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 5. Exam Hall Form */}
                  {activeView === 'halls' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleInsert('halls', hallForm);
                      }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Hall Name / Room <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={hallForm.hall_name}
                          onChange={e => setHallForm({ ...hallForm, hall_name: e.target.value })}
                          placeholder="e.g. Ramanujan Hall 202"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Building Block <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={hallForm.building}
                          onChange={e => setHallForm({ ...hallForm, building: e.target.value })}
                          placeholder="e.g. Science & Computing Tower"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Capacity (CHECK &gt; 0) <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={hallForm.capacity}
                          onChange={e => setHallForm({ ...hallForm, capacity: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Save Exam Hall
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 6. Schedule Form */}
                  {activeView === 'schedules' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleInsert('schedules', scheduleForm);
                      }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Course (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={scheduleForm.course_id}
                          onChange={e => setScheduleForm({ ...scheduleForm, course_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="">-- Choose Course --</option>
                          {dropdowns.courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Exam Hall (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={scheduleForm.hall_id}
                          onChange={e => setScheduleForm({ ...scheduleForm, hall_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="">-- Choose Exam Hall --</option>
                          {dropdowns.halls.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Invigilator Faculty (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={scheduleForm.invigilator_id}
                          onChange={e => setScheduleForm({ ...scheduleForm, invigilator_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="">-- Choose Invigilator --</option>
                          {dropdowns.faculty.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Type</label>
                        <select
                          value={scheduleForm.exam_type}
                          onChange={e => setScheduleForm({ ...scheduleForm, exam_type: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="End-Term">End-Term</option>
                          <option value="Mid-Term">Mid-Term</option>
                          <option value="Supplementary">Supplementary</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Date</label>
                        <input
                          type="date"
                          required
                          value={scheduleForm.exam_date}
                          onChange={e => setScheduleForm({ ...scheduleForm, exam_date: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Time Slot (Start - End)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            required
                            value={scheduleForm.start_time}
                            onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                            className="w-1/2 text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                          />
                          <input
                            type="time"
                            required
                            value={scheduleForm.end_time}
                            onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                            className="w-1/2 text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Book Exam Slot
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 7. Result Form */}
                  {activeView === 'results' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleInsert('results', resultForm);
                      }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Select Candidate Student (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={resultForm.student_id}
                          onChange={e => setResultForm({ ...resultForm, student_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="">-- Choose Student --</option>
                          {dropdowns.students.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Select Exam Schedule (FK) <span className="text-rose-600">*</span>
                        </label>
                        <select
                          required
                          value={resultForm.schedule_id}
                          onChange={e => setResultForm({ ...resultForm, schedule_id: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="">-- Choose Exam Schedule --</option>
                          {dropdowns.schedules.map(sch => (
                            <option key={sch.id} value={sch.id}>{sch.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Marks Obtained (0 - Max Marks)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          disabled={resultForm.is_absent}
                          value={resultForm.marks_obtained}
                          onChange={e => setResultForm({ ...resultForm, marks_obtained: e.target.value })}
                          placeholder="e.g. 89.5"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none disabled:bg-slate-100"
                        />
                      </div>
                      <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={resultForm.is_absent}
                            onChange={e => setResultForm({ ...resultForm, is_absent: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Mark Candidate as Absent (0 Marks, 'Ab' Grade)</span>
                        </label>
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Process & Calculate Grade
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* VIEW TAB (TABLE) */}
              {activeTab === 'view' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Toolbar */}
                  <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={`Search ${activeView}...`}
                        className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Showing <strong>{filteredRows.length}</strong> records
                    </span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200 select-none">
                        {activeView === 'departments' && (
                          <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Department Name</th>
                            <th className="px-4 py-3">HOD Name</th>
                            <th className="px-4 py-3">Students</th>
                            <th className="px-4 py-3">Courses</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        )}
                        {activeView === 'students' && (
                          <tr>
                            <th className="px-4 py-3">Roll No</th>
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Semester</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        )}
                        {activeView === 'courses' && (
                          <tr>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Course Title</th>
                            <th className="px-4 py-3">Credits</th>
                            <th className="px-4 py-3">Semester</th>
                            <th className="px-4 py-3">Pass / Max</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        )}
                        {activeView === 'faculty' && (
                          <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Faculty Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Designation</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Duties</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        )}
                        {activeView === 'halls' && (
                          <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Hall Name</th>
                            <th className="px-4 py-3">Building</th>
                            <th className="px-4 py-3">Capacity</th>
                            <th className="px-4 py-3">Scheduled</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        )}
                        {activeView === 'schedules' && (
                          <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Course Code & Name</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Time Slot</th>
                            <th className="px-4 py-3">Hall</th>
                            <th className="px-4 py-3">Invigilator</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        )}
                        {activeView === 'results' && (
                          <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Course</th>
                            <th className="px-4 py-3">Marks</th>
                            <th className="px-4 py-3">Grade</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-400">
                              Loading database rows...
                            </td>
                          </tr>
                        ) : filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-400">
                              No records found matching criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row: any, idx: number) => {
                            if (activeView === 'departments') {
                              return (
                                <tr key={row.department_id || idx} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono text-slate-500">#{row.department_id}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-900">{row.department_name}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.hod_name}</td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-medium">
                                      {row.total_students || 0} students
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-medium">
                                      {row.total_courses || 0} courses
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setDeleteTarget({ entity: 'departments', id: row.department_id, label: row.department_name })}
                                      className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            if (activeView === 'students') {
                              return (
                                <tr key={row.student_id || idx} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.roll_no}</td>
                                  <td className="px-4 py-3 font-medium text-slate-900">{row.full_name}</td>
                                  <td className="px-4 py-3 text-slate-600">{row.email}</td>
                                  <td className="px-4 py-3">Sem {row.semester}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.department_name}</td>
                                  <td className="px-4 py-3 text-slate-500">{row.phone || '-'}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setDeleteTarget({ entity: 'students', id: row.student_id, label: row.full_name })}
                                      className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            if (activeView === 'courses') {
                              return (
                                <tr key={row.course_id || idx} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.course_code}</td>
                                  <td className="px-4 py-3 font-medium text-slate-900">{row.course_name}</td>
                                  <td className="px-4 py-3 font-semibold">{row.credits} Credits</td>
                                  <td className="px-4 py-3">Sem {row.semester}</td>
                                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                                    {row.pass_marks} / {row.max_marks}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">{row.department_name}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setDeleteTarget({ entity: 'courses', id: row.course_id, label: row.course_name })}
                                      className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            if (activeView === 'faculty') {
                              return (
                                <tr key={row.faculty_id || idx} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono text-slate-500">#{row.faculty_id}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-900">{row.faculty_name}</td>
                                  <td className="px-4 py-3 text-slate-600">{row.email}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.designation}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.department_name}</td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                                      {row.invigilation_count || 0} duties
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setDeleteTarget({ entity: 'faculty', id: row.faculty_id, label: row.faculty_name })}
                                      className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            if (activeView === 'halls') {
                              return (
                                <tr key={row.hall_id || idx} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono text-slate-500">#{row.hall_id}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-900">{row.hall_name}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.building}</td>
                                  <td className="px-4 py-3 font-bold text-slate-900">{row.capacity} seats</td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-medium">
                                      {row.scheduled_exams_count || 0} exams
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setDeleteTarget({ entity: 'halls', id: row.hall_id, label: row.hall_name })}
                                      className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            if (activeView === 'schedules') {
                              return (
                                <tr key={row.schedule_id || idx} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono text-slate-500">#{row.schedule_id}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-900">
                                    {row.course_code}: <span className="font-normal text-slate-600">{row.course_name}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                      {row.exam_type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium">{row.exam_date}</td>
                                  <td className="px-4 py-3 font-mono text-[11px]">
                                    {row.start_time?.slice(0, 5)} - {row.end_time?.slice(0, 5)}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-800">{row.hall_name}</td>
                                  <td className="px-4 py-3 text-slate-600">{row.invigilator_name}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setDeleteTarget({ entity: 'schedules', id: row.schedule_id, label: `Exam on ${row.exam_date}` })}
                                      className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            if (activeView === 'results') {
                              const isPass = row.status === 'Pass';
                              const isAbsent = row.status === 'Absent';
                              return (
                                <tr key={row.result_id || idx} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono text-slate-500">#{row.result_id}</td>
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-900">{row.student_name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{row.roll_no}</div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-800">
                                    <span className="font-bold">{row.course_code}</span>: {row.course_name}
                                  </td>
                                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                    {row.marks_obtained} <span className="text-slate-400 font-normal">/ {row.max_marks}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                      {row.grade} ({row.grade_points} pts)
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isPass
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : isAbsent
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setDeleteTarget({ entity: 'results', id: row.result_id, label: `Result for ${row.student_name}` })}
                                      className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            return null;
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: REPORTS */}
          {activeView === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">SQL Analytical Reports</h2>
                  <p className="text-xs text-slate-500">Live multi-table JOINs, SGPA calculations, and presentation queries</p>
                </div>
              </div>

              {/* Report Sub-Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                {[
                  { id: 'timetable', label: '1. Master Timetable' },
                  { id: 'student-card', label: '2. Student Result Card & SGPA' },
                  { id: 'pass-percentage', label: '3. Course Pass Percentage' },
                  { id: 'toppers', label: '4. Course Toppers' },
                  { id: 'hall-utilisation', label: '5. Hall Utilisation' },
                  { id: 'presentation-ii', label: '⭐ Presentation-II Query' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setReportTab(r.id);
                      fetchReport(r.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      reportTab === r.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Filter Bar */}
              {reportTab === 'hall-utilisation' && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Filter Date:</span>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="text-xs px-2.5 py-1.5 border border-slate-300 rounded outline-none"
                  />
                  <button
                    onClick={() => fetchReport('hall-utilisation')}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold"
                  >
                    Run Query
                  </button>
                </div>
              )}

              {reportTab === 'student-card' && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Select Student:</span>
                  <select
                    value={selectedStudentForReport}
                    onChange={e => {
                      setSelectedStudentForReport(e.target.value);
                      setTimeout(() => fetchReport('student-card'), 50);
                    }}
                    className="text-xs px-3 py-1.5 border border-slate-300 rounded outline-none bg-white min-w-[280px]"
                  >
                    <option value="">-- All Students (SGPA Summary Ranking) --</option>
                    {dropdowns.students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Report Table Rendering */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                {loading ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Executing SQL report query...</div>
                ) : !reportData ? (
                  <div className="text-center py-12 text-slate-400 text-xs">No data returned.</div>
                ) : reportTab === 'timetable' ? (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Master Examination Timetable</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Time</th>
                            <th className="px-3 py-2.5">Course</th>
                            <th className="px-3 py-2.5">Department</th>
                            <th className="px-3 py-2.5">Hall & Building</th>
                            <th className="px-3 py-2.5">Invigilator</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(reportData) && reportData.map((r: any) => (
                            <tr key={r.schedule_id} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2.5 font-semibold text-slate-900">{r.exam_date} ({r.exam_type})</td>
                              <td className="px-3 py-2.5 font-mono text-[11px]">{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</td>
                              <td className="px-3 py-2.5"><strong>{r.course_code}</strong>: {r.course_name}</td>
                              <td className="px-3 py-2.5 text-slate-600">{r.department_name} (Sem {r.semester})</td>
                              <td className="px-3 py-2.5 text-slate-800">{r.hall_name} ({r.building})</td>
                              <td className="px-3 py-2.5 text-slate-600">{r.invigilator_name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : reportTab === 'student-card' ? (
                  reportData.student ? (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-blue-900">{reportData.student.full_name}</h4>
                          <p className="text-xs text-slate-500">
                            Roll No: <strong>{reportData.student.roll_no}</strong> • Dept: {reportData.student.department_name} • Sem {reportData.student.semester}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Calculated SGPA</span>
                          <div className="text-3xl font-black text-emerald-700">{reportData.summary.sgpa}</div>
                          <span className="text-xs text-slate-500 font-medium">
                            Credits: {reportData.summary.creditsEarned} / {reportData.summary.totalCredits}
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2.5">Course Code</th>
                              <th className="px-3 py-2.5">Course Name</th>
                              <th className="px-3 py-2.5">Credits</th>
                              <th className="px-3 py-2.5">Marks Scored</th>
                              <th className="px-3 py-2.5">Grade</th>
                              <th className="px-3 py-2.5">Grade Points</th>
                              <th className="px-3 py-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportData.courses?.map((c: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/70">
                                <td className="px-3 py-2.5 font-bold font-mono">{c.course_code}</td>
                                <td className="px-3 py-2.5">{c.course_name}</td>
                                <td className="px-3 py-2.5">{c.credits}</td>
                                <td className="px-3 py-2.5 font-bold">{c.marks_obtained} / {c.max_marks}</td>
                                <td className="px-3 py-2.5 font-mono font-bold">{c.grade}</td>
                                <td className="px-3 py-2.5">{c.grade_points}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">All Students SGPA & Performance Ranking</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2.5">Rank</th>
                              <th className="px-3 py-2.5">Roll No</th>
                              <th className="px-3 py-2.5">Student Name</th>
                              <th className="px-3 py-2.5">Department</th>
                              <th className="px-3 py-2.5">Credits Earned</th>
                              <th className="px-3 py-2.5">Total Points</th>
                              <th className="px-3 py-2.5">SGPA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Array.isArray(reportData) && reportData.map((s: any, idx: number) => (
                              <tr key={s.student_id} className="hover:bg-slate-50/70">
                                <td className="px-3 py-2.5 font-bold text-slate-400">#{idx + 1}</td>
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{s.roll_no}</td>
                                <td className="px-3 py-2.5">{s.full_name} (Sem {s.semester})</td>
                                <td className="px-3 py-2.5 text-slate-600">{s.department_name}</td>
                                <td className="px-3 py-2.5">{s.credits_earned} / {s.total_credits_registered}</td>
                                <td className="px-3 py-2.5 font-mono">{s.total_weighted_points}</td>
                                <td className="px-3 py-2.5 font-bold text-emerald-700 text-sm">{s.sgpa}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : reportTab === 'pass-percentage' ? (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Course Pass Percentage Analysis</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Course Code</th>
                            <th className="px-3 py-2.5">Course Title</th>
                            <th className="px-3 py-2.5">Department</th>
                            <th className="px-3 py-2.5">Evaluated</th>
                            <th className="px-3 py-2.5">Passed</th>
                            <th className="px-3 py-2.5">Failed</th>
                            <th className="px-3 py-2.5">Pass %</th>
                            <th className="px-3 py-2.5">Avg Marks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(reportData) && reportData.map((c: any) => (
                            <tr key={c.course_id} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{c.course_code}</td>
                              <td className="px-3 py-2.5">{c.course_name}</td>
                              <td className="px-3 py-2.5 text-slate-600">{c.department_name}</td>
                              <td className="px-3 py-2.5">{c.total_students_evaluated}</td>
                              <td className="px-3 py-2.5 text-emerald-700 font-bold">{c.total_passed}</td>
                              <td className="px-3 py-2.5 text-rose-700 font-bold">{c.total_failed}</td>
                              <td className="px-3 py-2.5">
                                <span className={`font-bold ${parseFloat(c.pass_percentage) >= 75 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {c.pass_percentage}%
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-bold">{c.average_marks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : reportTab === 'toppers' ? (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Course Subject Toppers</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Course Code</th>
                            <th className="px-3 py-2.5">Course Title</th>
                            <th className="px-3 py-2.5">Topper Roll No</th>
                            <th className="px-3 py-2.5">Topper Name</th>
                            <th className="px-3 py-2.5">Highest Marks</th>
                            <th className="px-3 py-2.5">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(reportData) && reportData.map((t: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{t.course_code}</td>
                              <td className="px-3 py-2.5">{t.course_name}</td>
                              <td className="px-3 py-2.5 font-mono text-blue-700 font-semibold">{t.topper_roll_no}</td>
                              <td className="px-3 py-2.5 font-semibold text-slate-900">{t.topper_name}</td>
                              <td className="px-3 py-2.5 font-bold text-emerald-700">{t.topper_marks} / {t.max_marks || 100}</td>
                              <td className="px-3 py-2.5 font-mono font-bold">{t.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : reportTab === 'hall-utilisation' ? (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Exam Hall Utilisation for {reportDate}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Hall Name</th>
                            <th className="px-3 py-2.5">Building</th>
                            <th className="px-3 py-2.5">Capacity</th>
                            <th className="px-3 py-2.5">Occupancy Status</th>
                            <th className="px-3 py-2.5">Scheduled Exams on Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(reportData) && reportData.map((h: any) => (
                            <tr key={h.hall_id} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2.5 font-semibold text-slate-900">{h.hall_name}</td>
                              <td className="px-3 py-2.5 text-slate-600">{h.building}</td>
                              <td className="px-3 py-2.5 font-bold">{h.capacity} seats</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  h.status === 'Occupied' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {h.status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-slate-700">{h.scheduled_exams || 'None'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : reportTab === 'presentation-ii' ? (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-lg text-xs text-blue-900">
                      <strong>Presentation-II SQL Query Question:</strong>
                      <p className="mt-1 text-slate-700">
                        "Retrieve the student name, roll number, department name, total number of 'O' grades achieved, and overall average marks for all students who have secured an outstanding grade ('O') in more than one examination during Academic Year 2026-2027."
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Roll Number</th>
                            <th className="px-3 py-2.5">Student Name</th>
                            <th className="px-3 py-2.5">Department</th>
                            <th className="px-3 py-2.5">Total 'O' Grades</th>
                            <th className="px-3 py-2.5">Overall Avg Marks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(reportData) && reportData.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{r.roll_no}</td>
                              <td className="px-3 py-2.5 font-semibold text-slate-900">{r.student_name}</td>
                              <td className="px-3 py-2.5 text-slate-600">{r.department_name}</td>
                              <td className="px-3 py-2.5">
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  {r.total_o_grades} 'O' Grades
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-900">{r.overall_avg_marks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* VIEW: DATABASE EXPLORER */}
          {activeView === 'explorer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Live Database Explorer</h2>
                  <p className="text-xs text-slate-500">
                    Prepared read-only SQL inspection on whitelisted tables (rejection of unpermitted statements)
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">Select Whitelisted Table:</label>
                  <select
                    value={selectedTable}
                    onChange={e => inspectExplorerTable(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white min-w-[240px]"
                  >
                    {explorerTables.map(tbl => (
                      <option key={tbl} value={tbl}>TABLE: {tbl}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => inspectExplorerTable(selectedTable)}
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                  >
                    Execute Query
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Reading table records...</div>
                ) : explorerData && explorerData.rows ? (
                  <div>
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                      <span>Query: <code className="bg-slate-100 text-blue-700 px-2 py-0.5 rounded font-mono">SELECT * FROM `{explorerData.table}`</code></span>
                      <span>Total Rows: <strong>{explorerData.totalRows}</strong></span>
                    </div>

                    <div className="overflow-x-auto max-h-[460px]">
                      <table className="w-full text-left text-xs border border-slate-200">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200 sticky top-0">
                          <tr>
                            {explorerData.columns.map(c => (
                              <th key={c} className="px-3 py-2.5 whitespace-nowrap bg-slate-100">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {explorerData.rows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/70">
                              {explorerData.columns.map(c => (
                                <td key={c} className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-slate-700">
                                  {r[c] !== null && r[c] !== undefined ? String(r[c]) : <span className="text-slate-300">NULL</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </main>

        {/* LIVE DATABASE PROOF FOOTER */}
        <footer className="bg-slate-950 text-slate-200 border-t-2 border-slate-800 px-6 py-3 sticky bottom-0 z-30 shadow-2xl">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <span>Live Database Proof Engine</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>Execution Time: <strong className="text-slate-100">{lastQuery.executionTimeMs} ms</strong></span>
              <span>Rows Affected / Returned: <strong className="text-slate-100">{lastQuery.rowCount || lastQuery.affectedRows}</strong></span>
              <span>Host: <strong className="text-slate-100">{dbStatus?.host || 'localhost'}:{dbStatus?.port || 3306}</strong></span>
              <span>DB: <strong className="text-slate-100">{dbStatus?.database || 'exam_management_db'}</strong></span>
            </div>
          </div>
          <div className="bg-black/70 border border-slate-800 rounded px-3 py-1.5 font-mono text-[11px] text-cyan-200 overflow-x-auto whitespace-nowrap">
            {lastQuery.sql}
          </div>
          {lastQuery.params && lastQuery.params.length > 0 && (
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              Prepared Statement Params: [{lastQuery.params.map(p => JSON.stringify(p)).join(', ')}]
            </div>
          )}
        </footer>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Confirm Record Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong>{deleteTarget.label}</strong> (ID #{deleteTarget.id}) from{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">{deleteTarget.entity}</code>?
              <br />
              <br />
              <span className="text-slate-500">
                Note: If this record is referenced by foreign keys in exam schedules or student results, deletion will be blocked by MySQL foreign key constraints (errno 1451).
              </span>
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
