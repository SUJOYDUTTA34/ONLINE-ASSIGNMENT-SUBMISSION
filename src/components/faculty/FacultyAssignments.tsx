import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { Assignment } from '../../types';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import {
  FileText,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Award,
  UploadCloud,
  Calendar,
} from 'lucide-react';

interface FacultyAssignmentsProps {
  onOpenCreateModal: () => void;
  onSelectAssignmentSubmissions?: (assignmentId: string) => void;
}

export const FacultyAssignments: React.FC<FacultyAssignmentsProps> = ({
  onOpenCreateModal,
  onSelectAssignmentSubmissions,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  if (!user) return null;

  const courses = storage.getCourses().filter(
    (c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id))
  );
  const facultyCourseIds = courses.map((c) => c.id);

  const [assignments, setAssignments] = useState<Assignment[]>(() =>
    storage.getAssignments().filter((a) => facultyCourseIds.includes(a.courseId))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Edit Modal State
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCourse !== 'ALL' && a.courseId !== selectedCourse) return false;
    if (selectedStatus !== 'ALL' && a.status !== selectedStatus) return false;

    return true;
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove assignment "${title}"?`)) {
      storage.deleteAssignment(id, user);
      setAssignments(assignments.filter((a) => a.id !== id));
      showToast({
        type: 'success',
        title: 'Assignment Deleted',
        message: `"${title}" has been deleted.`,
      });
    }
  };

  const handleAssignmentUpdated = (updated: Assignment) => {
    setAssignments(assignments.map((a) => (a.id === updated.id ? updated : a)));
    setEditingAssignment(null);
  };

  return (
    <div id="faculty-assignments-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Assignment Management Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure coursework guidelines, due dates, penalty rules, and submission versions
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Assignment
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments by title or course code..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="ALL">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code || c.courseCode} — {c.title || c.courseName}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      {/* Assignments Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Assignment Title & Course</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Max Marks</th>
                <th className="py-3.5 px-4">Formats & Constraints</th>
                <th className="py-3.5 px-4">Late Policy</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No assignments found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const subsCount = storage
                    .getSubmissions()
                    .filter((s) => s.assignmentId === a.id).length;

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {a.courseCode}
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                          {a.title}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {subsCount} submissions received
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <p className="font-medium">
                          {new Date(a.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(a.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {a.maxMarks} pts
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {a.allowedFileTypes.map((fmt) => (
                            <span
                              key={fmt}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              .{fmt}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Max {a.maxFileSizeMb}MB</p>
                      </td>

                      <td className="py-3.5 px-4">
                        {a.allowLateSubmission ? (
                          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                            Allowed (-{a.latePenaltyPercentPerDay}%/day)
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            No late allowed
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            a.status === 'published'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingAssignment(a)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                            title="Edit Assignment"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id, a.title)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500"
                            title="Delete Assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <CreateAssignmentModal
          isOpen={!!editingAssignment}
          onClose={() => setEditingAssignment(null)}
          onCreated={handleAssignmentUpdated}
          initialAssignment={editingAssignment}
        />
      )}
    </div>
  );
};
