import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Assignment, Submission } from '../../types';
import {
  GraduationCap,
  FileText,
  Clock,
  CheckCircle2,
  Award,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  Calendar,
  Eye,
  BellRing,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface StudentDashboardProps {
  onSelectAssignment: (assignment: Assignment) => void;
  onOpenSubmitModal: (assignment: Assignment) => void;
  onViewSubmissionsTab: () => void;
  onViewGradesTab: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onSelectAssignment,
  onOpenSubmitModal,
  onViewSubmissionsTab,
  onViewGradesTab,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const courses = storage.getCourses().filter((c) => c.enrolledStudentIds.includes(user.id));
  const enrolledCourseIds = courses.map((c) => c.id);

  // Assignments for enrolled courses
  const allAssignments = storage.getAssignments().filter(
    (a) => a.status === 'published' && enrolledCourseIds.includes(a.courseId)
  );

  const studentSubmissions = storage.getSubmissions().filter((s) => s.studentId === user.id);

  // Compute Stats
  const totalAssignments = allAssignments.length;
  const submittedCount = studentSubmissions.length;
  const gradedCount = studentSubmissions.filter((s) => s.status === 'graded').length;
  const pendingAssignments = Math.max(0, totalAssignments - submittedCount);

  // Upcoming deadlines (within next 7 days or not yet submitted)
  const now = new Date();
  const upcomingDeadlines = allAssignments.filter((a) => {
    const isSubmitted = studentSubmissions.some((s) => s.assignmentId === a.id);
    return !isSubmitted;
  }).length;

  const recentNotifications = storage.getNotifications(user.id).slice(0, 5);

  return (
    <div id="student-dashboard" className="space-y-6">
      {/* Welcome Section */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -translate-y-10 translate-x-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              Academic Session 2026–2027 • Fall Term
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200 mt-2 font-medium">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-300" />
                ID: <span className="font-mono text-white font-bold">{user.studentIdNumber || 'CS-2024-001'}</span>
              </span>
              <span>•</span>
              <span>{user.departmentName || 'Computer Science & Engineering'}</span>
              <span>•</span>
              <span>Semester {user.semester || 5}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="student-view-grades-cta"
              onClick={onViewGradesTab}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs flex items-center gap-2"
            >
              <Award className="w-4 h-4 text-amber-300" />
              View Gradebook
            </button>
            <button
              id="student-view-submissions-cta"
              onClick={onViewSubmissionsTab}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-md shadow-blue-600/30 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              My Submissions
            </button>
          </div>
        </div>
      </div>

      {/* 5 Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Coursework</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalAssignments}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Enrolled assignments</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingAssignments}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting your upload</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Submitted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{submittedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Delivered to professors</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Graded</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{gradedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Evaluated with feedback</p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Upcoming Due</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{upcomingDeadlines}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Action needed</p>
        </div>
      </div>

      {/* Grid: Upcoming Assignments & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Assignments Table */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Upcoming & Active Assignments
              </h2>
              <p className="text-xs text-slate-400">
                Track your due dates and submission statuses
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
              {allAssignments.length} Assignments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Assignment</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {allAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No active assignments posted for your enrolled courses.
                    </td>
                  </tr>
                ) : (
                  allAssignments.map((asg) => {
                    const submission = studentSubmissions.find((s) => s.assignmentId === asg.id);
                    const isOverdue = new Date() > new Date(asg.dueAt);

                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Not Started
                      </span>
                    );

                    if (submission) {
                      if (submission.status === 'graded') {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            Graded ({submission.grade?.marksObtained}/{asg.maxMarks})
                          </span>
                        );
                      } else if (submission.isLate) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            Submitted Late
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Submitted
                          </span>
                        );
                      }
                    } else if (isOverdue) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Past Due
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={asg.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {asg.title}
                          </p>
                          <p className="text-[10px] text-slate-400">Max: {asg.maxMarks} marks</p>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {asg.courseCode}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {new Date(asg.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>

                        <td className="py-3.5 px-4">{statusBadge}</td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectAssignment(asg)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                            >
                              View
                            </button>

                            {(!submission || asg.allowResubmission) && (
                              <button
                                onClick={() => onOpenSubmitModal(asg)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 shadow-xs"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                {submission ? 'Resubmit' : 'Submit'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Activity & Notifications */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Activity
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Real-time alerts</span>
          </div>

          <div className="space-y-3">
            {recentNotifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent updates</p>
            ) : (
              recentNotifications.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
