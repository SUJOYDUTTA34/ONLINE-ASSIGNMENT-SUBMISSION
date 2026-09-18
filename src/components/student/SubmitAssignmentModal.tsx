import React, { useState, useRef } from 'react';
import { Assignment, Submission } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import confetti from 'canvas-confetti';
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface SubmitAssignmentModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (submission: Submission) => void;
}

export const SubmitAssignmentModal: React.FC<SubmitAssignmentModalProps> = ({
  assignment,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [file, setFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !assignment || !user) return null;

  const now = new Date();
  const dueDate = new Date(assignment.dueAt);
  const isLate = now > dueDate;
  let lateDays = 0;
  let penaltyPercent = 0;

  if (isLate) {
    const diff = Math.abs(now.getTime() - dueDate.getTime());
    lateDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    penaltyPercent = Math.min(100, lateDays * (assignment.latePenaltyPercentPerDay || 0));
  }

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

    // Validate type
    const isAllowedExt = assignment.allowedFileTypes.some(
      (type) => type.toLowerCase() === ext || ext.includes(type.toLowerCase())
    );

    if (!isAllowedExt) {
      setError(
        `Invalid file type ".${ext}". Allowed file formats: ${assignment.allowedFileTypes.join(', ').toUpperCase()}`
      );
      return false;
    }

    // Validate size
    const maxBytes = assignment.maxFileSizeMb * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError(
        `File size (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum permitted size of ${assignment.maxFileSizeMb} MB.`
      );
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (validateFile(selected)) {
        setFile(selected);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (validateFile(dropped)) {
        setFile(dropped);
      }
    }
  };

  const handleInitialSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a coursework file to upload.');
      return;
    }
    if (isLate && !assignment.allowLateSubmission) {
      setError('The deadline has passed and late submissions are not allowed.');
      return;
    }
    setShowConfirmDialog(true);
  };

  const executeFinalSubmission = async () => {
    if (!file) return;
    setShowConfirmDialog(false);
    setIsUploading(true);

    // Simulate upload progress
    for (let p = 20; p <= 100; p += 25) {
      setUploadProgress(p);
      await new Promise((r) => setTimeout(r, 100));
    }

    try {
      const submission = storage.saveSubmission(
        {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          courseId: assignment.courseId,
          courseCode: assignment.courseCode,
          courseName: assignment.courseName,
          studentId: user.id,
          studentName: user.name,
          studentIdNumber: user.studentIdNumber || 'STU-001',
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: file.type || 'application/octet-stream',
          comments,
        },
        user
      );

      setIsUploading(false);
      onSubmitted(submission);
      onClose();

      // Confetti celebration for student delight!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe if confetti unavailable
      }

      showToast({
        type: 'success',
        title: 'Assignment Submitted!',
        message: `Receipt #${submission.receiptId} generated successfully.`,
      });
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Failed to submit assignment.');
    }
  };

  return (
    <>
      <div id="submit-assignment-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <div
          id="submit-assignment-dialog"
          className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  {assignment.courseCode}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Submission Portal
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Submit: {assignment.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleInitialSubmitClick} className="p-6 space-y-5 text-xs">
            {/* Deadline status reminder */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isLate
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isLate ? 'Late Submission Warning' : 'On-Time Submission Window'}
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {isLate
                    ? `Deadline was ${new Date(assignment.dueAt).toLocaleString()}. Late by ${lateDays} day(s). Penalty: -${penaltyPercent}% of max marks.`
                    : `Due date: ${new Date(assignment.dueAt).toLocaleString()}. Submission will be tagged On-Time.`}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag and drop upload zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Upload File *
              </label>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept={assignment.allowedFileTypes.map((t) => `.${t}`).join(',')}
              />

              {!file ? (
                <div
                  id="drag-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-blue-500/60 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Allowed types: <span className="font-semibold uppercase">{assignment.allowedFileTypes.join(', ')}</span> (Max {assignment.maxFileSizeMb} MB)
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Upload Progress Bar (when active) */}
            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Uploading file to secure server...</span>
                  <span className="font-mono font-bold">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Comments Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Submission Notes / Comments for Faculty (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Include any compilation flags, edge case notes, or explanations for your professor..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                id="modal-final-submit-btn"
                type="submit"
                disabled={isUploading || !file}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? 'Submitting...' : 'Submit Assignment'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog Modal as explicitly specified in Prompt Section 8 */}
      {showConfirmDialog && (
        <div id="submission-confirmation-modal" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Confirm Assignment Submission
            </h3>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Are you sure you want to submit <span className="font-bold text-slate-900 dark:text-white">"{file?.name}"</span> for <span className="font-bold text-slate-900 dark:text-white">{assignment.title}</span>?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-5 text-[11px] text-slate-500 dark:text-slate-400">
              {assignment.allowResubmission ? (
                <span>Resubmission is enabled for this course (Max {assignment.maxResubmissions} versions).</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Notice: Resubmission is disabled for this assignment. After submitting, editing will not be allowed.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                Back to Edit
              </button>
              <button
                id="confirm-submit-dialog-btn"
                type="button"
                onClick={executeFinalSubmission}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
