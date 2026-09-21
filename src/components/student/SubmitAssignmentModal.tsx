import React, { useState, useRef } from 'react';
import { Assignment, Submission } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import confetti from 'canvas-confetti';
import { ProgressBar } from '@/components/ui/progress-bar';
import { sanitizeFileName } from '../../lib/security';
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  AlertCircle,
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedFile, setSubmittedFile] = useState<{ name: string; size: string; id?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Always render the hidden input so external triggers can find it
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        id="assignmentFile"
        name="assignmentFile"
        onChange={async (e) => {
          if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            const isValid = await validateFile(selected);
            if (isValid) {
              setFile(selected);
            } else {
              setFile(null);
            }
          }
        }}
        className="hidden"
      />

      {!isOpen || !assignment || !user ? null : (
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

  // Check magic bytes asynchronously to verify it is actually a PDF file
  const checkIsActualPdf = (selectedFile: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = (e) => {
        if (e.target?.readyState === FileReader.DONE) {
          const arr = new Uint8Array(e.target.result as ArrayBuffer);
          // Header should start with "%PDF"
          // '%' = 0x25, 'P' = 0x50, 'D' = 0x44, 'F' = 0x46
          if (
            arr.length >= 4 &&
            arr[0] === 0x25 &&
            arr[1] === 0x50 &&
            arr[2] === 0x44 &&
            arr[3] === 0x46
          ) {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile.slice(0, 4));
    });
  };

  const validateFile = async (selectedFile: File): Promise<boolean> => {
    setError(null);

    // 1. Extension check
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') {
      setError('Only PDF files are allowed.');
      return false;
    }

    // 2. Binary PDF magic signature check
    const isActualPdf = await checkIsActualPdf(selectedFile);
    if (!isActualPdf) {
      setError('Only PDF files are allowed.');
      return false;
    }

    // 3. Size validation (10 MB limit)
    const maxSizeMb = 10;
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError('File is too large. Maximum allowed size is 10 MB.');
      return false;
    }

    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const isValid = await validateFile(selected);
      if (isValid) {
        setFile(selected);
      } else {
        setFile(null);
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const isValid = await validateFile(dropped);
      if (isValid) {
        setFile(dropped);
      } else {
        setFile(null);
      }
    }
  };

  const handleInitialSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file before submitting.');
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
    setUploadProgress(15);

    try {
      // 1. Prepare Multipart Form Data
      const formData = new FormData();
      formData.append('assignmentFile', file);

      setUploadProgress(40);

      // 2. Perform Actual REST API call
      const response = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || 'The selected file is not a valid PDF document. Please select a valid PDF file.');
      }

      setUploadProgress(100);

      // 3. Register in Local Storage with server-side secure file credentials
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
          fileName: file.name, // Keep the student's original clean name for viewing
          storedFileName: resData.storedFilename, // Server-controlled secure file path
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: 'application/pdf',
          comments,
        },
        user
      );

      setSubmittedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        id: resData.submissionId || `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      });
      setIsUploading(false);
      setIsSuccess(true);

      // Trigger success call to layout
      onSubmitted(submission);

      // Confetti celebration
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
        message: `Receipt #${submission.receiptId || resData.submissionId} generated successfully.`,
      });
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Something went wrong while submitting your assignment. Please try again later.');
    }
  };

  const handleCloseSuccess = () => {
    setIsSuccess(false);
    setFile(null);
    setComments('');
    setSubmittedFile(null);
    onClose();
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

          {isSuccess && submittedFile ? (
            /* Successful submission */
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Assignment Submitted Successfully
                </h3>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-left space-y-3">
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                    File:
                  </span>
                  <p className="font-semibold text-xs text-slate-900 dark:text-white break-all">
                    {submittedFile.name}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                    Submitted:
                  </span>
                  <p className="font-semibold text-xs text-slate-900 dark:text-white">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                {submittedFile.id && (
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                      Submission ID:
                    </span>
                    <p className="font-semibold text-xs text-slate-900 dark:text-white font-mono">
                      {submittedFile.id}
                    </p>
                  </div>
                )}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                    Status:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                    Submitted
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseSuccess}
                className="w-full px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs transition-colors"
              >
                Close Portal
              </button>
            </div>
          ) : isUploading ? (
            /* Uploading state */
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">Uploading assignment...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Please wait...</p>
              </div>
              <div className="max-w-xs mx-auto pt-2">
                <ProgressBar
                  value={uploadProgress}
                  label="Securing transaction receipt..."
                  showValue
                  variant="primary"
                  shimmer
                  size="sm"
                />
              </div>
            </div>
          ) : (
            /* Form view */
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
                  accept="application/pdf,.pdf"
                  id="assignmentFile"
                  name="assignmentFile"
                  onChange={handleFileChange}
                  className="hidden"
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
                      Allowed types: <span className="font-semibold uppercase">PDF</span> (Max 10 MB)
                    </p>
                  </div>
                ) : (
                  /* After the student selects a file */
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 min-w-0 flex-1">
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Selected File:
                          </span>
                          <p className="font-bold text-sm text-slate-900 dark:text-white break-all flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                            {file.name}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                              File Type:
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 font-bold text-[11px]">
                              PDF
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                              File Size:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        disabled={isUploading}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                        title="Remove file"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Submission Notes / Comments for Faculty (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  placeholder="Include any notes or explanations for your professor..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  id="modal-final-submit-btn"
                  type="submit"
                  disabled={isUploading || !file}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  Submit Assignment
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmDialog && (
        <div id="submission-confirmation-modal" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Submit this assignment?
            </h3>

            <div className="mb-4">
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                File:
              </span>
              <p className="font-semibold text-sm text-slate-900 dark:text-white break-all">
                {file?.name}
              </p>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-6">
              Are you sure you want to submit this PDF?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                id="confirm-submit-dialog-btn"
                type="button"
                onClick={executeFinalSubmission}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
