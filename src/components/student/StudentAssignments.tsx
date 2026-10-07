import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Assignment, Submission } from '../../types';
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
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

interface StudentAssignmentsProps {
  onSelectAssignment: (assignment: Assignment) => void;
  onOpenSubmitModal: (assignment: Assignment) => void;
  onOpenQuickSubmit?: () => void;
  initialCourseId?: string;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  onSelectAssignment,
  onOpenSubmitModal,
  onOpenQuickSubmit,
  initialCourseId = 'ALL',
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'due-asc' | 'due-desc' | 'marks'>('due-asc');

  useEffect(() => {
    if (initialCourseId && initialCourseId !== 'ALL') {
      setSelectedCourse(initialCourseId);
    }
  }, [initialCourseId]);

  if (!user) return null;

  const courses = storage.getCourses();
  const assignments = storage
    .getAssignments(user)
    .filter((a) => a.status === 'published');

  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>(() =>
    storage.getSubmissions().filter((s) => s.studentId === user?.id)
  );
  const [asgToDelete, setAsgToDelete] = useState<Assignment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    storage.syncWithD1().then(() => {
      setStudentSubmissions(storage.getSubmissions().filter((s) => s.studentId === user?.id));
      setRefreshTrigger((prev) => prev + 1);
    }).catch(() => {});
  }, [user?.id]);

  const handleDeleteSubmission = (submissionId: string, title: string) => {
    try {
      storage.deleteSubmission(submissionId, user);
      setStudentSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      showToast({
        type: 'success',
        title: 'Submission Deleted',
        message: `Your submission for "${title}" has been removed.`,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete submission.',
      });
    }
  };

  const confirmDeleteAssignment = () => {
    if (!asgToDelete) return;
    try {
      storage.deleteAssignment(asgToDelete.id, user);
      showToast({
        type: 'success',
        title: 'Assignment Deleted',
        message: `Assignment "${asgToDelete.title}" was removed.`,
      });
      setAsgToDelete(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete assignment.',
      });
    }
  };

  const handleCreateCourseworkForCourse = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newAsg: Assignment = {
      id: `asg-${Date.now()}`,
      courseId: course.id,
      courseCode: course.code || course.courseCode || 'COURSE',
      courseName: course.title || course.courseName || 'Coursework',
      facultyId: course.facultyId || (course.facultyIds && course.facultyIds[0]) || user.id,
      facultyName: course.facultyName || 'Course Instructor',
      title: `${course.code || course.courseCode} — Coursework Submission`,
      description: `Submit your assignments or project coursework for ${course.title || course.courseName}.`,
      instructions: 'Upload your completed file (PDF, Word, Excel, ZIP, code, etc.) up to 100 MB.',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      dueAt: dueDate.toISOString(),
      maxMarks: 100,
      allowedFileTypes: ['all', 'pdf', 'docx', 'zip', 'xlsx', 'pptx'],
      maxFileSizeMb: 100,
      allowLateSubmission: true,
      latePenaltyPercentPerDay: 5,
      allowResubmission: true,
      maxResubmissions: 5,
      status: 'published',
      resources: [],
    };

    const saved = storage.saveAssignment(newAsg, user);
    showToast({
      type: 'success',
      title: 'Coursework Initialized',
      message: `Coursework submission ready for ${course.code || course.courseCode}.`,
    });
    onOpenSubmitModal(saved);
  };

  const filtered = assignments.filter((a) => {
    // Search query
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseName.toLowerCase().includes(searchQuery.toLowerCase());

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
            <option value="ALL">📚 All Courses ({courses.length})</option>
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
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Assignments Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {selectedCourse !== 'ALL'
              ? 'No assignment has been published for this course yet.'
              : 'No coursework matching your current search and filter criteria.'}
          </p>

          {selectedCourse !== 'ALL' && (
            <div className="mt-4">
              <button
                onClick={() => handleCreateCourseworkForCourse(selectedCourse)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                + Upload Coursework / Submission for this Course
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((asg) => {
            const submission = studentSubmissions.find((s) => s.assignmentId === asg.id);
            const isOverdue = new Date() > new Date(asg.dueAt);

            return (
              <div
                key={asg.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-500/50 transition-all flex flex-col justify-between group"
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
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {asg.description}
                  </p>

                  {/* Metadata block */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" /> Due Date:
                      </span>
                      <span className={`font-semibold ${isOverdue && !submission ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {new Date(asg.dueAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Time:
                      </span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        {new Date(asg.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500" /> Maximum Marks:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {asg.maxMarks} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      id={`view-asg-details-btn-${asg.id}`}
                      onClick={() => onSelectAssignment(asg)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Details
                    </button>

                    {submission && (
                      <>
                        {((submission as any).r2Url || (submission as any).fileKey || (submission as any).fileData) && (
                          <button
                            onClick={() => {
                              const previewUrl = (submission as any).r2Url || ((submission as any).fileKey ? `/api/files/preview/${(submission as any).fileKey}` : (submission as any).fileData);
                              if (previewUrl) window.open(previewUrl, '_blank');
                            }}
                            className="p-1.5 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                            title={`Preview submitted file: ${submission.fileName}`}
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSubmission(submission.id, asg.title)}
                          className="px-2 py-1.5 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold border border-amber-200 dark:border-amber-800"
                          title="Delete submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Del Sub</span>
                        </button>
                      </>
                    )}

                    <button
                      id={`delete-asg-card-btn-${asg.id}`}
                      onClick={() => setAsgToDelete(asg)}
                      className="px-2 py-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold border border-rose-200 dark:border-rose-900/60"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <button
                    id={`submit-asg-btn-${asg.id}`}
                    onClick={() => onOpenSubmitModal(asg)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{submission ? 'Resubmit' : 'Submit File'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Assignment Modal */}
      {asgToDelete && (
        <div
          id="delete-asg-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Assignment?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Remove assignment &ldquo;{asgToDelete.title}&rdquo; ({asgToDelete.courseCode}).
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete this assignment? Any student submissions linked to it will also be deleted.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAsgToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-asg-btn"
                type="button"
                onClick={confirmDeleteAssignment}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
