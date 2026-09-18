import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

// Student Views
import { StudentDashboard } from '../student/StudentDashboard';
import { StudentAssignments } from '../student/StudentAssignments';
import { StudentSubmissions } from '../student/StudentSubmissions';
import { StudentGrades } from '../student/StudentGrades';
import { StudentCourses } from '../student/StudentCourses';
import { SubmitAssignmentModal } from '../student/SubmitAssignmentModal';
import { AssignmentDetailsModal } from '../student/AssignmentDetailsModal';

// Faculty Views
import { FacultyDashboard } from '../faculty/FacultyDashboard';
import { FacultyAssignments } from '../faculty/FacultyAssignments';
import { FacultySubmissions } from '../faculty/FacultySubmissions';
import { FacultyCourses } from '../faculty/FacultyCourses';
import { FacultyAnalytics } from '../faculty/FacultyAnalytics';
import { CreateAssignmentModal } from '../faculty/CreateAssignmentModal';

// Admin Views
import { AdminDashboard } from '../admin/AdminDashboard';
import { UserManagement } from '../admin/UserManagement';
import { CourseManagement } from '../admin/CourseManagement';
import { DepartmentManagement } from '../admin/DepartmentManagement';
import { AuditLogsView } from '../admin/AuditLogsView';
import { SystemReportsView } from '../admin/SystemReportsView';

// Common Views
import { UserProfileView } from '../common/UserProfileView';
import { SettingsView } from '../common/SettingsView';
import { NotificationsView } from '../common/NotificationsView';

import { Assignment, Submission } from '../../types';

