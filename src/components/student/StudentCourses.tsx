import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Course, Assignment } from '../../types';
import { UploadDocumentModal } from '../common/UploadDocumentModal';
import { AddCourseModal } from '../common/AddCourseModal';
import {
  BookOpen,
  Search,
  Users,
  Award,
  Calendar,
  FileText,
  Mail,
  Download,
  ExternalLink,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Clock,
  PlusCircle,
  FileDown,
  Trash2,
  UploadCloud,
  Eye,
} from 'lucide-react';

interface StudentCoursesProps {
  onNavigateToAssignments?: (courseId?: string) => void;
  onOpenSubmitModal?: (assignment: Assignment) => void;
}

export const StudentCourses: React.FC<StudentCoursesProps> = ({
  onNavigateToAssignments,
  onOpenSubmitModal,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<Course | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [uploadCourseTargetId, setUploadCourseTargetId] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Live real-time sync with Cloudflare D1
  React.useEffect(() => {
    storage.syncWithD1().then(() => {
      setRefreshTrigger((prev) => prev + 1);
    }).catch(() => {});
  }, []);

  if (!user) return null;

  const allCourses = storage.getCourses();
  const allAssignments = storage.getAssignments();
  const allSubmissions = storage.getSubmissions().filter((s) => s.studentId === user.id);
  const departments = storage.getDepartments();

  // All academic courses available in the curriculum for students
  const studentCourses = allCourses;

  // Filtered courses
  const filteredCourses = studentCourses.filter((course) => {
    const code = (course.code || course.courseCode || '').toLowerCase();
    const title = (course.title || course.courseName || '').toLowerCase();
    const faculty = (course.facultyName || '').toLowerCase();
    const matchesSearch =
      code.includes(searchQuery.toLowerCase()) ||
      title.includes(searchQuery.toLowerCase()) ||
      faculty.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedDept !== 'ALL' && course.departmentId !== selectedDept) return false;
    return true;
  });

  const totalCredits = studentCourses.reduce((acc, c) => acc + (c.credits || 0), 0);

  const handleDownloadSyllabus = (course: Course) => {
    const content = `COURSE SYLLABUS\n\nCourse: ${course.code || course.courseCode} - ${course.title || course.courseName}\nInstructor: ${course.facultyName}\nCredits: ${course.credits}\nDepartment: ${course.departmentName || 'Academic'}\n\nCOURSE DESCRIPTION:\n${course.description || 'No description provided.'}\n\nSYLLABUS & MODULE OUTLINE:\n${course.syllabus || 'Detailed syllabus schedule distributed in lectures.'}\n\nGenerated from Scholaris Academic Portal.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(course.code || course.courseCode || 'course').replace(/\s+/g, '_')}_Syllabus.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocument = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.fileName || doc.name;
    link.click();
  };

  const handleDeleteCourse = (courseId: string, courseCode: string) => {
    if (window.confirm(`Are you sure you want to delete or unenroll from course ${courseCode}?`)) {
      try {
        storage.deleteCourse(courseId, user);
        setRefreshTrigger((prev) => prev + 1);
      } catch (err: any) {
        alert(err.message || 'Failed to delete course.');
      }
    }
  };

  const handleDeleteDocument = async (doc: any) => {
    if (!activeCourseInModal) return;
    if (window.confirm(`Are you sure you want to delete document "${doc.name}"? This action is permanent.`)) {
      if (doc.fileKey) {
        try {
          await fetch(`/api/files/${encodeURIComponent(doc.fileKey)}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('Backend file deletion sync error:', e);
        }
      }
      storage.deleteCourseDocument(activeCourseInModal.id, doc.id, user);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  // Re-fetch the selected course dynamically to show newly uploaded docs immediately
  const activeCourseInModal = selectedCourseForModal 
    ? (storage.getCourseById(selectedCourseForModal.id) || selectedCourseForModal)
    : null;

  return (
    <div id="student-courses-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              Spring 2026 Academic Term
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Enrolled Courses</h1>
          <p className="text-sm text-slate-300 mt-1">
            Access course materials, add/delete your courses, and upload any file or study documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddCourseModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Course</span>
          </button>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
            <GraduationCap className="w-6 h-6 text-blue-300" />
            <div>
              <p className="text-[10px] text-slate-300">Registered Load</p>
              <p className="text-sm font-bold text-white">
                {studentCourses.length} Courses <span className="text-xs font-normal text-slate-400">({totalCredits} Cr)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="courses-search-input"
            type="text"
            placeholder="Search by course code, title, or instructor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            id="courses-dept-filter"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setUploadCourseTargetId(studentCourses[0]?.id || '');
              setIsUploadModalOpen(true);
            }}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto text-blue-600 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No courses match your search</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Try adjusting your search criteria or filter options to view enrolled courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const courseAssignments = allAssignments.filter((a) => a.courseId === course.id);
            const courseSubmissions = allSubmissions.filter((s) => s.courseId === course.id);
            const activeAssignments = courseAssignments.filter((a) => a.status === 'published');

            return (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {course.code || course.courseCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                      {course.credits} Credits
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 mb-1.5">
                    {course.title || course.courseName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {course.description || 'Comprehensive curriculum covering foundational concepts and applied laboratory coursework.'}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5" /> Instructor:
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                        {course.facultyName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5" /> Assignments:
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {activeAssignments.length} Active / {courseSubmissions.length} Submitted
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" /> Term:
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {course.semester || 'Spring 2026'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`view-syllabus-btn-${course.id}`}
                      onClick={() => setSelectedCourseForModal(course)}
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Syllabus
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.code || course.courseCode || 'Course')}
                      className="text-xs font-medium text-slate-400 hover:text-rose-500 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete / Unenroll Course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`submit-coursework-btn-${course.id}`}
                      onClick={() => {
                        const asgs = storage.getAssignments(user);
                        const existing = asgs.find((a) => a.courseId === course.id);
                        if (existing && onOpenSubmitModal) {
                          onOpenSubmitModal(existing);
                        } else {
                          const dueDate = new Date();
                          dueDate.setDate(dueDate.getDate() + 30);
                          const newAsg: Assignment = {
                            id: `asg-${Date.now()}`,
                            courseId: course.id,
                            courseCode: course.code || course.courseCode || 'COURSE',
                            courseName: course.title || course.courseName || 'Coursework',
                            facultyId: course.facultyId || (course.facultyIds && course.facultyIds[0]) || user.id,
                            facultyName: course.facultyName || 'Course Instructor',
                            title: `${course.code || course.courseCode} — Coursework & Assignment Submission`,
                            description: `Submit your assignments, project files, or coursework exercises for ${course.title || course.courseName}.`,
                            instructions: 'Upload your completed coursework document or zip archive up to 100 MB.',
                            publishedAt: new Date().toISOString(),
                            createdAt: new Date().toISOString(),
                            dueAt: dueDate.toISOString(),
                            maxMarks: 100,
                            allowedFileTypes: ['all', 'pdf', 'docx', 'zip', 'xlsx', 'pptx'],
                            maxFileSizeMb: 100,
                            allowLateSubmission: true,
                            latePenaltyPercentPerDay: 5,
                            allowResubmission: true,
                            maxResubmissions: 5,
                            status: 'published',
                            resources: [],
                          };
                          const saved = storage.saveAssignment(newAsg, user);
                          if (onOpenSubmitModal) {
                            onOpenSubmitModal(saved);
                          }
                        }
                      }}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Submit Work
                    </button>

                    <button
                      id={`view-course-asgs-btn-${course.id}`}
                      onClick={() => {
                        if (onNavigateToAssignments) {
                          onNavigateToAssignments(course.id);
                        }
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                    >
                      Assignments
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Syllabus Modal */}
      {selectedCourseForModal && activeCourseInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {activeCourseInModal.code || activeCourseInModal.courseCode}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {activeCourseInModal.title || activeCourseInModal.courseName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Instructor: {activeCourseInModal.facultyName} • {activeCourseInModal.credits} Academic Credits
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseForModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 flex-1">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Course Overview
                </h4>
                <p className="leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {activeCourseInModal.description || 'No detailed overview provided.'}
                </p>
              </div>

              {/* Enhanced Reference Documents Segment */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Reference Materials & Handouts
                  </h4>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60 transition-colors cursor-pointer"
                  >
                    + Upload Document
                  </button>
                </div>

                {(!activeCourseInModal.documents || activeCourseInModal.documents.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 text-center bg-slate-50/50 dark:bg-slate-800/20">
                    <p className="text-[11px] text-slate-400">No supplemental reference documents available for this course.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeCourseInModal.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                              {doc.fileSize} • {doc.fileType} • Uploaded by {doc.uploadedBy} on {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                            {doc.description && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic leading-relaxed">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {((doc as any).r2Url || (doc as any).fileKey || (doc as any).dataUrl) && (
                            <button
                              onClick={() => {
                                const previewUrl = (doc as any).r2Url || ((doc as any).fileKey ? `/api/files/preview/${(doc as any).fileKey}` : (doc as any).dataUrl);
                                if (previewUrl) window.open(previewUrl, '_blank');
                              }}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                              title={`Preview ${(doc as any).fileName || (doc as any).name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title={`Download ${doc.fileName}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Syllabus Outline & Topics
                </h4>
                <div className="leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-line font-mono text-[11px]">
                  {activeCourseInModal.syllabus || 'Detailed lecture modules distributed during class lectures and laboratory tutorials.'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleDownloadSyllabus(activeCourseInModal)}
                className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Syllabus
              </button>

              <button
                onClick={() => setSelectedCourseForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        preselectedCourseId={selectedCourseForModal?.id || uploadCourseTargetId || studentCourses[0]?.id}
        onUploaded={() => {
          // Re-trigger visual updates
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Add Course Modal */}
      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        currentUser={user}
        onCourseCreated={() => {
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
};
