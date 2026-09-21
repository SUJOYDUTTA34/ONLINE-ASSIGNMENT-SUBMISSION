import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Assignment } from '../../types';
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

  if (!isOpen || !user) return null;

  const courses = storage.getCourses().filter((c) => c.enrolledStudentIds.includes(user.id));
  const enrolledCourseIds = courses.map((c) => c.id);

  const assignments = storage
    .getAssignments()
    .filter((a) => a.status === 'published' && enrolledCourseIds.includes(a.courseId));

  const studentSubmissions = storage.getSubmissions().filter((s) => s.studentId === user.id);

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit Coursework
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an active assignment to upload your file
                </p>
              </div>
            </div>
            <button
              id="close-select-assignment-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="select-assignment-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by assignment name or course code..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No active assignments found
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    There are no published coursework tasks matching your filter.
                  </p>
                </div>
              ) : (
                filteredAssignments.map((asg) => {
                  const submission = studentSubmissions.find((s) => s.assignmentId === asg.id);
                  const isOverdue = new Date() > new Date(asg.dueAt);

                  return (
                    <div
                      key={asg.id}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {asg.courseCode}
                          </span>

                          {submission ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Submitted (v{submission.version})
                            </span>
                          ) : isOverdue ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {asg.title}
                        </h3>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            Due: {new Date(asg.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span>Max Marks: {asg.maxMarks}</span>
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
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
