import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { Course, User } from '../../types';
import { BookOpen, X, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCourseCreated?: (course: Course) => void;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCourseCreated,
}) => {
  const departments = storage.getDepartments();
  const allUsers = storage.getUsers();
  const facultyMembers = allUsers.filter((u) => u.role === 'faculty');

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [credits, setCredits] = useState('3');
  const [semester, setSemester] = useState('1');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [facultyId, setFacultyId] = useState(
    currentUser.role === 'faculty' ? currentUser.id : facultyMembers[0]?.id || ''
  );
  const [customFacultyName, setCustomFacultyName] = useState(
    currentUser.role === 'faculty' ? currentUser.name : ''
  );
  const [description, setDescription] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanTitle = title.trim();

    if (!cleanCode) {
      setError('Course code is required (e.g., CS-201).');
      return;
    }
    if (!cleanTitle) {
      setError('Course title is required.');
      return;
    }

    const selectedDept = departments.find((d) => d.id === departmentId);
    let resolvedFacultyName = customFacultyName;
    let resolvedFacultyId = facultyId;

    if (currentUser.role === 'faculty') {
      resolvedFacultyId = currentUser.id;
      resolvedFacultyName = currentUser.name;
    } else if (facultyId) {
      const found = facultyMembers.find((f) => f.id === facultyId);
      if (found) {
        resolvedFacultyName = found.name;
      }
    }

    if (!resolvedFacultyName) {
      resolvedFacultyName = currentUser.role === 'student' ? 'Course Instructor' : 'Department Faculty';
    }

    setIsSubmitting(true);

    try {
      const newCourse = storage.createCourse(
        {
          code: cleanCode,
          courseCode: cleanCode,
          title: cleanTitle,
          courseName: cleanTitle,
          departmentId: departmentId || 'dept-gen',
          departmentCode: selectedDept?.code || 'GEN',
          departmentName: selectedDept?.name || 'General Academic Studies',
          semester: Number(semester) || 1,
          academicYear,
          facultyId: resolvedFacultyId,
          facultyName: resolvedFacultyName,
          credits: Number(credits) || 3,
          description: description.trim(),
          syllabus: syllabus.trim() || `Course syllabus for ${cleanCode}: ${cleanTitle}. Modules and lecture notes available.`,
          enrolledStudentIds: currentUser.role === 'student' ? [currentUser.id] : [],
        },
        currentUser
      );

      setSuccess(`Course ${newCourse.code} created successfully!`);
      if (onCourseCreated) {
        onCourseCreated(newCourse);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to create course.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Add New Course
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 capitalize">
                  {currentUser.role} Portal
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentUser.role === 'student'
                  ? 'Add a course to your enrolled curriculum and course dashboard.'
                  : currentUser.role === 'faculty'
                  ? 'Publish a new course offering under your academic supervision.'
                  : 'Add a new verified course catalog entry for the institution.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS-305"
                className="w-full px-3 py-2 uppercase font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Credits
              </label>
              <select
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 Credit Unit</option>
                <option value="2">2 Credit Units</option>
                <option value="3">3 Credit Units</option>
                <option value="4">4 Credit Units</option>
                <option value="5">5 Credit Units</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Title / Subject Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Cloud Computing & Microservices"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester / Academic Term
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentUser.role === 'admin' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Instructor (Faculty)
              </label>
              <select
                value={facultyId}
                onChange={(e) => {
                  setFacultyId(e.target.value);
                  const f = facultyMembers.find((m) => m.id === e.target.value);
                  if (f) setCustomFacultyName(f.name);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {facultyMembers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.departmentName || f.departmentId || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentUser.role === 'student' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Instructor Name (Optional)
              </label>
              <input
                type="text"
                value={customFacultyName}
                onChange={(e) => setCustomFacultyName(e.target.value)}
                placeholder="e.g. Dr. Alan Turing"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive summary of key learning objectives and topics..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Syllabus Outline
            </label>
            <textarea
              rows={3}
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="Week 1: Fundamentals&#10;Week 2: Core Architectures&#10;Week 3: Practical Laboratory..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px] placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Course...' : 'Create Course'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
