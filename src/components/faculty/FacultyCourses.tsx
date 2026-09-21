import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Course, User } from '../../types';
import {
  BookOpen,
  Users,
  FileText,
  Mail,
  GraduationCap,
  ChevronRight,
  X,
  Search,
} from 'lucide-react';

export const FacultyCourses: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const courses = storage.getCourses().filter(
    (c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id))
  );
  const assignments = storage.getAssignments();
  const allUsers = storage.getUsers(user);

  const [selectedCourseForRoster, setSelectedCourseForRoster] = useState<Course | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');

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

  return (
    <div id="faculty-courses-view" className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Assigned Course Sections</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Curriculum offerings, student enrollment directories, and course syllabus details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
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
                  <span className="text-xs text-slate-400 font-mono font-medium">
                    {course.credits} Credits
                  </span>
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

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedCourseForRoster(course)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  Class Roster ({enrolledCount})
                </button>

                <span className="text-xs text-slate-400 font-medium">
                  {courseAssignments.length} Assignments
                </span>
              </div>
            </div>
          );
        })}
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
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
