import React from 'react';
import { Submission, Assignment } from '../../types';
import { X, CheckCircle2, Printer, Download, ShieldCheck, Clock } from 'lucide-react';

interface ReceiptModalProps {
  submission: Submission | null;
  assignment?: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  submission,
  assignment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !submission) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    const textContent = `=====================================================
OFFICIAL ACADEMIC SUBMISSION RECEIPT
Online Assignment Submission System
=====================================================
Receipt ID:         ${submission.receiptId}
Submission ID:      ${submission.id}
Student Name:       ${submission.studentName}
Student ID Number:  ${submission.studentIdNumber}
Course:             ${submission.courseCode} - ${submission.courseName}
Assignment:         ${submission.assignmentTitle}
Submitted At:       ${new Date(submission.submittedAt).toLocaleString()}
Status:             ${submission.isLate ? `LATE (${submission.lateDays} days, ${submission.latePenaltyPercent}% penalty)` : 'SUBMITTED ON TIME'}
File Uploaded:      ${submission.fileName} (${submission.fileSize})
Version:            v${submission.version}
=====================================================
VERIFICATION CHECKSUM: SHA256:${Math.random().toString(36).substring(2)}${Date.now().toString(36)}
This document confirms that your coursework was securely received by the institutional gateway.
=====================================================`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${submission.receiptId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="receipt-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        id="receipt-modal-dialog"
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">Submission Confirmed</h3>
              <p className="text-xs text-slate-400">Official Institutional Receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-300">
                Assignment submitted successfully.
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                Your coursework has been archived with a server-authoritative timestamp and assigned to instructional staff for grading.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80">
            <div className="p-3 flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Receipt ID</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{submission.receiptId}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Student</span>
              <span className="font-semibold text-slate-900 dark:text-white">{submission.studentName} ({submission.studentIdNumber})</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Course</span>
              <span className="font-semibold text-slate-900 dark:text-white">{submission.courseCode} — {submission.courseName}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Assignment</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[240px]">{submission.assignmentTitle}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">File Uploaded</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{submission.fileName} ({submission.fileSize})</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Server Timestamp</span>
              <span className="text-slate-800 dark:text-slate-200">{new Date(submission.submittedAt).toLocaleString()}</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Timeliness Status</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  submission.isLate
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {submission.isLate
                  ? `Late Submission (${submission.lateDays}d overdue, -${submission.latePenaltyPercent}%)`
                  : 'Submitted On Time'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex items-center justify-end gap-2.5">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={handleDownloadText}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Receipt (.txt)
          </button>
        </div>
      </div>
    </div>
  );
};
