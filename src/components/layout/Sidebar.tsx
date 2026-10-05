import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import webpageLogo from '../../assets/images/webpage_logo_1791176307030.jpg';
import { UserAvatar } from '../common/UserAvatar';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  UploadCloud,
  Award,
  Bell,
  User as UserIcon,
  Settings,
  LogOut,
  PlusCircle,
  CheckSquare,
  BarChart3,
  Users,
  Building2,
  ScrollText,
  FileSpreadsheet,
  X,
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: string;
  }

  const studentNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-courses', label: 'My Courses', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'my-submissions', label: 'My Submissions', icon: UploadCloud },
    { id: 'grades', label: 'Grades & GPA', icon: Award },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const facultyNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-courses', label: 'My Courses', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'create-assignment', label: 'Create Assignment', icon: PlusCircle },
    { id: 'submissions', label: 'Submissions', icon: UploadCloud },
    { id: 'grading', label: 'Grading Hub', icon: CheckSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'courses', label: 'Course Catalog', icon: BookOpen },
    { id: 'assignments-admin', label: 'All Assignments', icon: FileText },
    { id: 'submissions-admin', label: 'All Submissions', icon: UploadCloud },
    { id: 'reports', label: 'System Reports', icon: FileSpreadsheet },
    { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Admin Profile', icon: UserIcon },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const navItems =
    user.role === 'admin'
      ? adminNav
      : user.role === 'faculty'
      ? facultyNav
      : studentNav;

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-white flex items-center justify-center p-0.5">
            <img
              src={webpageLogo}
              alt="Scholaris Logo"
              className="w-full h-full object-cover rounded-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-white tracking-wide uppercase">
              {user.role} Portal
            </p>
            <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
              {user.departmentName || 'Academic System'}
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          id="close-mobile-sidebar-btn"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <nav id="sidebar-nav-menu" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'my-submissions' && activeTab === 'submissions') ||
            (item.id === 'submissions' && activeTab === 'my-submissions') ||
            (item.id === 'assignments-admin' && activeTab === 'assignments') ||
            (item.id === 'submissions-admin' && activeTab === 'submissions') ||
            (item.id === 'reports' && activeTab === 'analytics');

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.025 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              id={`nav-item-${item.id}`}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  {item.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Mini Card in Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg bg-slate-800/40">
          <UserAvatar
            src={user.avatarUrl}
            name={user.name}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {user.studentIdNumber || user.employeeIdNumber || user.role}
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="sidebar-logout-btn"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        id="desktop-sidebar"
        className="hidden lg:block w-64 shrink-0 rounded-2xl overflow-hidden border border-slate-800 h-[calc(100vh-5.5rem)] sticky top-20 shadow-xs z-10"
      >
        {content}
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div id="mobile-sidebar-drawer" className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
