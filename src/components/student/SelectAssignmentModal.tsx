import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Assignment, Course } from '../../types';
import {
  X,
  UploadCloud,
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  BookOpen,
  PlusCircle,
  Layers,
} from 'lucide-react';

interface SelectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAssignmentForSubmission: (assignment: Assignment) => void;
}

export const SelectAssignmentModal: React.FC<SelectAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSelectAssignmentForSubmission,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');

  if (!isOpen || !user) return null;

  const allCourses = storage.getCourses();
  const enrolledCourses = allCourses.filter(
    (c) =>
      c.enrolledStudentIds?.includes(user.id) ||
      (user.enrolledCourseIds && user.enrolledCourseIds.includes(c.id)) ||
      user.role === 'admin'
  );
  const activeCourses = enrolledCourses.length > 0 ? enrolledCourses : allCourses;

  const assignments = storage
    .getAssignments(user)
    .filter((a) => a.status === 'published');

  const studentSubmissions = storage.getSubmissions().filter((s) => s.studentId === user.id);

  // Filter assignments based on search and selected course
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCourseId !== 'ALL' && a.courseId !== selectedCourseId) return false;
    return true;
  });

  const handleCreateAndSubmitForCourse = (course: Course) => {
    // Check if an assignment already exists for this course
    const existing = assignments.find((a) => a.courseId === course.id);
    if (existing) {
      onSelectAssignmentForSubmission(existing);
      onClose();
      setTimeout(() => {
        document.getElementById('assignmentFile')?.click();
      }, 150);
      return;
    }

    // Auto-create an assignment for this course
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const newAsg: Assignment = {
      id: `asg-${Date.now()}`,
      courseId: course.id,
      courseCode: course.code || course.courseCode || 'COURSE',
      courseName: course.title || course.courseName || 'Coursework',
      facultyId: course.facultyId || (course.facultyIds && course.facultyIds[0]) || user.id,
      facultyName: course.facultyName || 'Course Instructor',
      title: `${course.code || course.courseCode} — Coursework & Assignment Submission`,
      description: `Submit assignments, project files, or coursework exercises for ${course.title || course.courseName}.`,
      instructions: 'Upload your completed coursework document or zip archive up to 100 MB.',
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
    onSelectAssignmentForSubmission(saved);
    onClose();
    setTimeout(() => {
      document.getElementById('assignmentFile')?.click();
    }, 150);
  };

  return (
    <AnimatePresence>
      <div
        id="select-assignment-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      >
        <motion.div
          id="select-assignment-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Submit Coursework
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                    All Enrolled Courses Available
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a course and assignment to upload and submit your file
                </p>
              </div>
            </div>
            <button
              id="close-select-assignment-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="select-assignment-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course code, name, or assignment title..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Course Selector Dropdown */}
              <select
                id="select-assignment-course-filter"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">📚 All Courses ({activeCourses.length})</option>
                {activeCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code || c.courseCode} — {c.title || c.courseName}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Course Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
              <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 mr-1">
                <Layers className="w-3 h-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCourseId('ALL')}
                className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                  selectedCourseId === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {activeCourses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                    selectedCourseId === c.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {c.code || c.courseCode}
                </button>
              ))}
            </div>
          </div>

          {/* Body List */}
          <div className="p-5 space-y-3 overflow-y-auto flex-1">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Assignments Found for this Filter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {selectedCourseId !== 'ALL'
                    ? 'This course has not published an assignment yet. You can instantly create and submit coursework for it below.'
                    : 'No published assignments found matching your search.'}
                </p>

                {selectedCourseId !== 'ALL' && (
                  <div className="mt-4">
                    {(() => {
                      const selCourse = activeCourses.find((c) => c.id === selectedCourseId);
                      if (!selCourse) return null;
                      return (
                        <button
                          onClick={() => handleCreateAndSubmitForCourse(selCourse)}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Upload & Submit Coursework for {selCourse.code || selCourse.courseCode}
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              filteredAssignments.map((asg) => {
                const submission = studentSubmissions.find((s) => s.assignmentId === asg.id);
                const isOverdue = new Date() > new Date(asg.dueAt);

                return (
                  <div
                    key={asg.id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {asg.courseCode}
                        </span>

                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {asg.courseName}
                        </span>

                        {submission ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 ml-auto sm:ml-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Submitted (v{submission.version})
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1 ml-auto sm:ml-0">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1 ml-auto sm:ml-0">
                            <Clock className="w-3 h-3" />
                            Pending Submission
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {asg.title}
                      </h3>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          Due: {new Date(asg.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>•</span>
                        <span>Max Marks: {asg.maxMarks}</span>
                        <span>•</span>
                        <span>Max Size: {asg.maxFileSizeMb || 100} MB</span>
                      </div>
                    </div>

                    <button
                      id={`select-asg-submit-btn-${asg.id}`}
                      onClick={() => {
                        onSelectAssignmentForSubmission(asg);
                        onClose();
                        setTimeout(() => {
                          document.getElementById('assignmentFile')?.click();
                        }, 100);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{submission ? 'Resubmit File' : 'Upload & Submit'}</span>
                      <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                );
              })
            )}

            {/* If there are courses in activeCourses that have no assignments in filtered list, show a shortcut for them */}
            {selectedCourseId === 'ALL' && activeCourses.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Quick Submit by Enrolled Course:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCourses.map((c) => {
                    const hasAsg = assignments.some((a) => a.courseId === c.id);
                    return (
                      <button
                        key={`quick-course-${c.id}`}
                        onClick={() => handleCreateAndSubmitForCourse(c)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 text-left transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block truncate">
                            {c.code || c.courseCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {c.title || c.courseName}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          Submit Work →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
