import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Course, User } from '../../types';
import { UploadDocumentModal } from '../common/UploadDocumentModal';
import { AddCourseModal } from '../common/AddCourseModal';
import {
  BookOpen,
  Users,
  FileText,
  Mail,
  GraduationCap,
  ChevronRight,
  X,
  Search,
  Download,
  Trash2,
  PlusCircle,
} from 'lucide-react';

export const FacultyCourses: React.FC = () => {
  const { user } = useAuth();
  const [selectedCourseForRoster, setSelectedCourseForRoster] = useState<Course | null>(null);
  const [selectedCourseForDocs, setSelectedCourseForDocs] = useState<Course | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!user) return null;

  // Re-read courses dynamically so newly uploaded/deleted docs show up instantly
  const courses = storage.getCourses().filter(
    (c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id))
  );
  const assignments = storage.getAssignments();
  const allUsers = storage.getUsers(user);

  const enrolledStudents: User[] = selectedCourseForRoster
    ? allUsers.filter(
        (u) =>
          u.role === 'student' &&
          selectedCourseForRoster.enrolledStudentIds?.includes(u.id)
      )
    : [];

  const filteredEnrolled = enrolledStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (s.studentIdNumber && s.studentIdNumber.toLowerCase().includes(rosterSearch.toLowerCase()))
  );

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
    if (window.confirm(`Are you sure you want to delete "${doc.name}"? This action is irreversible.`)) {
      if (doc.fileKey) {
        try {
          await fetch(`/api/files/${encodeURIComponent(doc.fileKey)}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('Backend file deletion sync error:', e);
        }
      }
      storage.deleteCourseDocument(activeCourseForDocs.id, doc.id, user);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleDeleteCourse = (courseId: string, courseCode: string) => {
    if (window.confirm(`Are you sure you want to delete course ${courseCode}? This will remove it from your curriculum.`)) {
      try {
        storage.deleteCourse(courseId, user);
        setRefreshTrigger((prev) => prev + 1);
      } catch (err: any) {
        alert(err.message || 'Failed to delete course.');
      }
    }
  };

  return (
    <div id="faculty-courses-view" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Assigned Course Sections</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Curriculum offerings, student enrollment directories, and course syllabus details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCourseModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Course</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length === 0 ? (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">No courses assigned or created yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">You can add any new course offering to your schedule.</p>
            <button
              onClick={() => setIsAddCourseModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Your First Course</span>
            </button>
          </div>
        ) : (
          courses.map((course) => {
            const courseAssignments = assignments.filter((a) => a.courseId === course.id);
            const enrolledCount = course.enrolledStudentIds?.length || 0;

            return (
              <div
                key={course.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {course.code || course.courseCode}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono font-medium">
                        {course.credits} Credits
                      </span>
                      <button
                        onClick={() => handleDeleteCourse(course.id, course.code || course.courseCode || 'Course')}
                        className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {course.title || course.courseName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3">
                    {course.description}
                  </p>

                  {course.syllabus && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-semibold block mb-0.5 text-slate-700 dark:text-slate-200">
                        Syllabus Outline:
                      </span>
                      {course.syllabus}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedCourseForRoster(course)}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Roster ({enrolledCount})
                    </button>
                    <button
                      onClick={() => setSelectedCourseForDocs(course)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Documents ({course.documents?.length || 0})
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {courseAssignments.length} Asgs
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Roster Modal */}
      {selectedCourseForRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {selectedCourseForRoster.code || selectedCourseForRoster.courseCode}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Enrolled Students Roster ({enrolledStudents.length})
                </h3>
              </div>
              <button
                onClick={() => setSelectedCourseForRoster(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search students by name, email, or student ID..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEnrolled.length === 0 ? (
                <p className="py-8 text-center text-slate-400">No students enrolled in this section.</p>
              ) : (
                filteredEnrolled.map((stu) => (
                  <div key={stu.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={stu.avatarUrl}
                        alt={stu.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{stu.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{stu.studentIdNumber}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                        {stu.program || 'Computer Science'}
                      </p>
                      <p className="text-[10px] text-slate-400">Semester {stu.semester || 1}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedCourseForRoster(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Materials & Reference Documents Modal */}
      {selectedCourseForDocs && activeCourseForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
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
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-600/10"
              >
                <PlusCircle className="w-4 h-4" />
                Upload New Reference Material
              </button>
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(!activeCourseForDocs.documents || activeCourseForDocs.documents.length === 0) ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/25">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No documents registered yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Upload lecture notes, assignment files or manuals for students.</p>
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
                Close Documents Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Upload Modal Context */}
      {selectedCourseForDocs && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          preselectedCourseId={selectedCourseForDocs.id}
          onUploaded={() => {
            // Re-trigger course list refresh
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {/* Add Course Modal */}
      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        currentUser={user}
        onCourseCreated={() => {
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
};
