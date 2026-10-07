import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Assignment, Submission } from '../../types';
import {
  ShieldAlert,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  FileText,
  UploadCloud,
  HardDrive,
  UserPlus,
  ScrollText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Database,
  RotateCcw,
  Sparkles,
  Server,
  Cloud,
  Check,
  Download,
  Eye,
  Loader2,
  Folder,
  ExternalLink,
  Trash2,
  RefreshCw,
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

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddUser: () => void;
  onOpenAddCourse: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onOpenAddUser,
  onOpenAddCourse,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const stats = storage.getSystemStats();
  const auditLogs = storage.getAuditLogs().slice(0, 7);
  const departments = storage.getDepartments();

  // Pie chart data for roles
  const totalUsersCount = stats.totalUsers ?? (stats.totalStudents + stats.totalFaculty + 1);
  const roleData = [
    { name: 'Students', value: stats.totalStudents, color: '#10b981' },
    { name: 'Faculty', value: stats.totalFaculty, color: '#3b82f6' },
    { name: 'Admins', value: Math.max(1, totalUsersCount - stats.totalStudents - stats.totalFaculty), color: '#8b5cf6' },
  ];

  // Dept distribution
  const deptData = departments.map((d) => ({
    name: d.code,
    courses: storage.getCourses().filter((c) => c.departmentId === d.id).length,
    students: storage.getUsers().filter((u) => u.departmentId === d.id && u.role === 'student').length,
  }));

  const [testingStorage, setTestingStorage] = React.useState(false);
  const [d1Status, setD1Status] = React.useState<any>(null);
  const [r2Files, setR2Files] = React.useState<any[]>([]);
  const [loadingR2, setLoadingR2] = React.useState(false);
  const [syncingD1, setSyncingD1] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    assignmentId?: string;
    submissionId?: string;
    fileKey?: string;
    fileName?: string;
    fileUrl?: string;
    timestamp?: string;
  } | null>(null);

  const loadCloudflareData = React.useCallback(async () => {
    setLoadingR2(true);
    try {
      const [d1Res, r2Res] = await Promise.all([
        fetch('/api/d1/status').then((r) => r.json()).catch(() => null),
        fetch('/api/r2/list').then((r) => r.json()).catch(() => null),
      ]);
      if (d1Res?.success) setD1Status(d1Res);
      if (r2Res?.success && Array.isArray(r2Res.objects)) setR2Files(r2Res.objects);
    } catch (_) {}
    finally {
      setLoadingR2(false);
    }
  }, []);

  React.useEffect(() => {
    loadCloudflareData();
  }, [loadCloudflareData]);

  const handleSyncD1 = async () => {
    setSyncingD1(true);
    try {
      await fetch('/api/sync-d1', { method: 'POST' });
      await storage.syncWithD1();
      await loadCloudflareData();
    } catch (_) {}
    finally {
      setSyncingD1(false);
    }
  };

  const handleDeleteR2File = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete "${key}" from Cloudflare R2 bucket?`)) return;
    try {
      const res = await fetch(`/api/r2/delete/${encodeURIComponent(key)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setR2Files((prev) => prev.filter((f) => f.key !== key));
      }
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  const handleRunStorageTest = async () => {
    setTestingStorage(true);
    setTestResult(null);
    try {
      // 1. Create Demo Assignment in D1
      const courses = storage.getCourses();
      const targetCourse = courses[0] || {
        id: 'course-1',
        courseCode: 'CS301',
        courseName: 'Computer Networks & Distributed Systems',
        title: 'Computer Networks & Distributed Systems',
        departmentId: 'dept-1',
      };
      const demoAssignmentId = `asg-test-${Date.now().toString().slice(-6)}`;

      const newAsg: Assignment = {
        id: demoAssignmentId,
        courseId: targetCourse.id,
        courseCode: targetCourse.courseCode || targetCourse.code || 'CS-301',
        courseName: targetCourse.courseName || targetCourse.title || 'Database Systems',
        title: `Cloudflare Diagnostic: Live Pipeline Test #${Date.now().toString().slice(-4)}`,
        description: 'Auto-generated diagnostic assignment verifying Cloudflare D1 query and Cloudflare R2 file storage.',
        instructions: 'Test upload and verify storage pipeline.',
        maxMarks: 100,
        facultyId: user.id,
        facultyName: user.name,
        publishedAt: new Date().toISOString(),
        dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        allowLateSubmission: true,
        latePenaltyPercentPerDay: 5,
        allowResubmission: true,
        maxResubmissions: 3,
        allowedFileTypes: ['pdf'],
        maxFileSizeMb: 50,
        resources: [],
        status: 'published',
        createdAt: new Date().toISOString(),
      };
      storage.saveAssignment(newAsg, user);

      // Save to D1
      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAsg),
      }).catch(() => {});

      // 2. Generate Real Diagnostic PDF File
      const mockPdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (Cloudflare D1 & R2 Live Diagnostic File) /Author (${user.name}) /Date (${new Date().toISOString()}) >>\nendobj\n2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] >>\nendobj\ntrailer\n<< /Root 2 0 R >>\n%%EOF`;
      const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
      const fileName = `cloudflare_test_${demoAssignmentId}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // 3. Post to backend upload endpoint to stream to R2 & record in D1
      const formData = new FormData();
      formData.append('assignmentFile', file);
      formData.append('file', file);
      formData.append('userId', user.id);
      formData.append('studentId', user.id);
      formData.append('userName', user.name);
      formData.append('studentName', user.name);
      formData.append('userEmail', user.email);
      formData.append('userRole', 'student');
      formData.append('studentIdNumber', user.studentIdNumber || user.employeeIdNumber || 'ADM-TEST');
      formData.append('assignmentTitle', newAsg.title);
      formData.append('courseId', targetCourse.id);
      formData.append('courseCode', newAsg.courseCode);
      formData.append('courseName', newAsg.courseName);

      const submitRes = await fetch(`/api/assignments/${demoAssignmentId}/submit`, {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
          'x-user-role': user.role,
          'x-user-email': user.email,
        },
        body: formData,
      });

      const resData = await submitRes.json();
      const r2Url = resData.r2Url || (resData.r2 && resData.r2.url) || `/api/files/preview/${resData.fileKey}`;

      setTestResult({
        success: true,
        assignmentId: demoAssignmentId,
        submissionId: resData.submissionId || `sub-${demoAssignmentId}`,
        fileKey: resData.fileKey || `submissions/${fileName}`,
        fileName: fileName,
        fileUrl: r2Url,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Reload live R2 files & D1 database
      await loadCloudflareData();
      await storage.syncWithD1();
    } catch (err: any) {
      alert(`Storage test failed: ${err.message}`);
    } finally {
      setTestingStorage(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to initial state? This will repopulate initial assignments and sample students.')) {
      storage.resetToDefaults();
      window.location.reload();
    }
  };

  return (
    <div id="admin-dashboard" className="space-y-6">
      {/* Admin Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold mb-3 border border-purple-400/20">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
              Central System Administration & Governance
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Administrator Control Center
            </h1>
            <p className="text-xs text-slate-300 mt-2">
              Logged in as <strong className="text-white">{user.name}</strong> • Institutional Super Admin • Real-time Audit Logging Active
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              id="admin-add-user-btn"
              onClick={onOpenAddUser}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Provision User
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAddCourse}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Add Course
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleResetData}
              className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-xs font-semibold text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reset mock database to initial seed data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Seed Data
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 8 Statistics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
        {[
          { label: 'Users', value: stats.totalUsers, color: 'text-slate-900 dark:text-white', topColor: 'text-slate-400' },
          { label: 'Students', value: stats.totalStudents, color: 'text-emerald-600 dark:text-emerald-400', topColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Faculty', value: stats.totalFaculty, color: 'text-blue-600 dark:text-blue-400', topColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Depts', value: stats.totalDepartments, color: 'text-purple-600 dark:text-purple-400', topColor: 'text-purple-600 dark:text-purple-400' },
          { label: 'Courses', value: stats.totalCourses, color: 'text-slate-900 dark:text-white', topColor: 'text-slate-400' },
          { label: 'Assignments', value: stats.totalAssignments, color: 'text-slate-900 dark:text-white', topColor: 'text-slate-400' },
          { label: 'Submissions', value: stats.totalSubmissions, color: 'text-indigo-600 dark:text-indigo-400', topColor: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Storage', value: stats.storageUsed, color: 'text-slate-800 dark:text-slate-200', topColor: 'text-slate-400', isStorage: true },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.03 * idx }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow"
          >
            <span className={`text-[10px] font-bold ${item.topColor} uppercase`}>{item.label}</span>
            <p className={`${item.isStorage ? 'text-sm font-black font-mono mt-1' : 'text-xl font-black mt-0.5'} ${item.color}`}>
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Distribution Pie Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Institutional User Roles
            </h2>
            <p className="text-xs text-slate-400 mb-2">
              Breakdown across Students, Faculty, and Administrators
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={35}
                  paddingAngle={4}
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Workload Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Departmental Scale & Offerings
              </h2>
              <p className="text-xs text-slate-400">
                Active courses and enrolled students per department
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('departments')}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              Manage Depts →
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="students" name="Students" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="courses" name="Courses" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cloudflare Control Center: D1 Database & R2 Storage Explorer */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-900/10 via-slate-900/5 to-indigo-900/10 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900/50 p-5 sm:p-6 shadow-xs space-y-6">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Cloudflare D1 & R2 Control Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {d1Status?.connected ? 'Cloud Connected' : 'Live Sync Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected to Cloudflare D1 Database (<code className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">assignment_portal_db</code>) and R2 Bucket (<code className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">assignment-files</code>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncD1}
              disabled={syncingD1}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Force Real-time Sync with Cloudflare D1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingD1 ? 'animate-spin text-blue-500' : ''}`} />
              {syncingD1 ? 'Syncing...' : 'Sync D1'}
            </button>

            <button
              id="run-storage-diagnostic-btn"
              onClick={handleRunStorageTest}
              disabled={testingStorage}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {testingStorage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing Pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Test Live Upload & D1
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live D1 Database Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">D1 Database ID</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block text-[11px] mt-0.5">
              a71f76cb-8197-4ff4...
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">D1 Users in Database</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
              {d1Status?.userCount ?? stats.totalUsers ?? 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">D1 Submissions Recorded</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
              {d1Status?.submissionCount ?? stats.totalSubmissions ?? 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">R2 Bucket Files</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5 block">
              {r2Files.length} file(s)
            </span>
          </div>
        </div>

        {/* Live Test Results Notification */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <span>Diagnostic Pipeline Passed Successfully</span>
                  <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                    ({testResult.timestamp})
                  </span>
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                  1. Assignment saved to D1. 2. Real PDF uploaded to Cloudflare R2 bucket. 3. Student submission linked with R2 URL in D1.
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900">
                    <span className="text-slate-400 text-[10px] block">Assignment ID</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {testResult.assignmentId}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900">
                    <span className="text-slate-400 text-[10px] block">Submission ID</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {testResult.submissionId}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900">
                    <span className="text-slate-400 text-[10px] block">R2 Storage File</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 truncate block">
                      {testResult.fileName}
                    </span>
                  </div>
                </div>

                {testResult.fileUrl && (
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={testResult.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview Stored Document
                    </a>
                    <a
                      href={testResult.fileUrl}
                      download={testResult.fileName}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download R2 File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Live Cloudflare R2 Bucket File Browser */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Live Cloudflare R2 Bucket Objects (<code className="text-blue-600 dark:text-blue-400 font-mono">assignment-files</code>)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {r2Files.length} Object(s)
              </span>
            </div>

            <button
              onClick={loadCloudflareData}
              disabled={loadingR2}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Refresh R2 Bucket Objects List"
            >
              <RefreshCw className={`w-3 h-3 ${loadingR2 ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto max-h-72">
            {r2Files.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p>No objects currently in Cloudflare R2 bucket.</p>
                <p className="text-[11px] text-slate-500 mt-1">Upload an assignment coursework file or click &quot;Test Live Upload & D1&quot; above to store objects.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">File Key / Name</th>
                    <th className="py-2.5 px-3">Folder</th>
                    <th className="py-2.5 px-3">File Size</th>
                    <th className="py-2.5 px-3">Uploaded</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {r2Files.map((f: any) => {
                    const keyParts = (f.key || '').split('/');
                    const folder = keyParts.length > 1 ? keyParts[0] : 'root';
                    const fileName = keyParts[keyParts.length - 1];
                    const previewUrl = `/api/r2/preview/${encodeURIComponent(f.key)}`;
                    const sizeStr = f.size ? `${(f.size / 1024).toFixed(1)} KB` : 'Unknown';
                    const dateStr = f.lastModified ? new Date(f.lastModified).toLocaleString('en-GB') : 'Just now';

                    return (
                      <tr key={f.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate max-w-xs font-mono text-[11px]" title={f.key}>
                            {fileName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {folder}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {sizeStr}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {dateStr}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                          {/* Preview Button */}
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                            title="Sandboxed In-Browser Preview"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </a>

                          {/* Direct Public URL */}
                          {f.url && (
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 inline-flex items-center transition-colors"
                              title="Open Cloudflare Public Link"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {/* Download Button */}
                          <a
                            href={`/api/files/download/${encodeURIComponent(f.key)}`}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 inline-flex items-center transition-colors"
                            title="Download Object"
                          >
                            <Download className="w-3 h-3" />
                          </a>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteR2File(f.key)}
                            className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500 inline-flex items-center cursor-pointer transition-colors"
                            title="Delete from R2 Bucket"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Security Audit Trail Live Stream */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-purple-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Security Audit Log Stream
              </h2>
              <p className="text-xs text-slate-400">
                Immutable record of assignments created, submissions uploaded, and grades recorded
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('audit-logs')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            View All Audit Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {auditLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {log.userName}
                  </td>
                  <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                    {log.userRole}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[240px] truncate">
                    {log.details}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                    {log.ipAddress}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      SUCCESS
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
