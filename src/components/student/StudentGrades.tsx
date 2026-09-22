import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  Award,
  TrendingUp,
  BookOpen,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const StudentGrades: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const courses = storage.getCourses().filter(
    (c) =>
      c.enrolledStudentIds?.includes(user.id) ||
      (user.enrolledCourseIds && user.enrolledCourseIds.includes(c.id))
  );
  const submissions = storage.getSubmissions().filter((s) => s.studentId === user.id);
  const graded = submissions.filter((s) => s.status === 'graded' && s.grade);

  if (courses.length === 0) {
    return (
      <div id="student-grades-view" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 font-serif">
              <Award className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              Academic Performance & Grades
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Grade point averages, score breakdown and official transcript export
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center mx-auto text-amber-600 mb-4 shadow-xs">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Enrolled Courses or Grades Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            You do not have any courses enrolled yet. Please add your subjects from the &quot;My Courses&quot; page. Once courses are added and submitted coursework is evaluated by faculty, your GPA and marks breakdown will automatically show up here.
          </p>
        </div>
      </div>
    );
  }

  // Overall calculations
  const totalGraded = graded.length;
  const totalSubmissions = submissions.length;
  const pendingGrading = Math.max(0, totalSubmissions - totalGraded);

  const averagePercentage =
    totalGraded > 0
      ? (
          graded.reduce((acc, curr) => acc + (curr.grade?.percentage || 0), 0) /
          totalGraded
        ).toFixed(1)
      : '0.0';

  // GPA conversion (approx 4.0 scale)
  const gpa = ((Number(averagePercentage) / 100) * 4).toFixed(2);

  // Course-by-course breakdown
  const courseSummary = courses.map((course) => {
    const courseGraded = graded.filter((s) => s.courseId === course.id);
    const courseAvg =
      courseGraded.length > 0
        ? (
            courseGraded.reduce((acc, curr) => acc + (curr.grade?.percentage || 0), 0) /
            courseGraded.length
          ).toFixed(1)
        : null;

    return {
      id: course.id,
      code: course.code || course.courseCode,
      title: course.title || course.courseName,
      credits: course.credits,
      gradedCount: courseGraded.length,
      average: courseAvg ? Number(courseAvg) : null,
    };
  });

  const chartData = courseSummary
    .filter((c) => c.average !== null)
    .map((c) => ({
      course: c.code,
      score: c.average,
    }));

  const handleDownloadTranscript = () => {
    const lines = [
      '=====================================================',
      'INSTITUTIONAL GRADE TRANSCRIPT & PERFORMANCE REPORT',
      'Online Assignment Submission System',
      '=====================================================',
      `Student:        ${user.name} (${user.studentIdNumber})`,
      `Department:     ${user.departmentName}`,
      `Semester:       ${user.semester || 5}`,
      `Date Generated: ${new Date().toLocaleDateString()}`,
      `Overall GPA:    ${gpa} / 4.00 (${averagePercentage}%)`,
      '-----------------------------------------------------',
      'COURSE PERFORMANCE BREAKDOWN:',
    ];

    courseSummary.forEach((c) => {
      lines.push(
        `${c.code.padEnd(10)} | ${c.title.padEnd(30)} | Score: ${
          c.average !== null ? `${c.average}%` : 'In Progress'
        }`
      );
    });

    lines.push('-----------------------------------------------------');
    lines.push('GRADED ASSIGNMENTS LOG:');
    graded.forEach((g) => {
      lines.push(
        `${g.courseCode.padEnd(8)}: ${g.assignmentTitle.slice(0, 25).padEnd(25)} -> ${
          g.grade?.marksObtained
        }/${g.grade?.maxMarks} (${g.grade?.percentage}%)`
      );
    });
    lines.push('=====================================================');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Academic_Transcript_${user.studentIdNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="student-grades-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Academic Performance & Grades</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track your semester GPA, course grade distributions, and faculty assessments
          </p>
        </div>
        <button
          onClick={handleDownloadTranscript}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export Grade Report
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
          <div className="flex items-center justify-between opacity-80 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cumulative GPA</span>
            <Award className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black">{gpa}</p>
          <p className="text-xs text-blue-100 mt-1">Scale of 4.00 ({averagePercentage}%)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Graded Assignments</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalGraded}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Completed assessments</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pending Evaluation</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingGrading}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">In instructor queue</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Enrolled Credits</span>
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {courses.reduce((acc, c) => acc + c.credits, 0)} Cr
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{courses.length} active courses</p>
        </div>
      </div>

      {/* Chart & Course Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Course Performance (%)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Mean score comparison across courses
            </p>
          </div>

          <div className="h-60 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="course" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Score']}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Awaiting graded coursework for visualization
              </div>
            )}
          </div>
        </div>

        {/* Course-wise Grades Breakdown */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Course-wise Grade Breakdown
            </h2>
            <span className="text-xs text-slate-400 font-medium">Fall Term</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Credits</th>
                  <th className="py-3.5 px-4">Graded Work</th>
                  <th className="py-3.5 px-4">Average Score</th>
                  <th className="py-3.5 px-4 text-right">Academic Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {courseSummary.map((c) => {
                  let badge = (
                    <span className="text-slate-400 text-[11px] italic">In Progress</span>
                  );
                  if (c.average !== null) {
                    if (c.average >= 90) {
                      badge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Distinction (A)
                        </span>
                      );
                    } else if (c.average >= 80) {
                      badge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          Proficient (B)
                        </span>
                      );
                    } else {
                      badge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Passing (C)
                        </span>
                      );
                    }
                  }

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{c.code}</span>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{c.title}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {c.credits} Credits
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {c.gradedCount} items
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        {c.average !== null ? (
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {c.average}%
                            </span>
                            <ProgressBar
                              value={c.average}
                              size="sm"
                              variant={c.average >= 85 ? 'success' : c.average >= 70 ? 'primary' : 'warning'}
                              shimmer={false}
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">{badge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
