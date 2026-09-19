import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
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
