import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Submission, Assignment } from '../../types';
import { GradingDrawer } from './GradingDrawer';
import { ReceiptModal } from '../common/ReceiptModal';
import { FileMetadataModal } from '../common/FileMetadataModal';
import {
  Search,
  Filter,
  Download,
  Award,
  UploadCloud,
  CheckCircle2,
  Clock,
  Receipt,
  FileSpreadsheet,
  FileText,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

interface FacultySubmissionsProps {
  initialSubmissionToGrade?: Submission | null;
  onClearInitialSubmission?: () => void;
}

export const FacultySubmissions: React.FC<FacultySubmissionsProps> = ({
  initialSubmissionToGrade,
  onClearInitialSubmission,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const allCourses = storage.getCourses();
  const matchedCourses = user.role === 'admin'
    ? allCourses
    : allCourses.filter(
        (c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id))
      );
  const courses = matchedCourses.length > 0 ? matchedCourses : allCourses;
  const facultyCourseIds = courses.map((c) => c.id);

  const assignments = storage.getAssignments(user);
  const [submissions, setSubmissions] = useState<Submission[]>(() =>
    storage.getSubmissions(user)
  );

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedAssignment, setSelectedAssignment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Grading Drawer State
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(
    initialSubmissionToGrade || null
  );
  const { showToast } = useNotifications();
  const [receiptSubmission, setReceiptSubmission] = useState<Submission | null>(null);
  const [metadataSubmission, setMetadataSubmission] = useState<Submission | null>(null);

  const handleDeleteSubmission = (submissionId: string, studentName: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the submission by ${studentName} for "${title}"?`)) {
      try {
        storage.deleteSubmission(submissionId, user);
        setSubmissions(storage.getSubmissions(user));
        showToast({
          type: 'success',
          title: 'Submission Deleted',
          message: `Submission by ${studentName} for "${title}" has been deleted.`,
        });
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Delete Failed',
          message: err.message || 'Failed to delete submission.',
        });
      }
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    // Search filter
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentIdNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Course filter
    if (selectedCourse !== 'ALL' && s.courseId !== selectedCourse) return false;

    // Assignment filter
    if (selectedAssignment !== 'ALL' && s.assignmentId !== selectedAssignment) return false;

    // Status filter
    if (selectedStatus === 'graded' && s.status !== 'graded') return false;
    if (selectedStatus === 'pending' && s.status === 'graded') return false;
    if (selectedStatus === 'late' && !s.isLate) return false;
    if (selectedStatus === 'ontime' && s.isLate) return false;

    return true;
  });

  const handleGradeSaved = (updated: Submission) => {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setGradingSubmission(null);
    if (onClearInitialSubmission) onClearInitialSubmission();
  };

  const handleDownloadFile = (s: Submission) => {
    const fileKey = s.fileKey || s.storedFileName;
    if (fileKey && user) {
      const url = `/api/files/download/${encodeURIComponent(fileKey)}?userId=${encodeURIComponent(
        user.id
      )}&userRole=${encodeURIComponent(user.role)}&userEmail=${encodeURIComponent(user.email)}`;
      window.location.href = url;
      return;
    }
    const blob = new Blob([`Coursework file for ${s.fileName}\nSubmitted by ${s.studentName}`], {
      type: s.fileType || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = s.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['ReceiptID', 'StudentID', 'StudentName', 'CourseCode', 'AssignmentTitle', 'SubmittedAt', 'IsLate', 'MarksObtained', 'MaxMarks', 'Percentage'];
    const rows = filteredSubmissions.map((s) => [
      s.receiptId,
      s.studentIdNumber,
      `"${s.studentName}"`,
      s.courseCode,
      `"${s.assignmentTitle}"`,
      s.submittedAt,
      s.isLate ? 'YES' : 'NO',
      s.grade?.marksObtained || 'N/A',
      s.grade?.maxMarks || 'N/A',
      s.grade ? `${s.grade.percentage}%` : 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Submissions_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="faculty-submissions-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Submissions & Evaluation Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review student uploads, check timestamps, and record feedback
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV Roster
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, ID number, or assignment..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Course filter */}
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedAssignment('ALL');
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code || c.courseCode} — {c.title || c.courseName}
              </option>
            ))}
          </select>

          {/* Assignment filter */}
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Assignments</option>
            {assignments
              .filter((a) => selectedCourse === 'ALL' || a.courseId === selectedCourse)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.courseCode})
                </option>
              ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Submissions</option>
            <option value="pending">Needs Grading</option>
            <option value="graded">Graded</option>
            <option value="ontime">Submitted On Time</option>
            <option value="late">Submitted Late</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Assignment & Course</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4">File Info</th>
                <th className="py-3.5 px-4">Timeliness</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UploadCloud className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No submissions found</p>
                    <p className="text-[11px] text-slate-400">No student work matches your selected criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                      {s.studentName}
                      <p className="text-[10px] text-slate-400 font-mono font-normal">
                        {s.studentIdNumber}
                      </p>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {s.assignmentTitle}
                      </p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        {s.courseCode} • v{s.version}
                      </p>
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
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {s.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400">{s.fileSize}</p>
                    </td>

                    <td className="py-4 px-4">
                      {s.isLate ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Late ({s.lateDays}d, -{s.latePenaltyPercent}%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          On Time
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {s.grade ? (
                        <div className="flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300 font-mono">
                          <Award className="w-3.5 h-3.5 text-purple-500" />
                          <span>{s.grade.marksObtained}/{s.grade.maxMarks}</span>
                          <span className="text-[10px] text-slate-400">({s.grade.percentage}%)</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unrated</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setReceiptSubmission(s)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                          title="View Submission Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`view-fac-metadata-btn-${s.id}`}
                          onClick={() => setMetadataSubmission(s)}
                          className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                          title="Inspect File Security & Tamper-Evident Metadata"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>

                        {(s.fileKey || s.storedFileName) && (
                          <a
                            href={`/api/files/preview/${encodeURIComponent(s.fileKey || s.storedFileName || '')}?userId=${encodeURIComponent(user.id)}&userRole=${encodeURIComponent(user.role)}&userEmail=${encodeURIComponent(user.email)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center"
                            title="Secure Sandboxed Preview"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                          </a>
                        )}

                        <button
                          id={`download-fac-submission-btn-${s.id}`}
                          onClick={() => handleDownloadFile(s)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                          title="Download Submitted File (Authorized)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`delete-fac-submission-btn-${s.id}`}
                          onClick={() => handleDeleteSubmission(s.id, s.studentName, s.assignmentTitle)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/80 text-red-600 dark:text-red-400 transition-colors"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`grade-submission-btn-${s.id}`}
                          onClick={() => setGradingSubmission(s)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                        >
                          {s.status === 'graded' ? 'Edit Grade' : 'Grade'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grading Drawer */}
      <GradingDrawer
        submission={gradingSubmission}
        isOpen={!!gradingSubmission}
        onClose={() => setGradingSubmission(null)}
        onGradeSaved={handleGradeSaved}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        submission={receiptSubmission}
        isOpen={!!receiptSubmission}
        onClose={() => setReceiptSubmission(null)}
      />

      {/* Security File Metadata Modal */}
      <FileMetadataModal
        submission={metadataSubmission}
        isOpen={!!metadataSubmission}
        onClose={() => setMetadataSubmission(null)}
      />
    </div>
  );
};
