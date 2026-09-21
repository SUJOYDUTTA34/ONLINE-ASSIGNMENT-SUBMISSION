import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Assignment } from '../../types';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Award,
  UploadCloud,
  FileCheck,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface StudentAssignmentsProps {
  onSelectAssignment: (assignment: Assignment) => void;
  onOpenSubmitModal: (assignment: Assignment) => void;
  onOpenQuickSubmit?: () => void;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  onSelectAssignment,
  onOpenSubmitModal,
  onOpenQuickSubmit,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const courses = storage.getCourses().filter((c) => c.enrolledStudentIds.includes(user.id));
  const enrolledCourseIds = courses.map((c) => c.id);

  const assignments = storage.getAssignments().filter(
    (a) => a.status === 'published' && enrolledCourseIds.includes(a.courseId)
  );

  const studentSubmissions = storage.getSubmissions().filter((s) => s.studentId === user.id);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'due-asc' | 'due-desc' | 'marks'>('due-asc');

  const filtered = assignments.filter((a) => {
    // Search query
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Course filter
    if (selectedCourse !== 'ALL' && a.courseId !== selectedCourse) return false;

    // Status filter
    const submission = studentSubmissions.find((s) => s.assignmentId === a.id);
    const isPastDue = new Date() > new Date(a.dueAt);

    if (selectedStatus === 'submitted' && !submission) return false;
    if (selectedStatus === 'pending' && submission) return false;
    if (selectedStatus === 'graded' && (!submission || submission.status !== 'graded')) return false;
    if (selectedStatus === 'overdue' && (submission || !isPastDue)) return false;

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'due-asc') return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (sortBy === 'due-desc') return new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime();
    if (sortBy === 'marks') return b.maxMarks - a.maxMarks;
    return 0;
  });

  return (
    <div id="student-assignments-view" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Course Assignments</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Browse and submit active coursework for all your enrolled courses
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onOpenQuickSubmit && (
            <button
              id="student-assignments-page-submit-btn"
              onClick={onOpenQuickSubmit}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              + Submit Assignment
            </button>
          )}
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
            Showing {filtered.length} of {assignments.length} assignments
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="assignment-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments by title, code or keyword..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Course dropdown */}
          <select
            id="filter-course-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Enrolled Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code || c.courseCode} — {c.title || c.courseName}
              </option>
            ))}
          </select>

          {/* Status dropdown */}
          <select
            id="filter-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="pending">Pending (Not Submitted)</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Sort dropdown */}
          <select
            id="sort-assignments-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="due-asc">Due Date (Earliest First)</option>
            <option value="due-desc">Due Date (Latest First)</option>
            <option value="marks">Highest Marks</option>
          </select>
        </div>
      </div>

      {/* Assignment Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Assignments Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No coursework matching your current search and filter criteria. Try resetting the filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((asg) => {
            const submission = studentSubmissions.find((s) => s.assignmentId === asg.id);
            const isOverdue = new Date() > new Date(asg.dueAt);

            return (
              <div
                key={asg.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                      {asg.courseCode}
                    </span>

                    {submission ? (
                      submission.status === 'graded' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          Graded: {submission.grade?.marksObtained}/{asg.maxMarks}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Submitted
                        </span>
                      )
                    ) : isOverdue ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Overdue
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {asg.description}
                  </p>

                  {/* Meta Specs */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Due Date:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(asg.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Max Score:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {asg.maxMarks} Points
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Allowed Formats:</span>
                      <span className="font-mono uppercase text-[10px] text-slate-700 dark:text-slate-300">
                        {asg.allowedFileTypes.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => onSelectAssignment(asg)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>

                  {(!submission || asg.allowResubmission) && (
                    <button
                      onClick={() => {
                        onOpenSubmitModal(asg);
                        document.getElementById('assignmentFile')?.click();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors min-h-[44px]"
                    >
                      <span>📄 {submission ? 'Resubmit Assignment' : 'Submit Assignment'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
