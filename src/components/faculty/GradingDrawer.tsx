import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { Submission, Assignment } from '../../types';
import {
  X,
  Award,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  User,
  MessageSquare,
  Lock,
  RotateCcw,
} from 'lucide-react';

interface GradingDrawerProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onGradeSaved: (updatedSubmission: Submission) => void;
}

export const GradingDrawer: React.FC<GradingDrawerProps> = ({
  submission,
  isOpen,
  onClose,
  onGradeSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  if (!isOpen || !submission || !user) return null;

  const assignment = storage.getAssignments().find((a) => a.id === submission.assignmentId);
  const maxMarks = assignment?.maxMarks || 20;

  // Grade Form State
  const [marks, setMarks] = useState<number>(submission.grade?.marksObtained || 0);
  const [feedback, setFeedback] = useState(submission.grade?.feedback || '');
  const [privateNotes, setPrivateNotes] = useState(submission.grade?.privateNotes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (submission.grade) {
      setMarks(submission.grade.marksObtained);
      setFeedback(submission.grade.feedback);
      setPrivateNotes(submission.grade.privateNotes || '');
    } else {
      setMarks(Math.round(maxMarks * 0.85)); // convenient default for quick testing
      setFeedback('Good effort on this coursework. Solid implementation and structure.');
      setPrivateNotes('');
    }
  }, [submission, maxMarks]);

  // Calculations
  const percentage = Math.round((marks / maxMarks) * 100);

  // Late penalty adjustment
  let penaltyDeduction = 0;
  if (submission.isLate && submission.latePenaltyPercent > 0) {
    penaltyDeduction = Number(((marks * submission.latePenaltyPercent) / 100).toFixed(1));
  }
  const effectiveMarks = Math.max(0, Number((marks - penaltyDeduction).toFixed(1)));

  const handleDownloadStudentFile = () => {
    if (submission.storedFileName) {
      const a = document.createElement('a');
      a.href = `/uploads/assignments/${submission.storedFileName}`;
      a.download = submission.fileName;
      a.click();
      return;
    }
    const blob = new Blob(
      [`Student submission for ${submission.fileName}\nCourse: ${submission.courseCode}\nStudent: ${submission.studentName} (${submission.studentIdNumber})`],
      { type: submission.fileType || 'application/octet-stream' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = submission.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    setError(null);
    if (marks < 0) {
      setError('Marks obtained cannot be negative.');
      return;
    }
    if (marks > maxMarks) {
      setError(`Marks obtained cannot exceed the maximum mark of ${maxMarks}.`);
      return;
    }

    setIsSaving(true);
    try {
      const updated = storage.gradeSubmission(
        submission.id,
        {
          marksObtained: marks,
          maxMarks,
          feedback: feedback.trim(),
          privateNotes: privateNotes.trim(),
        },
        user
      );

      setIsSaving(false);
      onGradeSaved(updated);
      showToast({
        type: 'success',
        title: 'Grade Recorded',
        message: `Grade (${marks}/${maxMarks}) saved for ${submission.studentName}.`,
      });
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || 'Failed to save grade.');
    }
  };

  return (
    <div id="grading-drawer-backdrop" className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div
        id="grading-drawer-panel"
        className="w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Evaluation & Feedback Studio
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Grade: {submission.studentName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ID: <span className="font-mono">{submission.studentIdNumber}</span> • {submission.courseCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submission Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {submission.assignmentTitle}
              </span>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                v{submission.version}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {submission.fileName}
                </span>
                <span>({submission.fileSize})</span>
              </div>
              <button
                onClick={handleDownloadStudentFile}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400">Submitted:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {new Date(submission.submittedAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-400">Timeliness:</span>
              <span>
                {submission.isLate ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Late ({submission.lateDays} days, -{submission.latePenaltyPercent}%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Submitted On Time
                  </span>
                )}
              </span>
            </div>

            {/* Student's comments */}
            {submission.comments && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-1 font-semibold">Student Notes:</span>
                <p className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 italic text-slate-600 dark:text-slate-300">
                  "{submission.comments}"
                </p>
              </div>
            )}
          </div>

          {/* Grade Entry Form */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Score Assessment
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Marks Obtained *
                </label>
                <div className="relative">
                  <input
                    id="grading-marks-input"
                    type="number"
                    step="0.5"
                    min="0"
                    max={maxMarks}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-semibold">
                    / {maxMarks}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Computed Percentage
                </label>
                <div className="px-3 py-2 text-sm font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-purple-600 dark:text-purple-400 flex items-center justify-between">
                  <span>{percentage}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {percentage >= 90 ? 'Grade A' : percentage >= 80 ? 'Grade B' : percentage >= 70 ? 'Grade C' : 'Grade D'}
                  </span>
                </div>
              </div>
            </div>

            {/* Late Penalty preview if applicable */}
            {submission.isLate && submission.latePenaltyPercent > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>Late penalty deduction (-{submission.latePenaltyPercent}%):</span>
                <span className="font-bold font-mono">
                  -{penaltyDeduction} pts (Net: {effectiveMarks}/{maxMarks})
                </span>
              </div>
            )}

            {/* Student Feedback */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>Student Feedback & Evaluation Notes *</span>
              </label>
              <textarea
                id="grading-feedback-textarea"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what the student did well, areas for improvement, deductions for test failures..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Visible to the student immediately upon saving.
              </p>
            </div>

            {/* Private Notes */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Private Instructor Notes (Internal Only)</span>
              </label>
              <textarea
                rows={2}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Optional notes for TA/co-instructor moderation or grade appeal records..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            Cancel
          </button>

          <button
            id="save-grade-btn"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2"
          >
            {isSaving ? 'Recording...' : 'Publish Grade & Feedback'}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
