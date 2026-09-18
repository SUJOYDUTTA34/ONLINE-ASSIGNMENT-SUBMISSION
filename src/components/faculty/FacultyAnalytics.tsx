import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import {
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Users,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const FacultyAnalytics: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const courses = storage.getCourses().filter(
    (c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id))
  );
  const facultyCourseIds = courses.map((c) => c.id);

  const assignments = storage.getAssignments().filter((a) => facultyCourseIds.includes(a.courseId));
  const submissions = storage.getSubmissions().filter((s) => facultyCourseIds.includes(s.courseId));
  const graded = submissions.filter((s) => s.status === 'graded' && s.grade);

  // Overall Stats
  const totalSubmissions = submissions.length;
  const lateSubmissions = submissions.filter((s) => s.isLate).length;
  const onTimeSubmissions = totalSubmissions - lateSubmissions;

  const averageScore =
    graded.length > 0
      ? (
          graded.reduce((acc, curr) => acc + (curr.grade?.percentage || 0), 0) /
          graded.length
        ).toFixed(1)
      : '0.0';

  // Grade Distribution
  const dist = {
    'A (90-100%)': 0,
    'B (80-89%)': 0,
    'C (70-79%)': 0,
    'D (60-69%)': 0,
    'F (<60%)': 0,
  };

  graded.forEach((g) => {
    const pct = g.grade?.percentage || 0;
    if (pct >= 90) dist['A (90-100%)']++;
    else if (pct >= 80) dist['B (80-89%)']++;
    else if (pct >= 70) dist['C (70-79%)']++;
    else if (pct >= 60) dist['D (60-69%)']++;
    else dist['F (<60%)']++;
  });

  const gradeDistributionData = Object.entries(dist).map(([bracket, count]) => ({
    bracket,
    count,
  }));

  // Assignment Comparison Data
  const assignmentComparisonData = assignments.slice(0, 6).map((asg) => {
    const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
    const asgCourse = courses.find((c) => c.id === asg.courseId);
    const enrolled = asgCourse?.enrolledStudentIds.length || 1;

    return {
      title: asg.title.slice(0, 15) + '...',
      submissions: asgSubs.length,
      enrolled,
    };
  });

  const timelinessData = [
    { name: 'On Time', value: onTimeSubmissions, color: '#10b981' },
    { name: 'Late', value: lateSubmissions, color: '#f59e0b' },
  ];

  return (
    <div id="faculty-analytics-view" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Coursework & Grading Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Comprehensive performance evaluation, submission volume, and grade distribution metrics
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Submissions</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalSubmissions}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all classes</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Average Grade</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{averageScore}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{graded.length} evaluated items</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">On-Time Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalSubmissions > 0 ? Math.round((onTimeSubmissions / totalSubmissions) * 100) : 0}%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{onTimeSubmissions} on-time uploads</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Late Submissions</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{lateSubmissions}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Penalties applied</p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution Histogram */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Grade Distribution (Bell Curve)
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Number of students in each percentage tier
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="bracket" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} students`, 'Count']}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Submission Turnout per Assignment */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Assignment Turnout Ratio
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Submissions received vs. total enrolled students
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assignmentComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="submissions" name="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="enrolled" name="Enrolled Roster" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
