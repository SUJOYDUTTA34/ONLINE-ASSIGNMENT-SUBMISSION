import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { Assignment } from '../../types';
import {
  X,
  PlusCircle,
  Calendar,
  Clock,
  Award,
  FileCheck,
  Upload,
  AlertCircle,
  FileText,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (assignment: Assignment) => void;
  initialAssignment?: Assignment | null;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialAssignment,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const allCourses = storage.getCourses();
  const matchedCourses = user
    ? user.role === 'admin'
      ? allCourses
      : allCourses.filter(
          (c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id))
        )
    : [];
  const facultyCourses = matchedCourses.length > 0 ? matchedCourses : allCourses;

  // Form State
  const [title, setTitle] = useState(initialAssignment?.title || '');
  const [courseId, setCourseId] = useState(
    initialAssignment?.courseId || (facultyCourses[0]?.id || '')
  );
  const [description, setDescription] = useState(initialAssignment?.description || '');
  const [instructions, setInstructions] = useState(initialAssignment?.instructions || '');
  const [maxMarks, setMaxMarks] = useState(initialAssignment?.maxMarks || 20);

  // Dates
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  const [dueAt, setDueAt] = useState(
    initialAssignment ? initialAssignment.dueAt.slice(0, 16) : defaultDueDate.toISOString().slice(0, 16)
  );

  // Allowed Formats
  const availableFormats = ['all', 'pdf', 'docx', 'pptx', 'xlsx', 'csv', 'zip', 'txt', 'png', 'jpg', 'py', 'java', 'cpp'];
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>(
    initialAssignment?.allowedFileTypes || ['all', 'pdf', 'docx', 'zip']
  );

  const [maxFileSizeMb, setMaxFileSizeMb] = useState(initialAssignment?.maxFileSizeMb || 25);

  // Late Policy
  const [allowLateSubmission, setAllowLateSubmission] = useState(
    initialAssignment ? initialAssignment.allowLateSubmission : true
  );
  const [latePenaltyPercentPerDay, setLatePenaltyPercentPerDay] = useState(
    initialAssignment?.latePenaltyPercentPerDay || 10
  );

  // Resubmission Policy
  const [allowResubmission, setAllowResubmission] = useState(
    initialAssignment ? initialAssignment.allowResubmission : true
  );
  const [maxResubmissions, setMaxResubmissions] = useState(
    initialAssignment?.maxResubmissions || 3
  );

  const [status, setStatus] = useState<'published' | 'draft'>(
    initialAssignment?.status === 'draft' ? 'draft' : 'published'
  );

  // Starter resources simulation
  const [resources, setResources] = useState<Array<{ id: string; name: string; size: string; type: string }>>(
    initialAssignment?.resources || []
  );
  const [resourceName, setResourceName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const toggleFormat = (fmt: string) => {
    if (allowedFileTypes.includes(fmt)) {
      if (allowedFileTypes.length === 1) return; // Keep at least one
      setAllowedFileTypes(allowedFileTypes.filter((f) => f !== fmt));
    } else {
      setAllowedFileTypes([...allowedFileTypes, fmt]);
    }
  };

  const handleAddResource = () => {
    if (!resourceName.trim()) return;
    const newRes = {
      id: `res-${Date.now()}`,
      name: resourceName.trim(),
      size: '1.2 MB',
      type: resourceName.endsWith('.zip') ? 'application/zip' : 'application/pdf',
    };
    setResources([...resources, newRes]);
    setResourceName('');
  };

  const handleRemoveResource = (id: string) => {
    setResources(resources.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Assignment title is required.');
      return;
    }
    if (!courseId) {
      setError('Please select a course for this assignment.');
      return;
    }
    if (maxMarks <= 0) {
      setError('Maximum marks must be greater than zero.');
      return;
    }
    if (allowedFileTypes.length === 0) {
      setError('Select at least one allowed file format.');
      return;
    }

    const selectedCourse = facultyCourses.find((c) => c.id === courseId);
    if (!selectedCourse) {
      setError('Selected course is invalid.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullAssignment: Assignment = {
        id: initialAssignment?.id || `asg-${Date.now()}`,
        title: title.trim(),
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code || selectedCourse.courseCode,
        courseName: selectedCourse.title || selectedCourse.courseName,
        facultyId: user.id,
        facultyName: user.name,
        description: description.trim(),
        instructions: instructions.trim(),
        maxMarks: Number(maxMarks),
        dueAt: new Date(dueAt).toISOString(),
        publishedAt: initialAssignment?.publishedAt || new Date().toISOString(),
        createdAt: initialAssignment?.createdAt || new Date().toISOString(),
        allowedFileTypes,
        maxFileSizeMb: Number(maxFileSizeMb),
        allowLateSubmission,
        latePenaltyPercentPerDay: allowLateSubmission ? Number(latePenaltyPercentPerDay) : 0,
        allowResubmission,
        maxResubmissions: allowResubmission ? Number(maxResubmissions) : 1,
        status,
        resources,
      };

      let saved: Assignment;
      if (initialAssignment) {
        saved = storage.updateAssignment(initialAssignment.id, fullAssignment, user);
        showToast({
          type: 'success',
          title: 'Assignment Updated',
          message: `"${saved.title}" has been updated successfully.`,
        });
      } else {
        saved = storage.saveAssignment(fullAssignment, user);
        showToast({
          type: 'success',
          title: 'Assignment Published',
          message: `"${saved.title}" is now active for enrolled students.`,
        });
      }

      setIsSubmitting(false);
      onCreated(saved);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to save assignment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialAssignment ? 'Edit Assignment' : 'Create New Course Assignment'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure due dates, file constraints, rubrics, and late policies
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

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[72vh] overflow-y-auto">
          {/* Assignment Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assignment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus Engine Implementation"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Course Selection & Max Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              >
                {facultyCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code || c.courseCode} — {c.title || c.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Maximum Marks *
              </label>
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                min={1}
                max={1000}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date & Time *
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="published">Published (Visible to Enrolled Students)</option>
                <option value="draft">Draft (Saved Privately to Faculty)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Short Description / Overview
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief summary explaining the assignment context..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Detailed Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Instructions & Grading Rubric
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Step-by-step submission guidelines, rubric point distribution, test case expectations..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* File Upload Rules */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs">
              File Submission Constraints
            </h3>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1.5">
                Allowed File Formats (Select at least one):
              </label>
              <div className="flex flex-wrap gap-2">
                {availableFormats.map((fmt) => {
                  const isChecked = allowedFileTypes.includes(fmt);
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => toggleFormat(fmt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                        isChecked
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {fmt === 'all' ? '★ ALL (ANY FILE)' : `.${fmt}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-slate-500 dark:text-slate-400 mb-1">
                Maximum File Size Limit:
              </label>
              <select
                value={maxFileSizeMb}
                onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                className="w-full sm:w-48 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={5}>5 MB (Text/Code)</option>
                <option value={10}>10 MB (Documents)</option>
                <option value={25}>25 MB (Standard)</option>
                <option value={50}>50 MB (Media / Large Zips)</option>
                <option value={100}>100 MB (Enterprise)</option>
              </select>
            </div>
          </div>

          {/* Late Submission & Resubmission Policies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={allowLateSubmission}
                  onChange={(e) => setAllowLateSubmission(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Allow Late Submissions</span>
              </label>
              {allowLateSubmission && (
                <div>
                  <label className="text-slate-500 text-[11px] block mb-1">
                    Penalty per day overdue (% of max):
                  </label>
                  <input
                    type="number"
                    value={latePenaltyPercentPerDay}
                    onChange={(e) => setLatePenaltyPercentPerDay(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={allowResubmission}
                  onChange={(e) => setAllowResubmission(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Allow Resubmissions</span>
              </label>
              {allowResubmission && (
                <div>
                  <label className="text-slate-500 text-[11px] block mb-1">
                    Maximum version submissions allowed:
                  </label>
                  <input
                    type="number"
                    value={maxResubmissions}
                    onChange={(e) => setMaxResubmissions(Number(e.target.value))}
                    min={2}
                    max={10}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Starter Resources */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Attach Starter Materials / Resources
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="e.g. Starter_Code_Lab2.zip or Rubric.pdf"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddResource}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Add Resource
              </button>
            </div>

            {resources.length > 0 && (
              <div className="space-y-1.5">
                {resources.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {r.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveResource(r.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : initialAssignment ? 'Update Assignment' : 'Publish Assignment'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
