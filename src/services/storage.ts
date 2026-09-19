import {
  User,
  Department,
  Course,
  Assignment,
  Submission,
  Grade,
  AppNotification,
  AuditLog,
  EmailTemplate,
  UserRole,
  SystemStats,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_COURSES,
  INITIAL_ASSIGNMENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EMAIL_TEMPLATES,
} from '../data/seedData';
import { syncAppointmentToSupabase, syncUserToSupabase } from './supabaseClient';

const KEYS = {
  USERS: 'oass_users_v1',
  DEPARTMENTS: 'oass_departments_v1',
  COURSES: 'oass_courses_v1',
  ASSIGNMENTS: 'oass_assignments_v1',
  SUBMISSIONS: 'oass_submissions_v1',
  NOTIFICATIONS: 'oass_notifications_v1',
  AUDIT_LOGS: 'oass_audit_logs_v1',
  EMAIL_TEMPLATES: 'oass_email_templates_v1',
  CURRENT_USER_ID: 'oass_current_user_id_v1',
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(val);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

// Storage API
export const storage = {
  init() {
    getItem(KEYS.USERS, INITIAL_USERS);
    getItem(KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    setItem(KEYS.COURSES, INITIAL_COURSES);
    setItem(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    setItem(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    getItem(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    getItem(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    getItem(KEYS.EMAIL_TEMPLATES, INITIAL_EMAIL_TEMPLATES);

    // Clean up old dummy student profiles
    let cleanUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS).filter(
      (u) => !['user-stu-2', 'user-stu-3', 'user-stu-4'].includes(u.id)
    );

    // Remove old Sarah Jenkins or Marcus Brody if they exist
    cleanUsers = cleanUsers.filter(u => u.email !== 'sarah.jenkins@campus.edu' && u.email !== 'marcus.brody@campus.edu');

    // Ensure new faculty members are present from INITIAL_USERS
    INITIAL_USERS.forEach(initU => {
      if (initU.role === 'faculty' && initU.id !== 'user-fac-1') {
        const idx = cleanUsers.findIndex(u => u.email === initU.email || u.id === initU.id);
        if (idx >= 0) {
          cleanUsers[idx] = { ...cleanUsers[idx], ...initU };
        } else {
          cleanUsers.push(initU);
        }
      }
    });

    setItem(KEYS.USERS, cleanUsers);

    // Sync faculty user-fac-1 to Prof. Shovan Roy
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const facIdx = users.findIndex((u) => u.id === 'user-fac-1');
    if (facIdx >= 0 && (users[facIdx].name === 'Prof. Robert Chen' || !users[facIdx].designation)) {
      users[facIdx] = {
        ...users[facIdx],
        name: 'Shovan Roy',
        email: 'shovan.roy@midnaporecollege.ac.in',
        alternateEmail: 'sho.cmsa.08@gmail.com',
        designation: 'Assistant Professor & HOD',
        qualification: 'MTech',
        departmentName: 'Computer Science',
        dateOfJoining: '2015-07-15',
        researchInterests: 'Distributed Systems, Cloud Computing, Wireless Sensor Networks & Data Mining',
        phdMphilTitle: 'Pursuing / High Performance Scalable Distributed Computing Architectures',
        avatarUrl: '/src/assets/images/shovan_roy_avatar_1789754117570.jpg',
        phone: '+91 94340 12345',
        address: 'Dept. of Computer Science, Midnapore College (Autonomous), Midnapore, West Bengal - 721101',
        bio: 'Assistant Professor & HOD in the Department of Computer Science at Midnapore College (Autonomous). Areas of academic inquiry and research include Distributed Computing, Cloud Infrastructures, and Data Mining.',
      };
      setItem(KEYS.USERS, users);
    }

    // Sync student user-stu-1 to Sujoy Dutta
    const updatedUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const stuIdx = updatedUsers.findIndex((u) => u.id === 'user-stu-1');
    if (stuIdx >= 0 && (updatedUsers[stuIdx].name !== 'Sujoy Dutta' || !updatedUsers[stuIdx].avatarUrl?.includes('sujoy_dutta_avatar'))) {
      updatedUsers[stuIdx] = {
        ...updatedUsers[stuIdx],
        name: 'Sujoy Dutta',
        email: 'sujoydutta830@gmail.com',
        avatarUrl: '/src/assets/images/sujoy_dutta_avatar_1789757328131.jpg',
        phone: '+91 8967099896',
        departmentName: 'Computer Science',
        studentIdNumber: '2024-1388',
        semester: 5,
        program: 'Computer Science (B.Sc.) - 3rd Year',
        institution: 'Midnapore College Autonomous',
        address: 'Midnapore College Autonomous, Midnapore, West Bengal - 721101',
        bio: 'I am Sujoy Dutta, a motivated student interested in technology, software development, and learning new skills. I enjoy working on academic projects, exploring modern technologies, and improving my technical and problem-solving abilities.',
      };
      setItem(KEYS.USERS, updatedUsers);
    }

    // Sync all users to Supabase on startup
    const finalUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    finalUsers.forEach((u) => {
      syncUserToSupabase({
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
    });
  },

  resetAll() {
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.DEPARTMENTS, JSON.stringify(INITIAL_DEPARTMENTS));
    localStorage.setItem(KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(INITIAL_ASSIGNMENTS));
    localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(KEYS.EMAIL_TEMPLATES, JSON.stringify(INITIAL_EMAIL_TEMPLATES));
  },

  resetToDefaults() {
    this.resetAll();
  },

  // Users
  getUsers(): User[] {
    const list = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    return list.map((u) => ({
      ...u,
      createdAt: u.createdAt || u.joinedDate,
    }));
  },

  getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  },

  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  createUser(userData: Partial<User>, creator?: User): User {
    const users = this.getUsers();
    const id = userData.id || `user-${userData.role}-${Date.now().toString().slice(-4)}`;
    const newUser: User = {
      id,
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'student',
      avatarUrl:
        userData.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      status: userData.status || 'active',
      phone: userData.phone,
      departmentId: userData.departmentId || '',
      departmentName: userData.departmentName,
      studentIdNumber: userData.studentIdNumber,
      employeeIdNumber: userData.employeeIdNumber,
      semester: userData.semester,
      program: userData.program,
      joinedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      password: userData.password,
    };

    users.unshift(newUser);
    setItem(KEYS.USERS, users);

    if (creator) {
      this.addAuditLog({
        userId: creator.id,
        userName: creator.name,
        userRole: creator.role,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: id,
        details: `Provisioned user account for ${newUser.name} (${newUser.email}) as ${newUser.role}`,
        ipAddress: '127.0.0.1',
      });
    }

    syncUserToSupabase({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      departmentName: newUser.departmentName,
      phone: newUser.phone,
      status: newUser.status,
      studentIdNumber: newUser.studentIdNumber,
      employeeIdNumber: newUser.employeeIdNumber,
      program: newUser.program,
      joinedDate: newUser.joinedDate,
    });

    return newUser;
  },

  updateUser(id: string, updates: Partial<User>, updater?: User): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index < 0) throw new Error('User not found');

    const updated = { ...users[index], ...updates };
    users[index] = updated;
    setItem(KEYS.USERS, users);

    if (updater) {
      this.addAuditLog({
        userId: updater.id,
        userName: updater.name,
        userRole: updater.role,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: id,
        details: `Updated user profile/status for ${updated.name}`,
        ipAddress: '127.0.0.1',
      });
    }

    syncUserToSupabase({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      departmentName: updated.departmentName,
      phone: updated.phone,
      status: updated.status,
      studentIdNumber: updated.studentIdNumber,
      employeeIdNumber: updated.employeeIdNumber,
      program: updated.program,
      joinedDate: updated.joinedDate,
    });

    return updated;
  },

  saveUser(user: User): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.unshift(user);
    }
    setItem(KEYS.USERS, users);

    syncUserToSupabase({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentName: user.departmentName,
      phone: user.phone,
      status: user.status,
      studentIdNumber: user.studentIdNumber,
      employeeIdNumber: user.employeeIdNumber,
      program: user.program,
      joinedDate: user.joinedDate,
    });

    return user;
  },

  deleteUser(id: string, deleter?: User): boolean {
    const user = this.getUserById(id);
    const users = this.getUsers().filter((u) => u.id !== id);
    setItem(KEYS.USERS, users);

    if (deleter && user) {
      this.addAuditLog({
        userId: deleter.id,
        userName: deleter.name,
        userRole: deleter.role,
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: id,
        details: `De-provisioned user account ${user.name} (${user.email})`,
        ipAddress: '127.0.0.1',
      });
    }
    return true;
  },

  // Current session user
  getCurrentUserId(): string {
    return localStorage.getItem(KEYS.CURRENT_USER_ID) || 'user-stu-1'; // Default demo student Alex Morgan
  },

  setCurrentUserId(id: string): void {
    localStorage.setItem(KEYS.CURRENT_USER_ID, id);
  },

  // Departments
  getDepartments(): Department[] {
    const list = getItem<Department[]>(KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    return list.map((d) => ({
      ...d,
      headOfDepartment: d.headOfDepartment || d.head,
    }));
  },

  createDepartment(deptData: Partial<Department>, creator?: User): Department {
    const depts = this.getDepartments();
    const id = deptData.id || `dept-${Date.now()}`;
    const newDept: Department = {
      id,
      name: deptData.name || '',
      code: deptData.code || '',
      head: deptData.head || deptData.headOfDepartment || '',
      headOfDepartment: deptData.headOfDepartment || deptData.head || '',
      building: deptData.building,
      contactEmail: deptData.contactEmail,
      description: deptData.description,
      status: 'active',
      coursesCount: 0,
    };
    depts.push(newDept);
    setItem(KEYS.DEPARTMENTS, depts);

    if (creator) {
      this.addAuditLog({
        userId: creator.id,
        userName: creator.name,
        userRole: creator.role,
        action: 'DEPARTMENT_CREATED',
        entityType: 'Department',
        entityId: id,
        details: `Created department ${newDept.name} (${newDept.code})`,
        ipAddress: '127.0.0.1',
      });
    }

    return newDept;
  },

  updateDepartment(id: string, updates: Partial<Department>, updater?: User): Department {
    const depts = this.getDepartments();
    const index = depts.findIndex((d) => d.id === id);
    if (index < 0) throw new Error('Department not found');

    const updated = {
      ...depts[index],
      ...updates,
      head: updates.headOfDepartment || updates.head || depts[index].head,
      headOfDepartment: updates.headOfDepartment || updates.head || depts[index].headOfDepartment,
    };
    depts[index] = updated;
    setItem(KEYS.DEPARTMENTS, depts);

    if (updater) {
      this.addAuditLog({
        userId: updater.id,
        userName: updater.name,
        userRole: updater.role,
        action: 'DEPARTMENT_UPDATED',
        entityType: 'Department',
        entityId: id,
        details: `Updated department info for ${updated.name}`,
        ipAddress: '127.0.0.1',
      });
    }

    return updated;
  },

  saveDepartment(dept: Department): Department {
    const depts = this.getDepartments();
    const index = depts.findIndex((d) => d.id === dept.id);
    if (index >= 0) {
      depts[index] = dept;
    } else {
      depts.push(dept);
    }
    setItem(KEYS.DEPARTMENTS, depts);
    return dept;
  },

  deleteDepartment(id: string, deleter?: User): boolean {
    const depts = this.getDepartments().filter((d) => d.id !== id);
    setItem(KEYS.DEPARTMENTS, depts);
    if (deleter) {
      this.addAuditLog({
        userId: deleter.id,
        userName: deleter.name,
        userRole: deleter.role,
        action: 'DEPARTMENT_DELETED',
        entityType: 'Department',
        entityId: id,
        details: `Deleted department ${id}`,
        ipAddress: '127.0.0.1',
      });
    }
    return true;
  },

  // Courses
  getCourses(): Course[] {
    const list = getItem<Course[]>(KEYS.COURSES, INITIAL_COURSES);
    return list.map((c) => ({
      ...c,
      code: c.code || c.courseCode,
      title: c.title || c.courseName,
      facultyId: c.facultyId || (c.facultyIds && c.facultyIds[0]) || '',
      facultyName: c.facultyName || (c.facultyNames && c.facultyNames[0]) || '',
    }));
  },

  getCourseById(id: string): Course | undefined {
    return this.getCourses().find((c) => c.id === id);
  },

  createCourse(courseData: Partial<Course>, creator?: User): Course {
    const courses = this.getCourses();
    const id = courseData.id || `course-${Date.now()}`;
    const code = courseData.code || courseData.courseCode || '';
    const title = courseData.title || courseData.courseName || '';
    const facultyId = courseData.facultyId || (courseData.facultyIds && courseData.facultyIds[0]) || '';
    const facultyName = courseData.facultyName || '';

    const newCourse: Course = {
      id,
      courseCode: code,
      code,
      courseName: title,
      title,
      departmentId: courseData.departmentId || '',
      departmentCode: courseData.departmentCode || '',
      departmentName: courseData.departmentName || '',
      semester: courseData.semester || 1,
      academicYear: courseData.academicYear || '2026-2027',
      facultyId,
      facultyIds: courseData.facultyIds || (facultyId ? [facultyId] : []),
      facultyName,
      facultyNames: [facultyName],
      enrolledStudentIds: courseData.enrolledStudentIds || [],
      description: courseData.description || '',
      syllabus: courseData.syllabus,
      credits: courseData.credits || 3,
      status: 'active',
    };

    courses.push(newCourse);
    setItem(KEYS.COURSES, courses);

    if (creator) {
      this.addAuditLog({
        userId: creator.id,
        userName: creator.name,
        userRole: creator.role,
        action: 'COURSE_CREATED',
        entityType: 'Course',
        entityId: id,
        details: `Created course catalog entry ${newCourse.code} (${newCourse.title})`,
        ipAddress: '127.0.0.1',
      });
    }

    return newCourse;
  },

  updateCourse(id: string, updates: Partial<Course>, updater?: User): Course {
    const courses = this.getCourses();
    const index = courses.findIndex((c) => c.id === id);
    if (index < 0) throw new Error('Course not found');

    const code = updates.code || updates.courseCode || courses[index].code || courses[index].courseCode;
    const title = updates.title || updates.courseName || courses[index].title || courses[index].courseName;
    const facultyId = updates.facultyId || (updates.facultyIds && updates.facultyIds[0]) || courses[index].facultyId;

    const updated: Course = {
      ...courses[index],
      ...updates,
      code,
      courseCode: code,
      title,
      courseName: title,
      facultyId,
      facultyIds: updates.facultyIds || (facultyId ? [facultyId] : courses[index].facultyIds),
    };

    courses[index] = updated;
    setItem(KEYS.COURSES, courses);

    if (updater) {
      this.addAuditLog({
        userId: updater.id,
        userName: updater.name,
        userRole: updater.role,
        action: 'COURSE_UPDATED',
        entityType: 'Course',
        entityId: id,
        details: `Updated course ${updated.code} - ${updated.title}`,
        ipAddress: '127.0.0.1',
      });
    }

    return updated;
  },

  saveCourse(course: Course): Course {
    const courses = this.getCourses();
    const index = courses.findIndex((c) => c.id === course.id);
    if (index >= 0) {
      courses[index] = course;
    } else {
      courses.unshift(course);
    }
    setItem(KEYS.COURSES, courses);
    return course;
  },

  deleteCourse(id: string, deleter?: User): boolean {
    const course = this.getCourseById(id);
    const courses = this.getCourses().filter((c) => c.id !== id);
    setItem(KEYS.COURSES, courses);

    if (deleter && course) {
      this.addAuditLog({
        userId: deleter.id,
        userName: deleter.name,
        userRole: deleter.role,
        action: 'COURSE_DELETED',
        entityType: 'Course',
        entityId: id,
        details: `Removed course ${course.code} from catalog`,
        ipAddress: '127.0.0.1',
      });
    }
    return true;
  },

  // Assignments
  getAssignments(): Assignment[] {
    return getItem(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  },

  getAssignmentById(id: string): Assignment | undefined {
    return this.getAssignments().find((a) => a.id === id);
  },

  updateAssignment(id: string, updates: Partial<Assignment>, user: User): Assignment {
    const assignments = this.getAssignments();
    const index = assignments.findIndex((a) => a.id === id);
    if (index < 0) throw new Error('Assignment not found');

    const updated = { ...assignments[index], ...updates };
    assignments[index] = updated;
    setItem(KEYS.ASSIGNMENTS, assignments);

    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'ASSIGNMENT_UPDATED',
      entityType: 'Assignment',
      entityId: id,
      details: `Updated assignment "${updated.title}" for ${updated.courseCode}`,
      ipAddress: '127.0.0.1',
    });

    return updated;
  },

  saveAssignment(assignment: Assignment, creator: User): Assignment {
    const assignments = this.getAssignments();
    const index = assignments.findIndex((a) => a.id === assignment.id);
    const isNew = index < 0;

    if (index >= 0) {
      assignments[index] = assignment;
    } else {
      assignments.unshift(assignment);
    }
    setItem(KEYS.ASSIGNMENTS, assignments);

    // Audit log
    this.addAuditLog({
      userId: creator.id,
      userName: creator.name,
      userRole: creator.role,
      action: isNew ? 'ASSIGNMENT_CREATED' : 'ASSIGNMENT_UPDATED',
      entityType: 'Assignment',
      entityId: assignment.id,
      details: `${isNew ? 'Created' : 'Updated'} assignment "${assignment.title}" for ${assignment.courseCode}`,
      ipAddress: '127.0.0.1',
    });

    // If published, notify enrolled students
    if (isNew && assignment.status === 'published') {
      const course = this.getCourseById(assignment.courseId);
      if (course && course.enrolledStudentIds.length > 0) {
        course.enrolledStudentIds.forEach((stuId) => {
          this.addNotification({
            userId: stuId,
            title: `New Assignment: ${assignment.title}`,
            message: `${assignment.facultyName} posted a new assignment for ${assignment.courseCode}. Due on ${new Date(assignment.dueAt).toLocaleDateString()}.`,
            type: 'assignment',
            actionTab: 'assignments',
          });
        });
      }
    }

    return assignment;
  },

  deleteAssignment(id: string, user: User): boolean {
    const assignment = this.getAssignmentById(id);
    const assignments = this.getAssignments().filter((a) => a.id !== id);
    setItem(KEYS.ASSIGNMENTS, assignments);

    if (assignment) {
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'ASSIGNMENT_ARCHIVED',
        entityType: 'Assignment',
        entityId: id,
        details: `Archived/Removed assignment "${assignment.title}"`,
        ipAddress: '127.0.0.1',
      });
    }
    return true;
  },

  // Submissions
  getSubmissions(): Submission[] {
    return getItem(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
  },

  getSubmissionById(id: string): Submission | undefined {
    return this.getSubmissions().find((s) => s.id === id);
  },

  saveSubmission(submissionData: Omit<Submission, 'id' | 'receiptId' | 'submittedAt' | 'isLate' | 'lateDays' | 'latePenaltyPercent' | 'status' | 'version'>, student: User): Submission {
    const assignment = this.getAssignmentById(submissionData.assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const now = new Date();
    const dueDate = new Date(assignment.dueAt);
    const isLate = now > dueDate;
    let lateDays = 0;
    let latePenaltyPercent = 0;

    if (isLate) {
      if (!assignment.allowLateSubmission) {
        throw new Error('Late submissions are strictly not permitted for this assignment.');
      }
      const diffTime = Math.abs(now.getTime() - dueDate.getTime());
      lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      latePenaltyPercent = Math.min(100, lateDays * (assignment.latePenaltyPercentPerDay || 0));
    }

    const allSubmissions = this.getSubmissions();
    const existing = allSubmissions.filter(
      (s) => s.assignmentId === assignment.id && s.studentId === student.id
    );

    if (existing.length > 0 && !assignment.allowResubmission) {
      throw new Error('Resubmissions are disabled for this assignment.');
    }

    if (existing.length >= (assignment.maxResubmissions || 1)) {
      throw new Error(`Maximum resubmission limit (${assignment.maxResubmissions}) reached.`);
    }

    const newVersion = existing.length + 1;
    const submissionId = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const receiptId = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newSubmission: Submission = {
      ...submissionData,
      id: submissionId,
      receiptId,
      submittedAt: now.toISOString(),
      isLate,
      lateDays,
      latePenaltyPercent,
      version: newVersion,
      status: isLate ? 'late' : 'submitted',
    };

    allSubmissions.unshift(newSubmission);
    setItem(KEYS.SUBMISSIONS, allSubmissions);

    // Audit log
    this.addAuditLog({
      userId: student.id,
      userName: student.name,
      userRole: student.role,
      action: isLate ? 'SUBMISSION_LATE' : 'SUBMISSION_ON_TIME',
      entityType: 'Submission',
      entityId: submissionId,
      details: `Submitted "${submissionData.fileName}" for "${assignment.title}" (${isLate ? `${lateDays} day(s) late` : 'on time'}). Receipt #${receiptId}`,
      ipAddress: '127.0.0.1',
    });

    // Notify assignment faculty
    this.addNotification({
      userId: assignment.facultyId,
      title: isLate ? `Late Submission: ${assignment.title}` : `New Submission: ${assignment.title}`,
      message: `${student.name} submitted ${submissionData.fileName} for ${assignment.courseCode}. Status: ${isLate ? 'Late' : 'On Time'}.`,
      type: 'submission',
      actionTab: 'submissions',
    });

    // Notify student of receipt
    this.addNotification({
      userId: student.id,
      title: `Submission Confirmed #${receiptId}`,
      message: `Your file "${submissionData.fileName}" was received successfully for "${assignment.title}".`,
      type: 'submission',
      actionTab: 'my-submissions',
    });

    // Sync appointment/submission to Supabase
    syncAppointmentToSupabase({
      id: newSubmission.id,
      studentId: student.id,
      studentName: student.name,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      courseCode: assignment.courseCode,
      submittedAt: newSubmission.submittedAt,
      status: newSubmission.status,
      notes: newSubmission.comments || '',
      fileUrl: newSubmission.fileName || '',
    });

    return newSubmission;
  },

  // Grading
  gradeSubmission(
    submissionId: string,
    marksOrData: number | { marksObtained: number; feedback?: string; privateNotes?: string; internalNotes?: string; maxMarks?: number },
    feedbackOrFaculty?: string | User,
    facultyOrNotes?: User | string,
    notesOptional?: string
  ): Submission {
    const submissions = this.getSubmissions();
    const index = submissions.findIndex((s) => s.id === submissionId);
    if (index < 0) throw new Error('Submission not found');

    const sub = submissions[index];
    const assignment = this.getAssignmentById(sub.assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    let marksObtained = 0;
    let feedback = '';
    let faculty: User;
    let internalNotes: string | undefined;

    if (typeof marksOrData === 'object') {
      marksObtained = marksOrData.marksObtained;
      feedback = marksOrData.feedback || '';
      internalNotes = marksOrData.privateNotes || marksOrData.internalNotes;
      faculty = feedbackOrFaculty as User;
    } else {
      marksObtained = marksOrData;
      feedback = (feedbackOrFaculty as string) || '';
      faculty = facultyOrNotes as User;
      internalNotes = notesOptional;
    }

    if (!faculty) {
      faculty = this.getUsers().find((u) => u.role === 'faculty') || {
        id: 'user-fac-1',
        name: 'Dr. Robert Chen',
        email: 'chen@college.edu',
        role: 'faculty',
        avatarUrl: '',
        status: 'active',
        departmentId: 'dept-cs',
        joinedDate: new Date().toISOString(),
      };
    }

    const maxMarks = assignment.maxMarks;
    if (marksObtained < 0 || marksObtained > maxMarks) {
      throw new Error(`Marks obtained must be between 0 and ${maxMarks}`);
    }

    const percentage = Number(((marksObtained / maxMarks) * 100).toFixed(1));
    const now = new Date().toISOString();

    const oldGrade = sub.grade;
    const grade: Grade = {
      id: oldGrade?.id || `grade-${Date.now()}`,
      submissionId: sub.id,
      assignmentId: sub.assignmentId,
      studentId: sub.studentId,
      facultyId: faculty.id,
      facultyName: faculty.name,
      gradedByName: faculty.name,
      marksObtained,
      maxMarks,
      percentage,
      feedback,
      internalNotes,
      privateNotes: internalNotes,
      gradedAt: now,
      auditTrail: [
        ...(oldGrade?.auditTrail || []),
        {
          action: oldGrade ? 'Grade Modified' : 'Grade Published',
          by: faculty.name,
          at: now,
          oldMarks: oldGrade?.marksObtained,
          newMarks: marksObtained,
        },
      ],
    };

    sub.grade = grade;
    sub.status = 'graded';
    submissions[index] = sub;
    setItem(KEYS.SUBMISSIONS, submissions);

    // Audit Log
    this.addAuditLog({
      userId: faculty.id,
      userName: faculty.name,
      userRole: faculty.role,
      action: oldGrade ? 'GRADE_MODIFIED' : 'GRADE_RECORDED',
      entityType: 'Grade',
      entityId: grade.id,
      details: `${oldGrade ? 'Updated' : 'Recorded'} grade for ${sub.studentName} on "${assignment.title}": ${marksObtained}/${maxMarks} (${percentage}%)`,
      ipAddress: '127.0.0.1',
    });

    // Notify Student
    this.addNotification({
      userId: sub.studentId,
      title: `Grade Published: ${assignment.title}`,
      message: `${faculty.name} posted your grade: ${marksObtained}/${maxMarks} (${percentage}%). Feedback: "${feedback.slice(0, 80)}..."`,
      type: 'grade',
      actionTab: 'grades',
    });

    return sub;
  },

  // Notifications
  getNotifications(userId: string): AppNotification[] {
    const all = getItem<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    return all.filter((n) => n.userId === userId || n.roleScope === 'all');
  },

  addNotification(notifData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): AppNotification {
    const all = getItem<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newNotif);
    setItem(KEYS.NOTIFICATIONS, all);
    return newNotif;
  },

  markNotificationAsRead(id: string): void {
    const all = getItem<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const target = all.find((n) => n.id === id);
    if (target) {
      target.isRead = true;
      setItem(KEYS.NOTIFICATIONS, all);
    }
  },

  markAllNotificationsAsRead(userId: string): void {
    const all = getItem<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    all.forEach((n) => {
      if (n.userId === userId || n.roleScope === 'all') {
        n.isRead = true;
      }
    });
    setItem(KEYS.NOTIFICATIONS, all);
  },

  clearNotifications(userId: string): void {
    const all = getItem<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const filtered = all.filter((n) => n.userId !== userId && n.roleScope !== 'all');
    setItem(KEYS.NOTIFICATIONS, filtered);
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getItem(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  addAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep max 500 logs
    setItem(KEYS.AUDIT_LOGS, logs.slice(0, 500));
    return newLog;
  },

  // Email Templates
  getEmailTemplates(): EmailTemplate[] {
    return getItem(KEYS.EMAIL_TEMPLATES, INITIAL_EMAIL_TEMPLATES);
  },

  saveEmailTemplate(template: EmailTemplate): EmailTemplate {
    const list = this.getEmailTemplates();
    const idx = list.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      list[idx] = { ...template, lastUpdated: new Date().toISOString() };
    } else {
      list.push({ ...template, lastUpdated: new Date().toISOString() });
    }
    setItem(KEYS.EMAIL_TEMPLATES, list);
    return template;
  },

  // System Stats
  getSystemStats(): SystemStats {
    const users = this.getUsers();
    const courses = this.getCourses();
    const departments = this.getDepartments();
    const assignments = this.getAssignments();
    const submissions = this.getSubmissions();

    const students = users.filter((u) => u.role === 'student');
    const faculty = users.filter((u) => u.role === 'faculty');
    const pendingReviews = submissions.filter((s) => s.status === 'submitted' || s.status === 'late').length;
    const gradedSubmissions = submissions.filter((s) => s.status === 'graded').length;

    return {
      totalUsers: users.length,
      totalStudents: students.length,
      totalFaculty: faculty.length,
      totalCourses: courses.length,
      totalDepartments: departments.length,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      pendingReviews,
      gradedSubmissions,
      storageUsed: '42.8 MB',
    };
  },
};