interface LayoutProps {
  onLogoutToLanding: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ onLogoutToLanding }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Student Modals
  const [submitModalAssignment, setSubmitModalAssignment] = useState<Assignment | null>(null);
  const [detailsModalAssignment, setDetailsModalAssignment] = useState<Assignment | null>(null);

  // Faculty Modals & State
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [selectedSubmissionToGrade, setSelectedSubmissionToGrade] = useState<Submission | null>(null);

  // Admin Modals
  const [adminAddUserOpen, setAdminAddUserOpen] = useState(false);
  const [adminAddCourseOpen, setAdminAddCourseOpen] = useState(false);

  if (!user) return null;

  // Find user submission for details modal if viewing assignment
  const userSubmissionForDetails = detailsModalAssignment
    ? storage
        .getSubmissions()
        .find(
          (s) =>
            s.assignmentId === detailsModalAssignment.id && s.studentId === user.id
        )
    : undefined;

  // Handle Tab Switch
  const handleTabChange = (tab: string) => {
    if (tab === 'create-assignment') {
      setCreateAssignmentOpen(true);
      return;
    }
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const renderContent = () => {
    // STUDENT ROLE
    if (user.role === 'student') {
      switch (activeTab) {
        case 'dashboard':
          return (
            <StudentDashboard
              onSelectAssignment={(asg: Assignment) => setDetailsModalAssignment(asg)}
              onOpenSubmitModal={(asg: Assignment) => setSubmitModalAssignment(asg)}
              onViewSubmissionsTab={() => setActiveTab('submissions')}
              onViewGradesTab={() => setActiveTab('grades')}
            />
          );
        case 'my-courses':
          return (
            <StudentCourses
              onNavigateToAssignments={(courseId) => {
                setActiveTab('assignments');
              }}
            />
          );
        case 'assignments':
          return (
            <StudentAssignments
              onSelectAssignment={(asg: Assignment) => setDetailsModalAssignment(asg)}
              onOpenSubmitModal={(asg: Assignment) => setSubmitModalAssignment(asg)}
            />
          );
        case 'my-submissions':
        case 'submissions':
          return (
            <StudentSubmissions
              onOpenSubmitModal={(asg: Assignment) => setSubmitModalAssignment(asg)}
            />
          );
        case 'grades':
          return <StudentGrades />;
        case 'notifications':
          return <NotificationsView />;
        case 'profile':
          return <UserProfileView onNavigateToSettings={() => setActiveTab('settings')} />;
        case 'settings':
          return <SettingsView />;
        default:
          return (
            <StudentDashboard
              onSelectAssignment={(asg: Assignment) => setDetailsModalAssignment(asg)}
              onOpenSubmitModal={(asg: Assignment) => setSubmitModalAssignment(asg)}
              onViewSubmissionsTab={() => setActiveTab('submissions')}
              onViewGradesTab={() => setActiveTab('grades')}
            />
          );
      }
    }

    // FACULTY ROLE
    if (user.role === 'faculty') {
      switch (activeTab) {
        case 'dashboard':
          return (
            <FacultyDashboard
              onOpenCreateAssignment={() => setCreateAssignmentOpen(true)}
              onSelectSubmissionToGrade={(sub: Submission) => {
                setSelectedSubmissionToGrade(sub);
                setActiveTab('submissions');
              }}
              onNavigateTab={handleTabChange}
            />
          );
        case 'assignments':
          return (
            <FacultyAssignments
              onOpenCreateModal={() => setCreateAssignmentOpen(true)}
            />
          );
        case 'submissions':
        case 'grading':
          return (
            <FacultySubmissions
              initialSubmissionToGrade={selectedSubmissionToGrade}
              onClearInitialSubmission={() => setSelectedSubmissionToGrade(null)}
            />
          );
        case 'my-courses':
          return <FacultyCourses />;
        case 'analytics':
          return <FacultyAnalytics />;
        case 'notifications':
          return <NotificationsView />;
        case 'profile':
          return <UserProfileView onNavigateToSettings={() => setActiveTab('settings')} />;
        case 'settings':
          return <SettingsView />;
        default:
          return (
            <FacultyDashboard
              onOpenCreateAssignment={() => setCreateAssignmentOpen(true)}
              onSelectSubmissionToGrade={(sub: Submission) => {
                setSelectedSubmissionToGrade(sub);
                setActiveTab('submissions');
              }}
              onNavigateTab={handleTabChange}
            />
          );
      }
    }

    // ADMIN ROLE
    if (user.role === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return (
            <AdminDashboard
              onNavigateTab={handleTabChange}
              onOpenAddUser={() => {
                setAdminAddUserOpen(true);
                setActiveTab('users');
              }}
              onOpenAddCourse={() => {
                setAdminAddCourseOpen(true);
                setActiveTab('courses');
              }}
            />
          );
        case 'users':
          return (
            <UserManagement
              isAddModalOpen={adminAddUserOpen}
              onCloseAddModal={() => setAdminAddUserOpen(false)}
            />
          );
        case 'courses':
          return (
            <CourseManagement
              isAddModalOpen={adminAddCourseOpen}
              onCloseAddModal={() => setAdminAddCourseOpen(false)}
            />
          );
        case 'departments':
          return <DepartmentManagement />;
        case 'assignments-admin':
        case 'assignments':
          return (
            <FacultyAssignments
              onOpenCreateModal={() => setCreateAssignmentOpen(true)}
            />
          );
        case 'submissions-admin':
        case 'submissions':
          return <FacultySubmissions />;
        case 'reports':
          return <SystemReportsView />;
        case 'audit-logs':
          return <AuditLogsView />;
        case 'analytics':
          return <FacultyAnalytics />;
        case 'notifications':
          return <NotificationsView />;
        case 'profile':
          return <UserProfileView onNavigateToSettings={() => setActiveTab('settings')} />;
        case 'settings':
          return <SettingsView />;
        default:
          return (
            <AdminDashboard
              onNavigateTab={handleTabChange}
              onOpenAddUser={() => {
                setAdminAddUserOpen(true);
                setActiveTab('users');
              }}
              onOpenAddCourse={() => {
                setAdminAddCourseOpen(true);
                setActiveTab('courses');
              }}
            />
          );
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Academic Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)}
      />

      <div className="flex-1 flex w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-4 gap-6">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-12">
          {renderContent()}
        </main>
      </div>

      {/* Student Modals */}
      <SubmitAssignmentModal
        assignment={submitModalAssignment}
        isOpen={!!submitModalAssignment}
        onClose={() => setSubmitModalAssignment(null)}
        onSubmitted={() => {
          setSubmitModalAssignment(null);
        }}
      />

      <AssignmentDetailsModal
        assignment={detailsModalAssignment}
        userSubmission={userSubmissionForDetails}
        isOpen={!!detailsModalAssignment}
        onClose={() => setDetailsModalAssignment(null)}
        onOpenSubmit={(asg: Assignment) => {
          setDetailsModalAssignment(null);
          setSubmitModalAssignment(asg);
        }}
      />

      {/* Faculty Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={createAssignmentOpen}
        onClose={() => setCreateAssignmentOpen(false)}
        onCreated={() => {
          setCreateAssignmentOpen(false);
          setActiveTab('assignments');
        }}
      />
    </div>
  );
};
