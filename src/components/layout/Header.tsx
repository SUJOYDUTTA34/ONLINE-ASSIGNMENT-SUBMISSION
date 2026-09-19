import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { syncUserToSupabase, syncAppointmentToSupabase } from '../../services/supabaseClient';
import academicLogo from '../../assets/images/academic_crest_logo_1789753031183.jpg';
import {
  GraduationCap,
  Bell,
  CheckCheck,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  Shield,
  BookOpen,
  Sparkles,
  Cloud,
} from 'lucide-react';
import { UserRole } from '../../types';
import { UserAvatar } from '../common/UserAvatar';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar, setActiveTab }) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setRoleSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const roleLabels: Record<UserRole, { label: string; badge: string; icon: any }> = {
    admin: { label: 'Administrator', badge: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800', icon: Shield },
    faculty: { label: 'Faculty / Teacher', badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800', icon: BookOpen },
    student: { label: 'Student', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800', icon: GraduationCap },
  };

  const currentRoleConfig = roleLabels[user.role];

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 h-16 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & App Identity */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-700 bg-white flex items-center justify-center p-0.5">
              <img
                src={academicLogo}
                alt="Scholaris Crest"
                className="w-full h-full object-cover rounded-[9px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none flex items-center gap-1.5 font-serif">
                Scholaris
                <span className="text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Academic
                </span>
              </h1>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Online Assignment Submission System
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Persona / Role Switcher */}
          <div className="relative" ref={roleRef}>
            <button
              id="role-switcher-btn"
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition-all hover:opacity-90 ${currentRoleConfig.badge}`}
              title="Click to switch demo user role"
            >
              <currentRoleConfig.icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{currentRoleConfig.label}</span>
              <Sparkles className="w-3 h-3 text-amber-500 hidden sm:inline" />
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {roleSwitcherOpen && (
              <div
                id="role-switcher-dropdown"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Switch Active Persona (Demo)
                  </p>
                </div>
                <button
                  id="switch-student-btn"
                  onClick={() => {
                    switchDemoUser('student');
                    setRoleSwitcherOpen(false);
                    setActiveTab('dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    user.role === 'student' ? 'font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="font-medium">Sujoy Dutta</p>
                      <p className="text-[10px] text-slate-400">Student (2024-1388)</p>
                    </div>
                  </div>
                  {user.role === 'student' && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">Active</span>}
                </button>

                <button
                  id="switch-faculty-btn"
                  onClick={() => {
                    switchDemoUser('faculty');
                    setRoleSwitcherOpen(false);
                    setActiveTab('dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    user.role === 'faculty' ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Prof. Shovan Roy</p>
                      <p className="text-[10px] text-slate-400">Asst. Prof & HOD (Computer Science)</p>
                    </div>
                  </div>
                  {user.role === 'faculty' && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Active</span>}
                </button>

                <button
                  id="switch-admin-btn"
                  onClick={() => {
                    switchDemoUser('admin');
                    setRoleSwitcherOpen(false);
                    setActiveTab('dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    user.role === 'admin' ? 'font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="font-medium">Dr. Eleanor Vance</p>
                      <p className="text-[10px] text-slate-400">Administrator (ADM-901)</p>
                    </div>
                  </div>
                  {user.role === 'admin' && <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">Active</span>}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              id="notifications-dropdown-btn"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span
                  id="unread-notifications-badge"
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                id="notifications-popover"
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      id="mark-all-read-btn"
                      onClick={() => markAllAsRead()}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        id={`notif-item-${n.id}`}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.actionTab) {
                            setActiveTab(n.actionTab);
                            setNotifOpen(false);
                          }
                        }}
                        className={`p-3.5 text-left cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                          !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40">
                  <button
                    id="header-view-all-notifs-btn"
                    onClick={() => {
                      setActiveTab('notifications');
                      setNotifOpen(false);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              id="profile-dropdown-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="User profile menu"
            >
              <UserAvatar
                src={user.avatarUrl}
                name={user.name}
                size="md"
                className="border border-slate-200 dark:border-slate-700"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-none mt-0.5">
                  {user.studentIdNumber || user.employeeIdNumber || user.email}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <div
                id="profile-dropdown-menu"
                className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50"
              >
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {user.departmentName}
                  </span>
                </div>

                <button
                  id="profile-menu-profile-btn"
                  onClick={() => {
                    setActiveTab('profile');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  My Profile
                </button>

                <button
                  id="profile-menu-settings-btn"
                  onClick={() => {
                    setActiveTab('settings');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings & Preferences
                </button>

                <button
                  id="profile-menu-sync-supabase-btn"
                  onClick={async () => {
                    setProfileOpen(false);
                    const users = storage.getUsers();
                    const submissions = storage.getSubmissions();
                    let count = 0;
                    for (const u of users) {
                      await syncUserToSupabase({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        role: u.role,
                        departmentName: u.departmentName,
                        phone: u.phone,
                        status: u.status,
                        studentIdNumber: u.studentIdNumber,
                        employeeIdNumber: u.employeeIdNumber,
                        program: u.program,
                        joinedDate: u.joinedDate,
                      });
                      count++;
                    }
                    for (const s of submissions) {
                      await syncAppointmentToSupabase({
                        id: s.id,
                        studentId: s.studentId,
                        studentName: s.studentName,
                        assignmentId: s.assignmentId,
                        assignmentTitle: s.assignmentTitle,
                        courseCode: s.courseCode,
                        submittedAt: s.submittedAt,
                        status: s.status,
                        notes: s.comments || '',
                        fileUrl: s.fileName || '',
                      });
                    }
                    alert(`Successfully synced ${users.length} users and ${submissions.length} submissions to Supabase! Check your Supabase Table Editor.`);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 font-medium"
                >
                  <Cloud className="w-4 h-4 text-blue-500" />
                  Sync Data to Supabase Now
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700/60 my-1" />

                <button
                  id="profile-menu-logout-btn"
                  onClick={() => {
                    logout();
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
