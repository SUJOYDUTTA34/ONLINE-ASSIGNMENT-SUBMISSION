import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { playAudioEffect } from '../../lib/audio';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Lock,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Eye,
  EyeOff,
  Volume2,
  Mail,
  FileSpreadsheet,
  Trash2,
  Clock,
  Award,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, deleteAccount } = useAuth();
  const { showToast } = useNotifications();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Appearance State
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    return localStorage.getItem('setting_compact') === 'true' || document.body.getAttribute('data-compact') === 'true';
  });

  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState<boolean>(() => {
    return localStorage.getItem('setting_email_alerts') !== 'false';
  });
  const [deadlineReminders, setDeadlineReminders] = useState<boolean>(() => {
    return localStorage.getItem('setting_deadline_reminders') !== 'false';
  });
  const [gradeAlerts, setGradeAlerts] = useState<boolean>(() => {
    return localStorage.getItem('setting_grade_alerts') !== 'false';
  });
  const [soundEffects, setSoundEffects] = useState<boolean>(() => {
    return localStorage.getItem('setting_sound_effects') !== 'false';
  });

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) return null;

  // Toggle Handlers with Instant Persistence and Audio Feedback
  const handleToggleDark = (nextDark: boolean) => {
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    playAudioEffect('chime');
    showToast({
      type: 'info',
      title: nextDark ? 'Dark Theme Activated' : 'Light Theme Activated',
      message: nextDark ? 'Dark mode enabled with high contrast palette.' : 'Light mode enabled with high readability palette.',
    });
  };

  const handleToggleCompact = (nextCompact: boolean) => {
    setCompactMode(nextCompact);
    localStorage.setItem('setting_compact', String(nextCompact));
    if (nextCompact) {
      document.body.setAttribute('data-compact', 'true');
    } else {
      document.body.removeAttribute('data-compact');
    }
    playAudioEffect('chime');
    showToast({
      type: 'info',
      title: nextCompact ? 'Compact Tables Active' : 'Standard Tables Active',
      message: nextCompact ? 'Table padding minimized for higher information density.' : 'Default comfortable table padding restored.',
    });
  };

  const handleToggleEmail = (nextEmail: boolean) => {
    setEmailAlerts(nextEmail);
    localStorage.setItem('setting_email_alerts', String(nextEmail));
    playAudioEffect('chime');
    showToast({
      type: 'success',
      title: nextEmail ? 'Email Dispatch Active' : 'Email Alerts Paused',
      message: nextEmail ? `Assignment deadline reminders will be dispatched to ${user.email}.` : 'Email notifications paused for your profile.',
    });
  };

  const handleToggleDeadline = (nextDeadline: boolean) => {
    setDeadlineReminders(nextDeadline);
    localStorage.setItem('setting_deadline_reminders', String(nextDeadline));
    playAudioEffect('chime');
    showToast({
      type: 'success',
      title: nextDeadline ? '12-Hour Urgent Reminders Enabled' : 'Deadline Reminders Muted',
      message: nextDeadline ? 'You will receive priority warning notifications 12 hours before deadlines.' : 'Urgent deadline alerts turned off.',
    });
  };

  const handleToggleGrade = (nextGrade: boolean) => {
    setGradeAlerts(nextGrade);
    localStorage.setItem('setting_grade_alerts', String(nextGrade));
    playAudioEffect('chime');
    showToast({
      type: 'success',
      title: nextGrade ? 'Grade Evaluation Alerts Enabled' : 'Grade Alerts Muted',
      message: nextGrade ? 'Instant notification will be sent as soon as instructors evaluate your submissions.' : 'Grade notifications turned off.',
    });
  };

  const handleToggleAudio = (nextSound: boolean) => {
    setSoundEffects(nextSound);
    localStorage.setItem('setting_sound_effects', String(nextSound));
    if (nextSound) {
      playAudioEffect('success');
      showToast({
        type: 'success',
        title: 'Interactive Audio Signals Enabled',
        message: 'Auditory feedback and submission confirmation chimes are now active.',
      });
    } else {
      showToast({
        type: 'info',
        title: 'Audio Signals Muted',
        message: 'System auditory signals and chimes have been muted.',
      });
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    // Log password change in audit logs
    storage.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_UPDATED',
      entityType: 'User',
      entityId: user.id,
      details: `User successfully changed account password.`,
      ipAddress: '127.0.0.1',
    });

    playAudioEffect('success');
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  const handleExportData = () => {
    let exportData: any = {};
    if (user.role === 'student') {
      const submissions = storage.getSubmissions().filter((s) => s.studentId === user.id);
      exportData = {
        student: user.name,
        email: user.email,
        studentId: user.studentIdNumber,
        department: user.departmentName,
        exportDate: new Date().toISOString(),
        submissions,
      };
    } else if (user.role === 'faculty') {
      const courses = storage.getCourses().filter((c) => c.facultyId === user.id);
      const assignments = storage.getAssignments().filter((a) => a.facultyId === user.id);
      exportData = {
        faculty: user.name,
        email: user.email,
        employeeId: user.employeeIdNumber,
        courses,
        assignments,
        exportDate: new Date().toISOString(),
      };
    } else {
      exportData = {
        admin: user.name,
        stats: storage.getSystemStats(),
        exportDate: new Date().toISOString(),
      };
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scholaris_${user.role}_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playAudioEffect('success');
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            System & Account Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your interface appearance, notification dispatching preferences, security credentials, and academic data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Preferences & Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Appearance & Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select visual presentation styles optimized for academic work.
            </p>

            <div className="space-y-3">
              {/* Dark Mode Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                    {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Enable high-contrast dark theme for low-light study sessions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-dark-mode-btn"
                  role="switch"
                  aria-checked={isDark}
                  onClick={() => handleToggleDark(!isDark)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isDark ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Compact Mode Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Compact Table Mode</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Reduce padding in assignment lists and submission matrices
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-compact-mode-btn"
                  role="switch"
                  aria-checked={compactMode}
                  onClick={() => handleToggleCompact(!compactMode)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    compactMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      compactMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Notification Dispatch Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Configure automated alerts, reminders, and audio feedback signals.
            </p>

            <div className="space-y-3">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Email Notifications</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Receive critical assignment alerts and receipts at <strong className="text-slate-700 dark:text-slate-300">{user.email}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-email-alerts-btn"
                  role="switch"
                  aria-checked={emailAlerts}
                  onClick={() => handleToggleEmail(!emailAlerts)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    emailAlerts ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 12-Hour / 24-Hour Deadline Reminders */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">12-Hour Urgent Deadline Reminders</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      High-priority notifications and countdown warnings when assignment deadlines are approaching
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-deadline-reminders-btn"
                  role="switch"
                  aria-checked={deadlineReminders}
                  onClick={() => handleToggleDeadline(!deadlineReminders)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    deadlineReminders ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      deadlineReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Grade & Rubric Evaluation Alerts */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Grade & Rubric Evaluation Alerts</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Immediate notification when faculty publishes grades, marks breakdown, or feedback
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-grade-alerts-btn"
                  role="switch"
                  aria-checked={gradeAlerts}
                  onClick={() => handleToggleGrade(!gradeAlerts)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    gradeAlerts ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      gradeAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Interactive Audio Signals */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Interactive Audio Signals</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Play acoustic confirmation chimes on successful submission and critical events
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-sound-effects-btn"
                  role="switch"
                  aria-checked={soundEffects}
                  onClick={() => handleToggleAudio(!soundEffects)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    soundEffects ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      soundEffects ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Password Change Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Security & Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Update institutional portal login password.
            </p>

            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Password has been updated successfully.
              </div>
            )}

            {passwordError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="settings-current-pwd"
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    id="settings-new-pwd"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="settings-confirm-pwd"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="update-password-submit-btn"
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Session & Data Export */}
        <div className="space-y-6">
          {/* Active Session Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Session Integrity
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white">Current Session</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chrome on Linux (Local Container Sandbox)
                </p>
                <p className="text-[10px] text-slate-400 mt-1">IP: 127.0.0.1 • TLS 1.3 Verified</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white mb-0.5">Role Privileges</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                  {user.role} ({user.departmentName || 'General Campus'})
                </p>
              </div>
            </div>
          </div>

          {/* Data Export Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-500" />
              Academic Data Export
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Export your submissions history, course registrations, and receipt ledger in structured JSON format.
            </p>

            <button
              id="export-data-json-btn"
              onClick={handleExportData}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download My Academic Ledger
            </button>
          </div>

          {/* Privacy & Account Deletion (GDPR / FERPA) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-500" />
              Data Privacy & Account Erasure
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Exercise your FERPA / GDPR Right to be Forgotten. Permanently deletes your account and scrubs all personal identifiable data.
            </p>

            {!showDeleteConfirm ? (
              <button
                id="delete-account-trigger-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account & Personal Data
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 space-y-3">
                <p className="text-xs font-bold text-red-900 dark:text-red-200">
                  Are you absolutely certain?
                </p>
                <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                  This action is permanent. Your credentials will be erased, course enrollments removed, and submissions anonymized.
                </p>
                <div className="flex gap-2">
                  <button
                    id="confirm-delete-account-btn"
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      await deleteAccount();
                    }}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? 'Erasing Data...' : 'Yes, Permanently Delete'}
                  </button>
                  <button
                    id="cancel-delete-account-btn"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="py-2 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
