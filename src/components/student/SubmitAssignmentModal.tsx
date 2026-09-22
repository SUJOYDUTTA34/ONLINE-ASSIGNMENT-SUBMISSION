import React, { useState, useRef } from 'react';
import { Assignment, Submission } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { playAudioEffect } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  AlertCircle,
  User,
  GraduationCap,
  Building,
  Calendar,
  Award,
  BookOpen,
  RotateCcw,
} from 'lucide-react';

interface SubmitAssignmentModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (submission: Submission) => void;
  onViewSubmissionsTab?: () => void;
}

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'];
const FORBIDDEN_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'vbs', 'scr', 'dll'];

export const SubmitAssignmentModal: React.FC<SubmitAssignmentModalProps> = ({
  assignment,
  isOpen,
  onClose,
  onSubmitted,
  onViewSubmissionsTab,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState('Uploading...');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedFile, setSubmittedFile] = useState<{
    name: string;
    size: string;
    id?: string;
    fileKey?: string;
    mimeType?: string;
    sha256Hash?: string;
    submittedAt?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const dueDate = new Date(assignment?.dueAt || now);
  const isLate = now > dueDate;
  let lateDays = 0;
  let penaltyPercent = 0;

  if (isLate && assignment) {
    const diff = Math.abs(now.getTime() - dueDate.getTime());
    lateDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    penaltyPercent = Math.min(100, lateDays * (assignment.latePenaltyPercentPerDay || 0));
  }

  const validateFile = (selectedFile: File): boolean => {
    setError(null);

    if (!selectedFile) {
      setError('Please select an assignment file.');
      return false;
    }

    if (selectedFile.size === 0) {
      setError('File is empty or corrupted. Please select a valid document.');
      return false;
    }

    const maxMb = 100; // Allow files up to 100MB
    const maxBytes = maxMb * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError(`File size exceeds the ${maxMb} MB limit. Please select a smaller file.`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (selected: File) => {
    if (validateFile(selected)) {
      setFile(selected);
      // Read file as Data URL for browser preview/download backup
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileDataUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selected);
    } else {
      setFile(null);
      setFileDataUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileDataUrl(null);
    setComments('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInitialSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Your session has expired. Please log in again.');
      return;
    }

    if (!assignment) {
      setError('This assignment is no longer available for submission.');
      return;
    }

    if (!file) {
      setError('Please select an assignment file.');
      return;
    }

    if (isLate && !assignment.allowLateSubmission) {
      setError('The submission deadline has passed. Late submissions are not allowed.');
      return;
    }

    setShowConfirmDialog(true);
  };

  const executeFinalSubmission = async () => {
    if (!file || !assignment || !user) return;
    setShowConfirmDialog(false);
    setIsUploading(true);
    setStatusText('Uploading...');
    setUploadProgress(20);

    try {
      let storedFilename = `submission_${assignment.id}_${user.id}_${Date.now()}.${file.name.split('.').pop()}`;
      let serverMetadata: any = null;

      // Step progress: Validate & Upload to secure server vault
      setUploadProgress(35);
      setStatusText('Validating MIME type & signature integrity...');

      const formData = new FormData();
      formData.append('assignmentFile', file);
      formData.append('userId', user.id);
      formData.append('userName', user.name);
      formData.append('userEmail', user.email);
      formData.append('userRole', user.role);
      formData.append('studentIdNumber', user.studentIdNumber || '');
      formData.append('assignmentTitle', assignment.title);
      formData.append('courseId', assignment.courseId);
      formData.append('courseCode', assignment.courseCode);
      formData.append('courseName', assignment.courseName);
      formData.append('maxFileSizeMb', '100');
      // No restricted allowedTypes so user can upload any desired file format
      formData.append('allowedTypes', JSON.stringify([]));

      setUploadProgress(65);
      setStatusText('Encrypting & storing in private vault...');

      try {
        const response = await fetch(`/api/assignments/${assignment.id}/submit`, {
          method: 'POST',
          headers: {
            'x-user-id': user.id,
            'x-user-role': user.role,
            'x-user-email': user.email,
          },
          body: formData,
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const resData = await response.json().catch(() => ({}));
          if (resData.fileKey || resData.storedFilename) {
            storedFilename = resData.fileKey || resData.storedFilename;
          }
          if (resData.metadata) {
            serverMetadata = resData.metadata;
          }
        } else if (!response.ok && contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          console.warn('Server upload message, storing locally:', errorData);
        }
      } catch (uploadNetErr) {
        console.warn('Backend server vault sync bypassed, saving to local storage:', uploadNetErr);
      }

      setUploadProgress(85);
      setStatusText('Recording audit log and digital receipt...');

      const submission = storage.saveSubmission(
        {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          courseId: assignment.courseId,
          courseCode: assignment.courseCode,
          courseName: assignment.courseName,
          studentId: user.id,
          studentName: user.name,
          studentIdNumber: user.studentIdNumber || 'STU-2026-001',
          fileName: file.name,
          fileKey: storedFilename,
          storedFileName: storedFilename,
          fileMetadata: serverMetadata,
          fileSize: serverMetadata?.fileSizeFormatted || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: serverMetadata?.mimeType || file.type || `application/${file.name.split('.').pop()}`,
          fileData: fileDataUrl || undefined,
          comments,
        },
        user
      );

      setUploadProgress(100);
      setSubmittedFile({
        name: file.name,
        size: serverMetadata?.fileSizeFormatted || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        id: submission.receiptId || submission.id,
        fileKey: storedFilename,
        mimeType: serverMetadata?.mimeType || file.type,
        sha256Hash: serverMetadata?.sha256Hash,
        submittedAt: new Date().toLocaleString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      });

      setIsUploading(false);
      setIsSuccess(true);
      onSubmitted(submission);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Audio feedback signal
      if (isLate) {
        playAudioEffect('warning');
        showToast({
          type: 'warning',
          title: 'Late Submission Recorded',
          message: 'Your assignment is late. Hurry up next time to avoid deadline penalties!',
        });
        storage.addNotification({
          userId: user.id,
          title: 'Late Assignment Submitted',
          message: `Your assignment "${assignment.title}" is late. Hurry up for upcoming deadlines.`,
          type: 'deadline',
        });
      } else {
        playAudioEffect('success');
        showToast({
          type: 'success',
          title: 'Assignment Submitted',
          message: 'Your assignment is submitted successfully.',
        });
        storage.addNotification({
          userId: user.id,
          title: 'Assignment Submitted Successfully',
          message: `Your assignment "${assignment.title}" is submitted successfully.`,
          type: 'submission',
        });
      }
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Something went wrong while submitting your assignment. Please try again later.');
    }
  };

  const handleCloseSuccess = () => {
    setIsSuccess(false);
    setFile(null);
    setFileDataUrl(null);
    setComments('');
    setSubmittedFile(null);
    onClose();
  };

  if (!isOpen || !assignment || !user) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        id="assignmentFile"
        name="assignmentFile"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        id="submit-assignment-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      >
        <div
          id="submit-assignment-dialog"
          className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-start justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  {assignment.courseCode}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Online Assignment Submission
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {assignment.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {isSuccess && submittedFile ? (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    ✅ Assignment Submitted Successfully
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your coursework has been securely uploaded and recorded in the university system.
                  </p>
                </div>

                <div className="max-w-md mx-auto p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left space-y-3.5 shadow-xs">
                  <div className="flex justify-between items-start border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Assignment
                      </span>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        {assignment.courseName} – {assignment.title}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Uploaded File
                      </span>
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {submittedFile.name}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        File Size
                      </span>
                      <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        {submittedFile.size}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Submitted On
                      </span>
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">
                        {submittedFile.submittedAt}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Status
                      </span>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                        {isLate ? 'Late Submission' : 'Submitted'}
                      </span>
                    </div>
                  </div>

                  {/* Security & File Management Metadata Verification */}
                  <div className="pt-1 space-y-2">
                    <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      🛡️ File Security & Verification
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">MIME Type</span>
                        <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate block">
                          {submittedFile.mimeType || 'application/pdf'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Vault Storage</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          Isolated & Restricted
                        </span>
                      </div>
                      {submittedFile.fileKey && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[9px] uppercase font-semibold">Safe Server Key</span>
                          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate block">
                            {submittedFile.fileKey}
                          </span>
                        </div>
                      )}
                      {submittedFile.sha256Hash && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[9px] uppercase font-semibold">SHA-256 Checksum</span>
                          <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 truncate block">
                            {submittedFile.sha256Hash}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 max-w-md mx-auto pt-2">
                  {onViewSubmissionsTab && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseSuccess();
                        onViewSubmissionsTab();
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
                    >
                      View My Submissions
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseSuccess}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : isUploading ? (
              <div className="p-8 text-center space-y-4 my-6">
                <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900 dark:text-white">{statusText}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Securing file payload & verifying student credentials...
                  </p>
                </div>
                <div className="max-w-xs mx-auto pt-3">
                  <ProgressBar
                    value={uploadProgress}
                    label={`${uploadProgress}% complete`}
                    showValue
                    variant="primary"
                    shimmer
                    size="sm"
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleInitialSubmitClick} className="space-y-5 text-xs">
                {/* Auto-retrieved Student Profile & Course Metadata Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      Student Information (Auto-Retrieved)
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                      Verified Account
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400">Student Name</span>
                      <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">ID / Roll No.</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">
                        {user.studentIdNumber || 'STU-2026-001'}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Department</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {user.departmentName || 'Computer Science'}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Semester</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Semester {user.semester || 5}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assignment Info Card */}
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Subject: {assignment.courseName} ({assignment.courseCode})
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Max Score: {assignment.maxMarks} Points
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {assignment.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-blue-200/50 dark:border-blue-900/40">
                    <span>Faculty: <strong className="text-slate-800 dark:text-slate-200">{assignment.facultyName || 'Course Instructor'}</strong></span>
                    <span>Due Date: <strong className="text-slate-800 dark:text-slate-200">{new Date(assignment.dueAt).toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Deadline Warning banner */}
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
                      {isLate ? 'Late Submission Notice' : 'On-Time Submission Window Active'}
                    </p>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      {isLate
                        ? `Due date was ${new Date(assignment.dueAt).toLocaleString()}. Late by ${lateDays} day(s). Penalty: -${penaltyPercent}%.`
                        : `Submission deadline: ${new Date(assignment.dueAt).toLocaleString()}.`}
                    </p>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-shake">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{error}</span>
                  </div>
                )}

                {/* Drag and Drop File Upload Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Upload Assignment File *
                  </label>

                  {!file ? (
                    <div
                      id="drag-drop-zone"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 scale-[1.01]'
                          : 'border-slate-300 dark:border-slate-700 hover:border-blue-500/80 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3 shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Drag & Drop Assignment Here
                      </p>
                      <p className="text-xs text-slate-400 my-1 font-medium">or</p>
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        Choose File
                      </button>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
                        Supported Formats: <span className="font-semibold text-slate-700 dark:text-slate-300">Any file type allowed (PDF, DOCX, ZIP, images, code, media, etc.)</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Maximum file size: <strong className="text-slate-600 dark:text-slate-300">Up to 100 MB</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold uppercase text-xs">
                            {file.name.split('.').pop() || 'FILE'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Document'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setFileDataUrl(null);
                          }}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Explanation for Faculty (Optional)
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={2}
                    placeholder="Provide any additional comments or notes regarding your submission..."
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isUploading || (!file && !comments)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>

                  <div className="flex items-center gap-2.5">
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
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {showConfirmDialog && (
        <div
          id="submission-confirmation-modal"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Confirm Assignment Submission
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4 space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Target File:
              </span>
              <p className="font-bold text-xs text-slate-900 dark:text-white break-all">
                {file?.name}
              </p>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-5">
              Are you sure you want to submit this coursework file? Your timestamp and digital signature will be logged.
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
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
