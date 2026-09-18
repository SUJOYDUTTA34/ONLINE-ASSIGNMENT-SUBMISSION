import React, { useState } from 'react';
import { storage } from '../../services/storage';
import {
  FileSpreadsheet,
  Download,
  BarChart3,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  FileText,
} from 'lucide-react';

export const SystemReportsView: React.FC = () => {
  const stats = storage.getSystemStats();
  const departments = storage.getDepartments();
  const courses = storage.getCourses();
  const assignments = storage.getAssignments();
  const submissions = storage.getSubmissions();
  const users = storage.getUsers();

  const [selectedTerm, setSelectedTerm] = useState('Spring 2026');

  // Export report as CSV
  const handleExportCSV = () => {
    const headers = ['Department', 'Course Code', 'Course Title', 'Faculty', 'Assignments', 'Total Submissions', 'Graded Submissions', 'Avg Score'];
    const rows = courses.map((c) => {
      const courseAsgs = assignments.filter((a) => a.courseId === c.id);
      const courseSubs = submissions.filter((s) => s.courseId === c.id);
      const gradedSubs = courseSubs.filter((s) => s.status === 'graded');
      const avgScore = gradedSubs.length > 0
        ? (gradedSubs.reduce((acc, s) => acc + (s.grade?.marksObtained || 0), 0) / gradedSubs.length).toFixed(1)
        : 'N/A';
      return [
        `"${c.departmentName || 'General'}"`,
        `"${c.code || c.courseCode}"`,
        `"${c.title || c.courseName}"`,
        `"${c.facultyName}"`,
        courseAsgs.length,
        courseSubs.length,
        gradedSubs.length,
        avgScore,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Scholaris_System_Academic_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onTimeCount = submissions.filter((s) => s.status !== 'late').length;
  const lateCount = submissions.filter((s) => s.status === 'late').length;
  const onTimePercentage = submissions.length > 0 ? Math.round((onTimeCount / submissions.length) * 100) : 100;

  return (
    <div id="system-reports-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Institutional Academic Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            System-wide compliance, submission punctuality rates, and department evaluation metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="Spring 2026">Spring 2026 Term</option>
            <option value="Fall 2025">Fall 2025 Term</option>
            <option value="Annual 2025-26">Annual 2025-26 Year</option>
          </select>

          <button
            id="export-csv-report-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">On-Time Submissions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{onTimePercentage}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{onTimeCount} of {submissions.length} on time</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Grading Turnaround</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.gradedSubmissions}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.pendingReviews} pending grading</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Active Courses</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{courses.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across {departments.length} departments</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Platform Users</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {users.filter((u) => u.role === 'student').length} Students, {users.filter((u) => u.role === 'faculty').length} Faculty
          </p>
        </div>
      </div>

      {/* Department Performance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Department Overview</h2>
          <span className="text-xs text-slate-400">{departments.length} Academic Divisions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 font-semibold">Department</th>
                <th className="p-3 font-semibold">Code</th>
                <th className="p-3 font-semibold">Courses</th>
                <th className="p-3 font-semibold">Faculty</th>
                <th className="p-3 font-semibold">Assignments</th>
                <th className="p-3 font-semibold">Submissions</th>
                <th className="p-3 font-semibold">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {departments.map((dept) => {
                const deptCourses = courses.filter((c) => c.departmentId === dept.id);
                const deptFaculty = users.filter((u) => u.role === 'faculty' && u.departmentId === dept.id);
                const deptCourseIds = deptCourses.map((c) => c.id);
                const deptAsgs = assignments.filter((a) => deptCourseIds.includes(a.courseId));
                const deptSubs = submissions.filter((s) => deptCourseIds.includes(s.courseId));
                const completionRate = deptAsgs.length > 0 ? Math.min(100, Math.round((deptSubs.length / (deptAsgs.length * 5)) * 100)) : 100;

                return (
                  <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{dept.name}</td>
                    <td className="p-3 font-mono text-[11px] text-blue-600 dark:text-blue-400">{dept.code}</td>
                    <td className="p-3">{deptCourses.length}</td>
                    <td className="p-3">{deptFaculty.length}</td>
                    <td className="p-3">{deptAsgs.length}</td>
                    <td className="p-3 font-medium">{deptSubs.length}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, completionRate)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold">{completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
