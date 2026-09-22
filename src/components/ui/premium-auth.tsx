import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { PasswordStrength } from '@/components/ui/password-strength';
import { ShinyButton } from '@/components/ui/shiny-button';
import { ThemeToggle } from '../common/ThemeToggle';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  GraduationCap,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  X,
  Shield,
} from 'lucide-react';

export interface AuthFormProps {
  defaultMode?: 'login' | 'register';
  onSuccess?: () => void;
  onOpenForgotPassword?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  defaultMode = 'login',
  onSuccess,
  onOpenForgotPassword,
  onClose,
  showCloseButton = false,
}) => {
  const { login, loginWithGoogle, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [adminPasskey, setAdminPasskey] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [departmentId, setDepartmentId] = useState('dept-1');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [registeredInfo, setRegisteredInfo] = useState<{
    name: string;
    email: string;
    role: string;
    idNumber: string;
    department: string;
    program: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const departments = storage.getDepartments();

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    if (res.success) {
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } else {
      setError(res.message || 'Google authentication failed.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail.trim()) {
      setError('Please enter your email address (Gmail or username).');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const res = await login(loginEmail, loginPassword, rememberMe);
    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } else {
      setError(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const effectiveId =
      role === 'student'
        ? identifier.trim() || `STU-${Date.now().toString().slice(-4)}`
        : identifier.trim() || `FAC-${Date.now().toString().slice(-4)}`;

    const effectiveProgram = program.trim() || (role === 'student' ? 'B.S. Computer Science' : role === 'admin' ? 'System Administration' : 'Department Faculty');

    setLoading(true);
    const res = await register({
      name,
      email,
      phone,
      role,
      departmentId,
      studentIdNumber: role === 'student' ? effectiveId : undefined,
      employeeIdNumber: role !== 'student' ? effectiveId : undefined,
      semester: role === 'student' ? semester : undefined,
      program: effectiveProgram,
      password,
      adminPasskey,
    } as any);
    setLoading(false);

    if (res.success) {
      const deptObj = departments.find((d) => d.id === departmentId);
      setRegisteredInfo({
        name,
        email,
        role: role === 'student' ? 'Student' : role === 'admin' ? 'Administrator' : 'Faculty Member',
        idNumber: effectiveId,
        department: deptObj ? deptObj.name : 'Computer Science & Engineering',
        program: effectiveProgram,
      });
    } else {
      setError(res.message || 'Registration failed.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-[28px] bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xl transition-all">
      {/* Top Header with Dark/Light Toggle & Optional Close */}
      <div className="relative mb-6 text-center">
        {/* Dark / Light Mode Toggle in Auth Modal */}
        <div className="absolute -top-2 -left-2">
          <ThemeToggle
            id="auth-modal-theme-toggle"
            variant="button"
            className="h-8 w-8 !p-1.5 rounded-full border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          />
        </div>

        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-2 -right-2 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <h2 className="text-2xl sm:text-[26px] font-extrabold text-neutral-900 dark:text-white tracking-tight">
          {registeredInfo ? 'Welcome to Scholaris' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
          {registeredInfo
            ? 'Your academic credentials are ready'
            : mode === 'login'
            ? 'Sign in to your account'
            : 'Register your student or faculty profile'}
        </p>
      </div>

      {/* Segmented Tab Switcher (Login / Sign Up) */}
      {!registeredInfo && (
        <div className="p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/90 flex items-center mb-6">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode('login');
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode('register');
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Confirmation View after Successful Registration */}
      {registeredInfo ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-2 space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
              Registration Successful
            </span>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Welcome, {registeredInfo.name}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Your profile is verified and active.
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-700/80 text-left text-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-neutral-500 dark:text-neutral-400">Assigned Role:</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{registeredInfo.role}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-neutral-500 dark:text-neutral-400">Institutional ID:</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">{registeredInfo.idNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Department:</span>
              <span className="text-neutral-900 dark:text-white font-medium">{registeredInfo.department}</span>
            </div>
          </div>

          <ShinyButton
            id="premium-proceed-btn"
            type="button"
            variant="dark"
            onClick={() => {
              if (onSuccess) onSuccess();
              if (onClose) onClose();
            }}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
            className="w-full mt-2"
          >
            Proceed to Workspace
          </ShinyButton>
        </motion.div>
      ) : mode === 'login' ? (
        /* Login Form */
        <motion.form
          key="login-form"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.15 }}
          onSubmit={handleLogin}
          className="space-y-4"
        >
          {/* Email / Username Input */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-3 focus-within:border-neutral-900 dark:focus-within:border-white focus-within:ring-1 focus-within:ring-neutral-900 dark:focus-within:ring-white transition-all">
            <Mail className="w-5 h-5 text-neutral-400 dark:text-neutral-500 shrink-0 mr-3" />
            <input
              id="premium-login-email-input"
              type="text"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email Address"
              autoComplete="username"
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-3 focus-within:border-neutral-900 dark:focus-within:border-white focus-within:ring-1 focus-within:ring-neutral-900 dark:focus-within:ring-white transition-all">
            <Lock className="w-5 h-5 text-neutral-400 dark:text-neutral-500 shrink-0 mr-3" />
            <input
              id="premium-login-password-input"
              type={showLoginPassword ? 'text' : 'password'}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none pr-8"
              required
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
              className="absolute right-3.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 cursor-pointer transition-colors"
              aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
            >
              {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember me & Forgot Password row */}
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <label className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            {onOpenForgotPassword && (
              <button
                type="button"
                onClick={onOpenForgotPassword}
                className="font-medium text-neutral-900 dark:text-neutral-200 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            )}
          </div>

          {/* Submit Button */}
          <ShinyButton
            id="premium-login-submit-btn"
            type="submit"
            variant="dark"
            disabled={loading}
            className="w-full mt-3"
            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </ShinyButton>

          {/* Bottom Switch Link */}
          <div className="pt-4 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('register');
                }}
                className="font-bold text-neutral-900 dark:text-white hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </div>
        </motion.form>
      ) : (
        /* Sign Up Form */
        <motion.form
          key="register-form"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          onSubmit={handleRegister}
          className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1"
        >
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-2 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === 'student'
                  ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/40'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole('faculty')}
              className={`py-2 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === 'faculty'
                  ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/40'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Faculty
            </button>
          </div>

          {/* Full Name */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-2.5 focus-within:border-neutral-900 dark:focus-within:border-white transition-all">
            <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mr-2.5" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none"
              required
            />
          </div>

          {/* Institutional ID */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-2.5 focus-within:border-neutral-900 dark:focus-within:border-white transition-all">
            <GraduationCap className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mr-2.5" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={role === 'student' ? 'Student ID (e.g. CS-2024-105)' : 'Employee ID (e.g. FAC-550)'}
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none"
              required
            />
          </div>

          {/* Email */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-2.5 focus-within:border-neutral-900 dark:focus-within:border-white transition-all">
            <Mail className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mr-2.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none"
              required
            />
          </div>

          {/* Phone (Indian Format) */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-2.5 focus-within:border-neutral-900 dark:focus-within:border-white transition-all">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-200/70 dark:bg-neutral-700/80 px-1.5 py-0.5 rounded-lg mr-2 select-none">
              <span>🇮🇳</span>
              <span>+91</span>
            </div>
            <input
              type="tel"
              value={phone.replace(/^\+91\s*/, '')}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                let formatted = digits;
                if (digits.length > 5) {
                  formatted = `${digits.slice(0, 5)} ${digits.slice(5)}`;
                }
                setPhone(digits ? `+91 ${formatted}` : '');
              }}
              placeholder="98765 43210"
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none"
            />
          </div>

          {/* Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-800/60 text-neutral-900 dark:text-white outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {role === 'student' ? (
              <div>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-800/60 text-neutral-900 dark:text-white outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="Specialization"
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-800/60 text-neutral-900 dark:text-white outline-none"
                />
              </div>
            )}
          </div>

          {/* Password */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-2.5 focus-within:border-neutral-900 dark:focus-within:border-white transition-all">
            <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mr-2.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create Password"
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none pr-7"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative flex items-center bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-3.5 py-2.5 focus-within:border-neutral-900 dark:focus-within:border-white transition-all">
            <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mr-2.5" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 w-full outline-none pr-7"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1"
            >
              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80">
              <PasswordStrength value={password} showRules={true} />
            </div>
          )}

          {/* Submit Registration Button */}
          <ShinyButton
            id="premium-register-submit-btn"
            type="submit"
            variant="dark"
            disabled={loading}
            className="w-full mt-3"
            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </ShinyButton>

          {/* Bottom Switch Link */}
          <div className="pt-3 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="font-bold text-neutral-900 dark:text-white hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </div>
        </motion.form>
      )}
    </div>
  );
};

export default AuthForm;
