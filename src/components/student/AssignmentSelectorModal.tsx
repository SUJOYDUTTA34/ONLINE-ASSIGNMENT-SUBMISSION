import React, { useState } from 'react';
import { Assignment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import {
  X,
  UploadCloud,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface AssignmentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAssignment: (assignment: Assignment) => void;
}

export const AssignmentSelectorModal: React.FC<AssignmentSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectAssignment,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !user) return null;

  const assignments = storage
    .getAssignments(user)
    .filter((a) => a.status === 'published');

  const studentSubmissions = storage.getSubmissions().filter((s) => s.studentId === user.id);

  const filteredAssignments = assignments.filter((a) => {
    const titleMatch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = a.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || codeMatch;
  });

  return (
    <div
      id="assignment-selector-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="assignment-selector-dialog"
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Select Assignment to Submit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose active coursework from your enrolled courses
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by assignment title or course code..."
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Assignments List */}
          <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No published assignments found
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Check back later when your professors post new coursework.
                </p>
              </div>
            ) : (
              filteredAssignments.map((asg) => {
                const submission = studentSubmissions.find((s) => s.assignmentId === asg.id);
                const isOverdue = new Date() > new Date(asg.dueAt);

                return (
                  <div
                    key={asg.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900">
                          {asg.courseCode}
                        </span>

                        {submission ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Submitted v{submission.version}
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Pending
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {asg.title}
                      </h3>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          Due: {new Date(asg.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>•</span>
                        <span>{asg.maxMarks} Points</span>
                      </div>
                    </div>

                    <button
                      id={`select-submit-btn-${asg.id}`}
                      onClick={() => {
                        onSelectAssignment(asg);
                        onClose();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      {submission ? 'Resubmit' : 'Submit'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
