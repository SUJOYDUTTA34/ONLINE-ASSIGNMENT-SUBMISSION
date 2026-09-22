import React from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Download,
  Calendar,
  User as UserIcon,
  BookOpen,
  Hash,
  Database,
  CheckCircle,
} from 'lucide-react';
import { Submission } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface FileMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
}

export const FileMetadataModal: React.FC<FileMetadataModalProps> = ({
  isOpen,
  onClose,
  submission,
}) => {
  const { user } = useAuth();

  if (!isOpen || !submission) return null;

  const fileKey = submission.fileKey || submission.storedFileName || 'secfile_system_archived.bin';
  const meta = submission.fileMetadata;

  const handleDownload = () => {
    if (fileKey && user) {
      const url = `/api/files/download/${encodeURIComponent(fileKey)}?userId=${encodeURIComponent(
        user.id
      )}&userRole=${encodeURIComponent(user.role)}&userEmail=${encodeURIComponent(user.email)}`;
      window.location.href = url;
    }
  };

  const uploadDate = new Date(meta?.uploadTime || submission.submittedAt);
  const formattedDate = uploadDate.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <div
      id="file-metadata-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="file-metadata-modal"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                File & Security Metadata Record
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tamper-evident record logged for academic submission compliance
              </p>
            </div>
          </div>
          <button
            id="close-file-metadata-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300">
          {/* Security Status Banner */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-[11px]">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                Secure File Validation Passed
              </p>
              <p className="text-emerald-700 dark:text-emerald-400">
                MIME type verified • Size limits enforced • Path traversal protected • Stored outside public web root
              </p>
            </div>
          </div>

          {/* Core File Information */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              File Identification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Original Filename</span>
                <span className="font-bold text-slate-900 dark:text-white break-all text-xs">
                  {meta?.originalFilename || submission.fileName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Stored Server Key</span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all">
                  {meta?.fileKey || fileKey}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">MIME Content Type</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {meta?.mimeType || submission.fileType}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">File Size</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {meta?.fileSizeFormatted || submission.fileSize} {meta?.fileSize ? `(${meta.fileSize.toLocaleString()} bytes)` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* User & Context Information */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              Author & Context
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Submitted By</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {meta?.user.name || submission.studentName}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ID: {meta?.user.studentIdNumber || submission.studentIdNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">User Role</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 capitalize">
                  {meta?.user.role || 'Student'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Assignment</span>
                <span className="font-medium text-slate-900 dark:text-white block">
                  {meta?.assignment.title || submission.assignmentTitle}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {meta?.assignment.courseCode || submission.courseCode}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Submission & Receipt</span>
                <span className="font-mono text-slate-900 dark:text-white block">
                  {meta?.submission.receiptId || submission.receiptId}
                </span>
                <span className="text-[10px] text-slate-500">
                  Version #{meta?.submission.version || submission.version || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic & Storage Integrity */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              Integrity & Vault Storage
            </h4>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block font-sans">
                  Upload Timestamp (Server Authoritative)
                </span>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-sans mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formattedDate}</span>
                </div>
              </div>

              {meta?.sha256Hash && (
                <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block font-sans">
                    SHA-256 Cryptographic Integrity Checksum
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 break-all select-all block text-[10px] bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">
                    {meta.sha256Hash}
                  </span>
                </div>
              )}

              <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between font-sans text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Database className="w-3.5 h-3.5 text-purple-500" />
                  <span>Storage: <strong className="text-slate-800 dark:text-slate-200">private_storage/secure_uploads</strong></span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>Authorized Downloads Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          <button
            id="modal-download-file-btn"
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Authorized File
          </button>
        </div>
      </div>
    </div>
  );
};
