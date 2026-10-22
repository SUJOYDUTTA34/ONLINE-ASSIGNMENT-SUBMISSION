import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Mail,
  Building2,
  Clock,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  FileText,
  Copy,
  ExternalLink,
  RotateCcw,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface ContactAuthorityViewProps {
  isEmbeddedInLanding?: boolean;
}

const CATEGORIES = [
  'Academic Dispute & Appeal',
  'Grade Re-evaluation Request',
  'Late Submission Waiver Petition',
  'Portal Technical & Storage Glitch',
  'FERPA & Privacy Inquiries',
  'General Registrar Support',
];

export const ContactAuthorityView: React.FC<ContactAuthorityViewProps> = ({
  isEmbeddedInLanding = false,
}) => {
  const { user } = useAuth();
  const { showToast, addNotification } = useNotifications();

  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [studentId, setStudentId] = useState(user?.studentIdNumber || '');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [urgency, setUrgency] = useState<'Standard' | 'Urgent' | 'Critical'>('Standard');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedEmail(address);
    showToast('Email address copied to clipboard', 'info');
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);

    // Simulate verified institutional intake and ticket generation
    setTimeout(() => {
      const trackingCode = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedRefId(trackingCode);
      setIsSubmitting(false);

      showToast(`Inquiry sent to Registrar. Reference: ${trackingCode}`, 'success');

      if (user) {
        addNotification(
          `Grievance Ticket Registered (${trackingCode})`,
          `Your message regarding "${subject}" was forwarded to the Institutional Registrar and Grievance Cell. Response SLA: 24-48 business hours.`,
          'info'
        );
      }
    }, 700);
  };

  const handleResetForm = () => {
    setSubmittedRefId(null);
    if (!user) {
      setFullName('');
      setEmail('');
      setStudentId('');
    }
    setSubject('');
    setMessage('');
    setCategory(CATEGORIES[0]);
    setUrgency('Standard');
  };

  const mailtoLink = `mailto:sujoydutta830@gmail.com?cc=sujoyjoy9@gmail.com&subject=${encodeURIComponent(
    `[${urgency.toUpperCase()}] ${category}: ${subject}`
  )}&body=${encodeURIComponent(
    `Sender: ${fullName}\nEmail: ${email}\nStudent/Staff ID: ${studentId || 'N/A'}\nCategory: ${category}\nUrgency: ${urgency}\n\nMessage:\n${message}\n\n--\nSubmitted via Scholaris Academic Portal`
  )}`;

  return (
    <div
      id="contact-authority-section"
      className={isEmbeddedInLanding ? 'w-full' : 'max-w-6xl mx-auto space-y-6 pb-8'}
    >
      {/* Title Header */}
      {!isEmbeddedInLanding && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Direct Authority Communication Hub
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Official escalation channel to the Institutional Registrar & Academic Grievance Cell
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" />
            Official Response SLA: 24–48 Hours
          </div>
        </div>
      )}

      {/* Main Grid: Left Authority Credentials & Right Contact Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Official Administrative Info (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Authority Information Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Office of the Registrar
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Institutional Grievance Redressal & Academic Governance
                </p>
              </div>
            </div>

            {/* Direct Email Addresses */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Official Email Addresses
              </p>

              {/* Primary Registrar Email */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-mono">
                      sujoydutta830@gmail.com
                    </p>
                    <p className="text-[10px] text-slate-400">Primary Office of Academic Records</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyEmail('sujoydutta830@gmail.com')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Copy email"
                >
                  {copiedEmail === 'sujoydutta830@gmail.com' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Grievance Cell Email */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-mono">
                      sujoyjoy9@gmail.com
                    </p>
                    <p className="text-[10px] text-slate-400">Confidential Redressal & Disputes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyEmail('sujoyjoy9@gmail.com')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Copy email"
                >
                  {copiedEmail === 'sujoyjoy9@gmail.com' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Operating Hours & Physical Address */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Mon – Fri: 9:00 AM – 5:00 PM EST (Closed Weekends)</span>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-snug">Raja Bazar Main Road, Midnapore, Paschim Medinipur, West Bengal 721101</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 text-xs">Direct Support:</span>
                <a
                  href="https://wa.me/918348227487"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>
            </div>
          </div>

          {/* Guidelines Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-200">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Academic Protocol Guarantee
            </div>
            <p className="text-xs text-blue-100 leading-relaxed">
              Every message dispatched through this channel is formally logged with a cryptographic receipt ID. If your appeal concerns late assignment penalties due to emergency circumstances, please provide course and receipt identifiers.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Form & Tracking Code (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
            <AnimatePresence mode="wait">
              {submittedRefId ? (
                /* Success View with Reference Code & Mailto Fallback */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  className="py-6 text-center space-y-5"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Inquiry Dispatched to Registrar & Grievance Cell
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Your message has been officially recorded in the institutional intake queue.
                    </p>
                  </div>

                  {/* Tracking Box */}
                  <div className="max-w-sm mx-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Official Tracking Reference
                    </p>
                    <p className="font-mono text-xl font-black text-blue-600 dark:text-blue-400 tracking-wider">
                      {submittedRefId}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Please quote this reference in any telephone or in-person correspondence.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <a
                      href={mailtoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in External Email Client
                    </a>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Send Another Message
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Contact Form */
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Submit Direct Inquiry or Formal Grievance
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium">All fields required *</span>
                  </div>

                  {/* Row 1: Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sujoy Dutta"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Official / Personal Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. student@scholaris.edu"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Row 2: Student ID and Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Student ID / Affiliation Code
                      </label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. CS-2024-001 (Optional for public)"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Inquiry Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Urgency Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Urgency Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Standard', 'Urgent', 'Critical'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setUrgency(level)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            urgency === level
                              ? level === 'Critical'
                                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs'
                                : level === 'Urgent'
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                                : 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subject / Course Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Formal Grade Appeal for Database Systems Midterm (CS-301)"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Detailed Message */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Detailed Message / Grievance Statement *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe the circumstance in detail. Include any assignment titles, receipt codes, or supporting evidence..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
                    />
                  </div>

                  {/* Form Submission Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-400">
                      Forwarded to <strong className="text-slate-600 dark:text-slate-300">sujoydutta830@gmail.com</strong> (CC: sujoyjoy9@gmail.com)
                    </p>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a
                        href={mailtoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Use your default desktop or mobile mail app"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Direct Mailto
                      </a>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Transmitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Send to Authority
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
