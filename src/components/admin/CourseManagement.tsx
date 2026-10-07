import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { Course } from '../../types';
import { UploadDocumentModal } from '../common/UploadDocumentModal';
import {
  BookOpen,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  Users,
  Building2,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';

interface CourseManagementProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const CourseManagement: React.FC<CourseManagementProps> = ({
  isAddModalOpen = false,
  onCloseAddModal,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [courses, setCourses] = useState<Course[]>(() => storage.getCourses());
  const departments = storage.getDepartments();
  const facultyUsers = storage.getUsers().filter((u) => u.role === 'faculty');
  const allStudents = storage.getUsers().filter((u) => u.role === 'student');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(isAddModalOpen);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourseForDocs, setSelectedCourseForDocs] = useState<Course | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form Fields
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [facultyId, setFacultyId] = useState(facultyUsers[0]?.id || '');
  const [credits, setCredits] = useState(3);
  const [description, setDescription] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Live real-time sync with Cloudflare D1 on mount
  React.useEffect(() => {
    fetch('/api/courses')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.courses)) {
          storage.syncWithD1().then(() => {
            setCourses(storage.getCourses());
          });
        }
      })
      .catch((e) => console.warn('D1 live courses fetch notice:', e));
  }, []);

  const activeCourseForDocs = selectedCourseForDocs
    ? (storage.getCourseById(selectedCourseForDocs.id) || selectedCourseForDocs)
    : null;

  const handleDownloadDocument = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.fileName || doc.name;
    link.click();
  };

  const handleDeleteDocument = async (doc: any) => {
    if (!activeCourseForDocs) return;
    if (window.confirm(`Are you sure you want to delete "${doc.name}"? This action is permanent.`)) {
      if (doc.fileKey) {
        try {
          await fetch(`/api/files/${encodeURIComponent(doc.fileKey)}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('Backend file deletion sync error:', e);
        }
      }

      storage.deleteCourseDocument(activeCourseForDocs.id, doc.id, currentUser || undefined);

      setCourses(storage.getCourses());
      setRefreshTrigger((prev) => prev + 1);
      showToast({
        type: 'success',
        title: 'Document Deleted',
        message: `"${doc.name}" was removed from this course.`,
      });
    }
  };

  React.useEffect(() => {
    if (isAddModalOpen) {
      resetForm();
      setModalOpen(true);
    }
  }, [isAddModalOpen]);

  const resetForm = () => {
    setEditingCourse(null);
    setCode('');
    setTitle('');
    setDepartmentId(departments[0]?.id || '');
    setFacultyId(facultyUsers[0]?.id || '');
    setCredits(3);
    setDescription('');
    setSyllabus('');
    setSelectedStudentIds(allStudents.slice(0, 3).map((s) => s.id));
    setFormError(null);
  };

  const handleOpenEdit = (c: Course) => {
    setEditingCourse(c);
    setCode(c.code || c.courseCode || '');
    setTitle(c.title || c.courseName || '');
    setDepartmentId(c.departmentId || '');
    setFacultyId(c.facultyId || (c.facultyIds && c.facultyIds[0]) || '');
    setCredits(c.credits || 3);
    setDescription(c.description || '');
    setSyllabus(c.syllabus || '');
    setSelectedStudentIds(c.enrolledStudentIds || []);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!code.trim() || !title.trim()) {
      setFormError('Course code and title are required.');
      return;
    }

    const assignedFaculty = facultyUsers.find((f) => f.id === facultyId);

    try {
      const courseData: any = {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        departmentId,
        facultyId,
        facultyName: assignedFaculty?.name || 'Assigned Faculty',
        credits: Number(credits),
        description: description.trim(),
        syllabus: syllabus.trim(),
        enrolledStudentIds: selectedStudentIds,
      };

      let saved: Course;
      if (editingCourse) {
        saved = storage.updateCourse(editingCourse.id, courseData, currentUser || undefined);
        setCourses(courses.map((c) => (c.id === saved.id ? saved : c)));
      } else {
        saved = storage.createCourse(courseData, currentUser || undefined);
        setCourses([...courses, saved]);
      }

      // Immediately sync with Cloudflare D1 database
      try {
        await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saved),
        });
      } catch (d1Err) {
        console.warn('D1 course sync warning:', d1Err);
      }

      showToast({
        type: 'success',
        title: editingCourse ? 'Course Updated' : 'Course Added',
        message: `${saved.code} — ${saved.title} synchronized to Cloudflare D1.`,
      });

      setModalOpen(false);
      if (onCloseAddModal) onCloseAddModal();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save course.');
    }
  };

  const handleDeleteCourse = (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete course ${code}?`)) {
      storage.deleteCourse(id, currentUser || undefined);
      setCourses(courses.filter((c) => c.id !== id));
      fetch(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
      showToast({
        type: 'success',
        title: 'Course Removed',
        message: `${code} has been deleted and removed from D1.`,
      });
    }
  };

  const toggleStudentEnrollment = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const codeStr = c.code || c.courseCode || '';
    const titleStr = c.title || c.courseName || '';
    const facStr = c.facultyName || '';
    const matchesSearch =
      codeStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      titleStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facStr.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedDept !== 'ALL' && c.departmentId !== selectedDept) return false;
    return true;
  });

  return (
    <div id="admin-courses-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Course Catalog Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage degree curriculum, instructor assignments, credit allocations, and enrolled student rosters
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Add Course
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
            placeholder="Search courses by code, title, or instructor..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="ALL">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      {/* Courses Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Assigned Instructor</th>
                <th className="py-3.5 px-4">Credits</th>
                <th className="py-3.5 px-4">Enrolled Students</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No courses found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => {
                  const dept = departments.find((d) => d.id === c.departmentId);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {c.code}
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-white">{c.title}</p>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {dept?.name || 'Department'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                        {c.facultyName}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {c.credits} Cr
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {c.enrolledStudentIds?.length || 0} Students
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCourseForDocs(c)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                            title="Manage Reference Materials"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[10px] font-bold hidden md:inline">{c.documents?.length || 0} Docs</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                            title="Edit Course"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.code || c.courseCode || 'Course')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer"
                            title="Delete Course"
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingCourse ? 'Edit Course Catalog Entry' : 'Create Course Offering'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Curriculum & Cohort Allocation</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCourse} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. CS-450"
                    className="w-full px-3 py-2 uppercase font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Credits *
                  </label>
                  <input
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    min={1}
                    max={8}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Computing & Microservices"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Instructor *
                  </label>
                  <select
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {facultyUsers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.employeeIdNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catalog Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Course summary..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enroll Students ({selectedStudentIds.length} selected)
                </label>
                <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1 bg-slate-50 dark:bg-slate-800/40">
                  {allStudents.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudentEnrollment(s.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{s.name}</span>
                      <span className="text-slate-400 font-mono text-[10px]">({s.studentIdNumber})</span>
                    </label>
                  ))}
                </div>
              </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {editingCourse ? 'Update Course' : 'Create Course'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Course Materials & Reference Documents Modal */}
    {selectedCourseForDocs && activeCourseForDocs && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto text-left">
        <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {activeCourseForDocs.code || activeCourseForDocs.courseCode}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Course Materials & Resources ({activeCourseForDocs.documents?.length || 0})
              </h3>
            </div>
            <button
              onClick={() => setSelectedCourseForDocs(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions Header */}
          <div className="mb-4 shrink-0">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-purple-600/10"
            >
              <PlusCircle className="w-4 h-4" />
              Upload Reference Document
            </button>
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {(!activeCourseForDocs.documents || activeCourseForDocs.documents.length === 0) ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/25">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No documents registered yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Upload syllabi guides, textbooks, or worksheet documents.</p>
              </div>
            ) : (
              activeCourseForDocs.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {doc.fileSize} • {doc.fileType} • By {doc.uploadedBy}
                      </p>
                      {doc.description && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic bg-white dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100/80 dark:border-slate-800/60 leading-relaxed">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-400 mt-2">
                        Uploaded on {new Date(doc.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-right mt-4 shrink-0">
            <button
              onClick={() => setSelectedCourseForDocs(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Close Catalog View
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Standalone Upload Modal */}
    {selectedCourseForDocs && (
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        preselectedCourseId={selectedCourseForDocs.id}
        onUploaded={() => {
          setCourses(storage.getCourses());
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    )}
  </div>
);
};
