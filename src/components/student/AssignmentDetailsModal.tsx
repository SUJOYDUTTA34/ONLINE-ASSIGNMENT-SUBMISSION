import React from 'react';
import { Assignment, Submission } from '../../types';
import {
  X,
  Calendar,
  Clock,
  Award,
  FileCheck,
  Download,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';

interface AssignmentDetailsModalProps {
  assignment: Assignment | null;
  userSubmission?: Submission;
  isOpen: boolean;
  onClose: () => void;
  onOpenSubmit: (assignment: Assignment) => void;
}

export const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({
  assignment,
  userSubmission,
  isOpen,
  onClose,
  onOpenSubmit,
}) => {
  if (!isOpen || !assignment) return null;

  const now = new Date();
  const dueDate = new Date(assignment.dueAt);
  const isPastDue = now > dueDate;
  const isSubmitted = !!userSubmission;

  const timeDiff = dueDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const canSubmit = !isSubmitted || (assignment.allowResubmission && (userSubmission?.version || 1) < assignment.maxResubmissions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                {assignment.courseCode}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {assignment.courseName}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {assignment.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <User className="w-3.5 h-3.5" />
              <span>Instructor: {assignment.facultyName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs max-h-[70vh] overflow-y-auto">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <span className="text-slate-400 block mb-1">Max Marks</span>
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                <Award className="w-4 h-4 text-purple-500" />
                {assignment.maxMarks} pts
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <span className="text-slate-400 block mb-1">Submission Deadline</span>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                <Calendar className="w-4 h-4 text-blue-500" />
                {new Date(assignment.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <span className="text-slate-400 block mb-1">Allowed Formats</span>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white uppercase">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                {assignment.allowedFileTypes.join(', ')}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <span className="text-slate-400 block mb-1">Max File Size</span>
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                {assignment.maxFileSizeMb} MB
              </div>
            </div>
          </div>

          {/* Submission Status Alert if submitted */}
          {userSubmission && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-300">
                    You have submitted this assignment ({userSubmission.fileName})
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Submitted at {new Date(userSubmission.submittedAt).toLocaleString()} • Status: {userSubmission.status.toUpperCase()}
                  </p>
                  {userSubmission.grade && (
                    <p className="mt-2 text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Grade: {userSubmission.grade.marksObtained} / {userSubmission.grade.maxMarks} ({userSubmission.grade.percentage}%)
                    </p>
                  )}
                </div>
              </div>
              <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                v{userSubmission.version}
              </span>
            </div>
          )}

          {/* Deadline notice */}
          <div className="p-3.5 rounded-xl border flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>
                {isPastDue ? (
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Deadline passed ({new Date(assignment.dueAt).toLocaleString()})
                  </span>
                ) : (
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Due in <span className="font-bold text-blue-600 dark:text-blue-400">{daysDiff} days</span> ({new Date(assignment.dueAt).toLocaleString()})
                  </span>
                )}
              </span>
            </div>
            <div>
              {assignment.allowLateSubmission ? (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Late submissions allowed (-{assignment.latePenaltyPercentPerDay}% per day)
                </span>
              ) : (
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  Late submissions not permitted
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1.5 text-xs uppercase tracking-wider text-slate-400">
              Description
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
              {assignment.description}
            </p>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1.5 text-xs uppercase tracking-wider text-slate-400">
              Instructions & Requirements
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed">
              {assignment.instructions}
            </div>
          </div>

          {/* Downloadable Resources */}
          {assignment.resources && assignment.resources.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-xs uppercase tracking-wider text-slate-400">
                Downloadable Assignment Materials
              </h3>
              <div className="space-y-2">
                {assignment.resources.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{res.name}</p>
                        <p className="text-[10px] text-slate-400">{res.size} • {res.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const blob = new Blob([`Sample template for ${res.name}`], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = res.name;
                        a.click();
                      }}
                      className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Submit Button */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          {canSubmit ? (
            <button
              id="details-submit-assignment-btn"
              onClick={() => {
                onClose();
                onOpenSubmit(assignment);
                setTimeout(() => {
                  document.getElementById('assignmentFile')?.click();
                }, 100);
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <UploadCloud className="w-4 h-4" />
              {isSubmitted ? 'Resubmit Assignment' : 'Submit Assignment'}
            </button>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Submissions closed or max version reached
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
