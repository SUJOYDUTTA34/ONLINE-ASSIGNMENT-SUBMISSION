import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
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
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();

  // Appearance State
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    return localStorage.getItem('setting_compact') === 'true';
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

  // Preference save confirmation
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  if (!user) return null;

  const handleSavePreferences = () => {
    localStorage.setItem('setting_compact', String(compactMode));
    localStorage.setItem('setting_email_alerts', String(emailAlerts));
    localStorage.setItem('setting_deadline_reminders', String(deadlineReminders));
    localStorage.setItem('setting_grade_alerts', String(gradeAlerts));
    localStorage.setItem('setting_sound_effects', String(soundEffects));

    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
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

        {prefSaved && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" /> Preferences Saved
          </span>
        )}
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
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Dark Mode</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Enable high-contrast night theme for low light environments
                    </p>
                  </div>
                </div>
                <button
                  id="toggle-dark-mode-btn"
                  onClick={() => setIsDark(!isDark)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDark ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Compact Table Mode</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Reduce padding in assignment lists and submission matrices
                    </p>
                  </div>
                </div>
                <input
                  id="toggle-compact-mode-checkbox"
                  type="checkbox"
                  checked={compactMode}
                  onChange={(e) => {
                    setCompactMode(e.target.checked);
                    handleSavePreferences();
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
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
              Configure which events trigger institutional alerts.
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Email Notifications</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Receive copy of critical deadlines at {user.email}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => {
                    setEmailAlerts(e.target.checked);
                    handleSavePreferences();
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">24-Hour Deadline Reminders</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Banner alert when assignment submissions are due within 24 hours
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={deadlineReminders}
                  onChange={(e) => {
                    setDeadlineReminders(e.target.checked);
                    handleSavePreferences();
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Grade & Rubric Evaluation Alerts</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Instant notification when grades or instructor feedback is published
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={gradeAlerts}
                  onChange={(e) => {
                    setGradeAlerts(e.target.checked);
                    handleSavePreferences();
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Interactive Audio Signals</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Play confirmation chime on successful file submission
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => {
                    setSoundEffects(e.target.checked);
                    handleSavePreferences();
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs"
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
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-900 transition-colors flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download My Academic Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
