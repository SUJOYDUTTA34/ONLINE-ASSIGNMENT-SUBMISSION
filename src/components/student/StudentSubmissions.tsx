import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Submission, Assignment } from '../../types';
import { ReceiptModal } from '../common/ReceiptModal';
import {
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  Award,
  Download,
  Receipt,
  RotateCcw,
  Search,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

interface StudentSubmissionsProps {
  onOpenSubmitModal: (assignment: Assignment) => void;
}

export const StudentSubmissions: React.FC<StudentSubmissionsProps> = ({
  onOpenSubmitModal,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const submissions = storage.getSubmissions().filter((s) => s.studentId === user.id);
  const assignments = storage.getAssignments();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptSubmission, setSelectedReceiptSubmission] = useState<Submission | null>(null);
  const [selectedFeedbackSubmission, setSelectedFeedbackSubmission] = useState<Submission | null>(null);

  const filtered = submissions.filter((s) =>
    s.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadUploadedFile = (s: Submission) => {
    // SECURITY FIX: Force application/octet-stream binary download to prevent inline browser execution
    const blob = new Blob([`Institutional Coursework Submission File: ${s.fileName}\nSubmitted By: ${s.studentName} (${s.studentIdNumber})\nSubmission Timestamp: ${s.submittedAt}\nDigital Receipt: ${s.receiptId}`], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = s.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="student-submissions-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Submission History</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete archive of your submitted coursework, downloadable files, and grading receipts
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          {submissions.length} Total Submissions
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search submissions by assignment title, course, or filename..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Assignment & Course</th>
                <th className="py-3.5 px-4">File Uploaded</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4">Status & Penalty</th>
                <th className="py-3.5 px-4">Grade & Feedback</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <UploadCloud className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No submissions found</p>
                    <p className="text-[11px] text-slate-400">You haven't uploaded coursework matching this query.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const assignment = assignments.find((a) => a.id === s.assignmentId);

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                            {s.courseCode}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">v{s.version}</span>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                          {s.assignmentTitle}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 max-w-[160px]">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {s.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400">{s.fileSize}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {new Date(s.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(s.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        {s.isLate ? (
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              Late ({s.lateDays}d)
                            </span>
                            <p className="text-[10px] text-rose-500 font-medium mt-0.5">
                              -{s.latePenaltyPercent}% late penalty
                            </p>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            On Time
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {s.grade ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                              <Award className="w-3.5 h-3.5 text-purple-500" />
                              <span>{s.grade.marksObtained} / {s.grade.maxMarks}</span>
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                ({s.grade.percentage}%)
                              </span>
                            </div>
                            {s.grade.feedback && (
                              <button
                                onClick={() => setSelectedFeedbackSubmission(s)}
                                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <MessageSquare className="w-3 h-3" />
                                View Faculty Feedback
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Pending Grading
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`view-receipt-btn-${s.id}`}
                            onClick={() => setSelectedReceiptSubmission(s)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                            title="View Official Receipt"
                          >
                            <Receipt className="w-3.5 h-3.5 text-blue-500" />
                            Receipt
                          </button>

                          <button
                            onClick={() => handleDownloadUploadedFile(s)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                            title="Download Uploaded File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {assignment && assignment.allowResubmission && (s.version < assignment.maxResubmissions) && (
                            <button
                              onClick={() => onOpenSubmitModal(assignment)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                              title="Resubmit new version"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Resubmit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        submission={selectedReceiptSubmission}
        isOpen={!!selectedReceiptSubmission}
        onClose={() => setSelectedReceiptSubmission(null)}
      />

      {/* Feedback Dialog */}
      {selectedFeedbackSubmission && selectedFeedbackSubmission.grade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Faculty Evaluation & Feedback
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Graded by {selectedFeedbackSubmission.grade.gradedByName || selectedFeedbackSubmission.grade.facultyName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedbackSubmission(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex justify-between items-center mb-4">
              <span className="text-slate-500 font-medium">Score Awarded</span>
              <span className="font-mono font-bold text-base text-purple-600 dark:text-purple-400">
                {selectedFeedbackSubmission.grade.marksObtained} / {selectedFeedbackSubmission.grade.maxMarks} ({selectedFeedbackSubmission.grade.percentage}%)
              </span>
            </div>

            <div className="space-y-2 mb-6">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Detailed Feedback:
              </label>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedFeedbackSubmission.grade.feedback}
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => setSelectedFeedbackSubmission(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
              >
                Close Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
