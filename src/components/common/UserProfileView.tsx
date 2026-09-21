import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { UserAvatar } from './UserAvatar';
import {
  User as UserIcon,
  Mail,
  Building2,
  GraduationCap,
  Shield,
  BookOpen,
  Award,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  Sparkles,
  KeyRound,
} from 'lucide-react';

interface UserProfileViewProps {
  onNavigateToSettings?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onNavigateToSettings }) => {
  const { user, updateProfile } = useAuth();

  if (!user) return null;

  const [name, setName] = useState(user.name);
  const [email] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '+91 98765 43210');
  const [address, setAddress] = useState(user.address || 'Academic Hall 4B, Campus West');
  const [bio, setBio] = useState(
    user.bio ||
      (user.role === 'student'
        ? 'Sophomore undergraduate student focused on systems engineering, algorithms, and applied machine learning.'
        : user.role === 'faculty'
        ? 'Associate Professor of Computer Science. Research interests include distributed architectures and database systems.'
        : 'Senior Academic Administrator overseeing department schedules, course catalogs, and examination integrity.')
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derive stats based on role
  const courses = storage.getCourses();
  const assignments = storage.getAssignments();
  const submissions = storage.getSubmissions();

  const studentEnrolledCourses = courses.filter((c) => c.enrolledStudentIds?.includes(user.id));
  const studentSubmissions = submissions.filter((s) => s.studentId === user.id);
  const studentGradedSubmissions = studentSubmissions.filter((s) => s.status === 'graded');

  const facultyCourses = courses.filter((c) => c.facultyId === user.id || (c.facultyIds && c.facultyIds.includes(user.id)));
  const facultyCourseIds = facultyCourses.map((c) => c.id);
  const facultySubmissions = submissions.filter((s) => facultyCourseIds.includes(s.courseId));
  const pendingToGrade = facultySubmissions.filter((s) => s.status === 'submitted' || s.status === 'late');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!name.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const ok = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        bio: bio.trim(),
      });

      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setSaveError('Failed to save profile changes.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while updating profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="user-profile-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 relative">
          <div className="absolute right-4 bottom-4 flex gap-2">
            {onNavigateToSettings && (
              <button
                id="profile-goto-settings-btn"
                onClick={onNavigateToSettings}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Security & Preferences
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <UserAvatar
                src={user.avatarUrl}
                name={user.name}
                size="xl"
                className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-900 shadow-md bg-white object-cover"
              />
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {user.name}
                  </h1>
                  <span className="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <Building2 className="w-3.5 h-3.5" /> {user.departmentName}
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                ID: {user.studentIdNumber || user.employeeIdNumber || user.id}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {user.role === 'student' && (
              <>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative GPA</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">3.84 / 4.0</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Enrolled Courses</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {studentEnrolledCourses.length} Courses
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Submissions</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {studentSubmissions.length} Total
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Status</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Active / Good Standing</p>
                </div>
              </>
            )}

            {user.role === 'faculty' && (
              <>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Active Courses</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {facultyCourses.length} Courses
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Pending Review</p>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {pendingToGrade.length} Submissions
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Graded To Date</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {facultySubmissions.length - pendingToGrade.length} Submissions
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Designation</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">Instructor</p>
                </div>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Admin Level</p>
                  <p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">Super Administrator</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Total Users</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {storage.getUsers().length} Accounts
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Departments</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {storage.getDepartments().length} Active
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">System Logs</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {storage.getAuditLogs().length} Logged
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your contact details, bio summary, and display name.
            </p>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" /> Profile Updated Successfully
            </span>
          )}
          {saveError && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/70 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4" /> {saveError}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="profile-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Institutional Email (Read Only)
              </label>
              <input
                id="profile-email-input"
                type="email"
                value={email}
                disabled
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span>Contact Phone</span>
                <span className="text-[10px] text-slate-500 font-normal">(India +91)</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center gap-1 text-xs text-slate-500 font-medium select-none pointer-events-none">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  id="profile-phone-input"
                  type="tel"
                  value={phone.replace(/^\+91\s*/, '')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9\s]/g, '');
                    setPhone(val ? `+91 ${val}` : '');
                  }}
                  placeholder="98765 43210"
                  className="w-full pl-16 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Campus Location / Dorm / Office
              </label>
              <input
                id="profile-address-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Hall 4B, Room 201"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Bio / Academic Summary
            </label>
            <textarea
              id="profile-bio-input"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell professors and peers about your academic interests and projects..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              id="save-profile-btn"
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
