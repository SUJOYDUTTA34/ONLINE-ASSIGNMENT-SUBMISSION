import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import academicLogo from '../../assets/images/academic_crest_logo_1789753031183.jpg';
import {
  GraduationCap,
  UploadCloud,
  Clock,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  History,
  Bell,
  TrendingUp,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  Users,
  ChevronRight,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin, onOpenRegister }) => {
  const { switchDemoUser } = useAuth();
  const [howItWorksRole, setHowItWorksRole] = useState<'student' | 'faculty'>('student');

  const stats = storage.getSystemStats();

  const studentSteps = [
    { num: '01', title: 'Sign In to Portal', desc: 'Secure single-sign-on using institutional student ID and academic credentials.' },
    { num: '02', title: 'View Assignment Rubrics', desc: 'Inspect deadlines, instructions, allowed formats (PDF, DOCX, ZIP), and downloadable materials.' },
    { num: '03', title: 'Upload Your Work', desc: 'Drag and drop files with automatic client & server-side validation against file type and size limits.' },
    { num: '04', title: 'Submit with Confirmation', desc: 'Confirm your submission with instant server timestamping and verifiable receipt generation.' },
    { num: '05', title: 'Track Status in Real Time', desc: 'Monitor whether your work is on-time, late penalty deductions, or pending instructor review.' },
    { num: '06', title: 'Receive Grades & Feedback', desc: 'View comprehensive scores, detailed faculty comments, and academic performance tracking.' },
  ];

  const facultySteps = [
    { num: '01', title: 'Access Faculty Dashboard', desc: 'Manage your active courses, syllabi, enrolled student cohorts, and pending submissions.' },
    { num: '02', title: 'Create Assignments', desc: 'Draft assignments with custom due dates, late submission penalty policies, and file format restrictions.' },
    { num: '03', title: 'Attach Course Resources', desc: 'Upload lab starter code, rubrics, and reference PDFs for enrolled students to download.' },
    { num: '04', title: 'Receive Student Submissions', desc: 'View live submission rosters with automatic on-time vs. late categorization and versioning.' },
    { num: '05', title: 'Grade with Rubrics', desc: 'Review submissions in a dedicated grading drawer, input marks, and record private notes.' },
    { num: '06', title: 'Provide Constructive Feedback', desc: 'Publish personalized student critiques with instant notification alerts and audit logging.' },
  ];

  const features = [
    {
      icon: UploadCloud,
      title: 'Easy Assignment Submission',
      desc: 'Seamless drag-and-drop file upload with format verification and progress monitoring.',
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      icon: Clock,
      title: 'Deadline Tracking',
      desc: 'Real-time countdowns, automatic late submission penalties, and automated 24-hour alerts.',
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      icon: ShieldCheck,
      title: 'Secure File Upload',
      desc: 'Safe storage outside public directories, MIME-type sanitation, and authorized downloads only.',
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      icon: Award,
      title: 'Online Grading',
      desc: 'Standardized mark entry, audit-trailed grade revisions, and automatic percentage calculations.',
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40',
    },
    {
      icon: MessageSquare,
      title: 'Faculty Feedback',
      desc: 'Rich inline commentary and actionable evaluation notes published directly to the student.',
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40',
    },
    {
      icon: History,
      title: 'Submission History',
      desc: 'Complete version history, archival records, and downloadable submission proof receipts.',
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      icon: Bell,
      title: 'Instant Notifications',
      desc: 'Automated in-app alerts and email dispatches for assignments, deadlines, and grade releases.',
      color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40',
    },
    {
      icon: TrendingUp,
      title: 'Student Progress Tracking',
      desc: 'Comprehensive GPA monitoring, course-by-course analytics, and historical grade trends.',
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Academic Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium text-white">University Academic Portal 2026–2027</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 hidden sm:inline">Fall Semester Secure Authentication Gateway Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-[11px] font-medium">Secure SSL Encrypted</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-700 bg-white flex items-center justify-center p-0.5 group">
              <img
                src={academicLogo}
                alt="Scholaris Academic Crest"
                className="w-full h-full object-cover rounded-[9px] transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <svg className="sr-only" aria-hidden="true" viewBox="0 0 24 24">
                <title>Scholaris Academic Crest</title>
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Scholaris
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tracking-normal font-sans">
                  Academic
                </span>
              </span>
              <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Online Assignment Submission System
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              How It Works
            </a>
            <a href="#statistics" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Statistics
            </a>
            <a href="#about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="landing-login-btn"
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              id="landing-get-started-btn"
              onClick={onOpenRegister}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-3xl" />
          <div className="w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-2xl -translate-y-24" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Academic Submission Architecture
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Smart & Simple Online Assignment Submission
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Submit assignments, manage deadlines, track grades, and communicate with faculty — all from one secure platform.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                id="hero-get-started-btn"
                onClick={onOpenRegister}
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                id="hero-login-btn"
                onClick={onOpenLogin}
                className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Login to Portal
              </button>
              <a
                href="#features"
                className="px-5 py-3.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Explore Features ↓
              </a>
            </div>
          </div>

          {/* Academic Illustration / Dashboard Preview */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="relative rounded-2xl p-2 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {/* Mock Browser Header */}
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-2">
                      portal.campus.edu/student/assignments
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      ● Live Preview
                    </span>
                  </div>
                </div>

                {/* Simulated UI Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">CS-301</span>
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">Due in 5 days</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Linked List Implementation</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prof. Robert Chen • Max Marks: 20</p>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs text-slate-400">PDF, DOCX, ZIP</span>
                      <span className="text-xs font-semibold text-blue-600 hover:underline">Submit Now →</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">CS-402</span>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">Published</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">RESTful API & Docker</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prof. Sarah Jenkins • Max Marks: 50</p>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs text-slate-400">ZIP, PDF</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">View Details</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">CS-301</span>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">Graded: 19.5/20</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Binary Search Trees & AVL</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Status: Submitted On Time</p>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs text-emerald-600 font-medium">Feedback Available</span>
                      <span className="text-xs font-semibold text-blue-600 hover:underline">View Receipt</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Configurable Statistics Section */}
      <section id="statistics" className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Campus Scale & Engagement
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              Powering Higher Education Coursework
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">1,000+</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Active Students</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stats.totalStudents} currently active in session</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">100+</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Faculty Members</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stats.totalFaculty} professors on portal</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">500+</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Assignments Handled</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stats.totalAssignments} active in catalog</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400">50+</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Accredited Courses</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stats.totalCourses} departmental offerings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Cards Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Enterprise Academic Features
          </h2>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            Engineered for Modern Universities
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
            Every feature designed to eliminate submission friction, prevent lost assignments, and ensure transparent grading.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 shadow-xs hover:shadow-md transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${f.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-100/70 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Streamlined Workflows
            </h2>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
              How It Works
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Intuitive step-by-step guidance tailored for both students and instructional faculty.
            </p>

            {/* Role Switcher Pill */}
            <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-6 shadow-xs">
              <button
                onClick={() => setHowItWorksRole('student')}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  howItWorksRole === 'student'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                For Students (6 Steps)
              </button>
              <button
                onClick={() => setHowItWorksRole('faculty')}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  howItWorksRole === 'faculty'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                For Faculty (6 Steps)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(howItWorksRole === 'student' ? studentSteps : facultySteps).map((step, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative shadow-xs"
              >
                <span className="text-2xl font-black text-blue-600/30 dark:text-blue-400/20 mb-3 block">
                  {step.num}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About & Trust Section */}
      <section id="about" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Accreditation & Compliance Ready
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Built Specifically for Academic Integrity and Rigor
            </h2>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              EduSubmit eliminates common friction points in higher education. With server-authoritative timestamps, automated late penalties, tamper-evident audit logs, and secure restricted downloads, institutions maintain complete compliance with academic regulations.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'Tamper-proof server timestamps prevent device time manipulation',
                'Downloadable submission receipts with cryptographic hash IDs',
                'Role-Based Access Control (RBAC) separating Students, Faculty, and Admins',
                'Full audit trail recording all grade changes and document access',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={onOpenRegister}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Join University Portal
              </button>
              <button
                onClick={onOpenLogin}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Institutional Login
              </button>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white border border-slate-800 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Secure Authentication Guidelines</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              All access to administrative, faculty, and student portals requires entering valid institutional credentials and secure authentication.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Student Portal Access</p>
                    <p className="text-[11px] text-slate-300">Requires Student ID & Institutional Email (e.g. sujoydutta830@gmail.com)</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Faculty Portal Access</p>
                    <p className="text-[11px] text-slate-300">Requires Faculty ID & Secure Password Authentication</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Administrator Portal Access</p>
                    <p className="text-[11px] text-slate-300">Restricted to IT Staff & Department Heads via Encrypted Gateway</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-700 bg-white flex items-center justify-center">
                <img
                  src={academicLogo}
                  alt="Scholaris Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-bold text-white text-sm tracking-tight">Scholaris Academic</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Institutional Online Assignment Submission, Assessment & Archival Portal.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-2">Student Services</p>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#" className="hover:text-white transition-colors">Course Enrolment</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Assignment Guidelines</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Late Submission Rules</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Academic Appeal Policy</a></li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-white mb-2">Faculty Resources</p>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#" className="hover:text-white transition-colors">Rubric Standards</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Plagiarism Detection</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Grade Moderation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Faculty Guidelines</a></li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-white mb-2">Security & Compliance</p>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#" className="hover:text-white transition-colors">FERPA / GDPR Compliance</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Audit Logging Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Server-Side Timestamping</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Institutional Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-[11px]">
          <p>© 2026 Online Assignment Submission System. All rights reserved.</p>
          <p className="text-slate-500">College Registrar & Information Technology Services</p>
        </div>
      </footer>
    </div>
  );
};
