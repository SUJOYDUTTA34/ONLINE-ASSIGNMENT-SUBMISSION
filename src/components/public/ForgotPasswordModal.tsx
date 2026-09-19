import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReturnLogin?: () => void;
  onBackToLogin?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessReturnLogin,
  onBackToLogin,
}) => {
  const returnToLogin = onBackToLogin || onSuccessReturnLogin || onClose;
  const { resetPasswordRequest, confirmResetPassword } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    const res = await resetPasswordRequest(email);
    setLoading(false);
    if (res.success) {
      setStep(2);
    } else {
      setError(res.message || 'Unable to find user.');
    }
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code || code.trim().length < 4) {
      setError('Please enter the 6-digit verification code sent to your inbox.');
      return;
    }
    setStep(3);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await confirmResetPassword(email, newPassword);
    setLoading(false);
    if (res.success) {
      onClose();
      returnToLogin();
    } else {
      setError(res.message || 'Failed to update password.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {step === 1 && 'Reset Institutional Password'}
                  {step === 2 && 'Enter Verification Code'}
                  {step === 3 && 'Choose New Password'}
                </h3>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleStep1}
                  className="space-y-4"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Enter your registered student or faculty email address. A one-time verification token will be dispatched.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. alex.morgan@student.campus.edu"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? 'Sending Code...' : 'Send Verification Code'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleStep2}
                  className="space-y-4"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    We simulated dispatching a 6-digit code to <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>. (Demo code: <span className="font-mono font-bold text-blue-600">849201</span>)
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="849201"
                      maxLength={6}
                      className="w-full px-3 py-2 text-center tracking-widest text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Verify Code & Continue
                  </button>
                </motion.form>
              )}

              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleStep3}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? 'Updating...' : 'Update Password & Return to Login'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
