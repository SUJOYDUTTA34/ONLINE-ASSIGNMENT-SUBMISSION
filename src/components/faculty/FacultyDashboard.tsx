import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Submission, Assignment } from '../../types';
import {
  BookOpen,
  FileText,
  UploadCloud,
  CheckSquare,
  Clock,
  PlusCircle,
  BarChart3,
  Award,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface FacultyDashboardProps {
  onOpenCreateAssignment: () => void;
  onSelectSubmissionToGrade: (submission: Submission) => void;
  onNavigateTab: (tab: string) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  onOpenCreateAssignment,
  onSelectSubmissionToGrade,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const courses = storage.getCourses().filter(
    (c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id))
  );
  const facultyCourseIds = courses.map((c) => c.id);

  const assignments = storage.getAssignments().filter((a) => facultyCourseIds.includes(a.courseId));
  const submissions = storage.getSubmissions().filter((s) => facultyCourseIds.includes(s.courseId));

  const totalCourses = courses.length;
  const activeAssignments = assignments.filter((a) => a.status === 'published').length;
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded').length;
  const pendingGrading = Math.max(0, totalSubmissions - gradedSubmissions);

  // Recent 5 submissions
  const recentSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  ).slice(0, 5);

  return (
    <div id="faculty-dashboard" className="space-y-6">
      {/* Faculty Profile Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              Faculty Portal • Academic Year 2026–2027
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2 font-medium">
              <span>Employee ID: <strong className="font-mono text-white">{user.employeeIdNumber || 'FAC-402'}</strong></span>
              <span>•</span>
              <span>{user.departmentName || 'Computer Science Department'}</span>
              <span>•</span>
              <span>{courses.length} Active Courses Assigned</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              id="faculty-create-assignment-cta"
              onClick={onOpenCreateAssignment}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Create Assignment
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigateTab('submissions')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              View Submissions
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigateTab('analytics')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs flex items-center gap-2 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              Course Analytics
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 5 Statistics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Courses', icon: BookOpen, iconColor: 'text-blue-500', value: totalCourses, sub: 'Assigned sections', textColor: 'text-slate-900 dark:text-white' },
          { label: 'Active Assignments', icon: FileText, iconColor: 'text-indigo-500', value: activeAssignments, sub: 'Published to students', textColor: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Submissions', icon: UploadCloud, iconColor: 'text-cyan-500', value: totalSubmissions, sub: 'Total uploads received', textColor: 'text-cyan-600 dark:text-cyan-400' },
          { label: 'Pending Grading', icon: Clock, iconColor: 'text-amber-500', value: pendingGrading, sub: 'Awaiting evaluation', textColor: 'text-amber-600 dark:text-amber-400' },
          { label: 'Graded', icon: CheckSquare, iconColor: 'text-emerald-500', value: gradedSubmissions, sub: 'Feedback delivered', textColor: 'text-emerald-600 dark:text-emerald-400', className: 'col-span-2 sm:col-span-1' },
        ].map((stat, i) => {
          const StatIcon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.05 * i }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-shadow hover:shadow-md ${stat.className || ''}`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">{stat.label}</span>
                <StatIcon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <p className={`text-2xl font-black ${stat.textColor}`}>{stat.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Courses Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Your Active Courses
          </h2>
          <button
            onClick={() => onNavigateTab('my-courses')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Manage Courses <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const courseAssignments = assignments.filter((a) => a.courseId === course.id);
            const courseSubmissions = submissions.filter((s) => s.courseId === course.id);
            const coursePendingGrading = courseSubmissions.filter((s) => s.status !== 'graded').length;

            return (
              <div
                key={course.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {course.code || course.courseCode}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {course.credits} Credits
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {course.title || course.courseName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {course.enrolledStudentIds.length}
                      </p>
                      <p className="text-[10px] text-slate-400">Students</p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {courseAssignments.length}
                      </p>
                      <p className="text-[10px] text-slate-400">Assignments</p>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {coursePendingGrading}
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">To Grade</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onNavigateTab('assignments')}
                    className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    View Assignments
                  </button>
                  <button
                    onClick={() => onNavigateTab('submissions')}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Submissions ({courseSubmissions.length})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Submissions to Grade */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Submissions Roster
            </h2>
            <p className="text-xs text-slate-400">
              Latest coursework submitted across your classes
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('grading')}
            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            Open Grading Hub
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Assignment & Course</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">Timeliness</th>
                <th className="py-3 px-4">Grading Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No submissions recorded yet for your active courses.
                  </td>
                </tr>
              ) : (
                recentSubmissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {sub.studentName}
                      <p className="text-[10px] text-slate-400 font-mono font-normal">
                        {sub.studentIdNumber}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {sub.assignmentTitle}
                      </p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        {sub.courseCode}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {new Date(sub.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3.5 px-4">
                      {sub.isLate ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Late ({sub.lateDays}d, -{sub.latePenaltyPercent}%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          On Time
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {sub.status === 'graded' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          Graded ({sub.grade?.marksObtained}/{sub.grade?.maxMarks})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Needs Grading
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectSubmissionToGrade(sub)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                      >
                        {sub.status === 'graded' ? 'Edit Grade' : 'Grade Submission'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
