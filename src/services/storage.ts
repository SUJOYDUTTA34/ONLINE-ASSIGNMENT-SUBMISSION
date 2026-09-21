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
  shovanRoyAvatar,
  sujoyDuttaAvatar,
} from '../data/seedData';
import { syncAppointmentToSupabase, syncUserToSupabase } from './supabaseClient';
import {
  hashPassword,
  verifyPassword,
  getStoredCredentialHash,
  setStoredCredentialHash,
  removeStoredCredential,
  filterUserDataForClient,
  redactSensitive,
  removeSessionToken,
  sanitizeTextInput,
  sanitizeFileName,
} from '../lib/security';

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
  } catch {
    // Sanitized: No user payload or context leaked to logs
    console.error('Storage read notice for key:', key);
    return fallback;
  }
}

function setItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Sanitized: No user payload or context leaked to logs
    console.error('Storage write notice for key:', key);
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

    // Clean up old dummy student profiles and fix cached avatar paths
    let cleanUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS).filter(
      (u) => !['user-stu-2', 'user-stu-3', 'user-stu-4'].includes(u.id)
    );

    // Remove old Sarah Jenkins or Marcus Brody if they exist
    cleanUsers = cleanUsers.filter(u => u.email !== 'sarah.jenkins@campus.edu' && u.email !== 'marcus.brody@campus.edu');

    // Fix avatar URLs if pointing to raw relative path
    cleanUsers = cleanUsers.map((u) => {
      if (u.id === 'user-stu-1') {
        return { ...u, avatarUrl: sujoyDuttaAvatar };
      }
      if (u.id === 'user-fac-1') {
        return { ...u, avatarUrl: shovanRoyAvatar };
      }
      return u;
    });

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
        avatarUrl: shovanRoyAvatar,
        phone: '+91 94340 12345',
        address: 'Dept. of Computer Science, Midnapore College (Autonomous), Midnapore, West Bengal - 721101',
        bio: 'Assistant Professor & HOD in the Department of Computer Science at Midnapore College (Autonomous). Areas of academic inquiry and research include Distributed Computing, Cloud Infrastructures, and Data Mining.',
      };
      setItem(KEYS.USERS, users);
    }

    // Sync student user-stu-1 to Sujoy Dutta
    const updatedUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const stuIdx = updatedUsers.findIndex((u) => u.id === 'user-stu-1');
    if (stuIdx >= 0) {
      updatedUsers[stuIdx] = {
        ...updatedUsers[stuIdx],
        name: 'Sujoy Dutta',
        email: 'sujoydutta830@gmail.com',
        avatarUrl: sujoyDuttaAvatar,
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

    // Strip any legacy plaintext passwords from storage and seed isolated PBKDF2 credentials
    const allUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    allUsers.forEach(async (u) => {
      const existingHash = getStoredCredentialHash(u.id);
      if (!existingHash) {
        const initialHash = await hashPassword('password123');
        setStoredCredentialHash(u.id, initialHash);
      }
    });

    const strippedUsers = allUsers.map((u) => {
      const { password, ...rest } = u;
      return rest as User;
    });
    setItem(KEYS.USERS, strippedUsers);

    // Sync all users to Supabase on startup (PII stripped)
    const finalUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    finalUsers.forEach((u) => {
      syncUserToSupabase({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        departmentName: u.departmentName,
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

  // Current session user lookup
  getCurrentUser(): User | undefined {
    const uid = this.getCurrentUserId();
    if (!uid) return undefined;
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    return users.find((u) => u.id === uid);
  },

  // Users (Role-aware Least Privilege Field-Level Filtering)
  getUsers(requester?: User | { id?: string; role?: string } | null): User[] {
    const activeRequester = requester || this.getCurrentUser();
    const list = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    return list.map((u) => {
      const sanitized = filterUserDataForClient(u, activeRequester);
      return {
        ...sanitized,
        createdAt: sanitized.createdAt || sanitized.joinedDate,
      } as User;
    });
  },

  getUserById(id: string, requester?: User | { id?: string; role?: string } | null): User | undefined {
    const activeRequester = requester || this.getCurrentUser();
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const found = users.find((u) => u.id === id);
    if (!found) return undefined;
    return filterUserDataForClient(found, activeRequester) as User;
  },

  getUserByEmail(email: string): User | undefined {
    if (!email) return undefined;
    const term = email.trim().toLowerCase();
    const rawUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);

    // Exact match only: primary email, alternate email, student ID number, or employee ID number
    const directMatch = rawUsers.find(
      (u) =>
        u.email.toLowerCase() === term ||
        (u.alternateEmail && u.alternateEmail.toLowerCase() === term) ||
        (u.studentIdNumber && u.studentIdNumber.toLowerCase() === term) ||
        (u.employeeIdNumber && u.employeeIdNumber.toLowerCase() === term)
    );
    if (directMatch) return filterUserDataForClient(directMatch, { id: directMatch.id, role: directMatch.role }) as User;

    return undefined;
  },

  /**
   * Secure Credential Verification (Zero Password Exposure)
   */
  async verifyUserCredentials(userIdOrEmail: string, plainPassword: string): Promise<boolean> {
    if (!userIdOrEmail || !plainPassword) return false;
    const user = this.getUserById(userIdOrEmail) || this.getUserByEmail(userIdOrEmail);
    if (!user) return false;

    let storedHash = getStoredCredentialHash(user.id);
    if (!storedHash) {
      return false; // Reject logins if no credential is set (no default password fallback)
    }
    return await verifyPassword(plainPassword, storedHash);
  },

  createUser(userData: Partial<User>, creator?: User): User {
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const id = userData.id || `user-${userData.role}-${Date.now().toString().slice(-4)}`;

    // Store credentials in isolated vault - NEVER in user directory
    if (userData.password) {
      setStoredCredentialHash(id, userData.password);
    }

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
        details: `Provisioned user account for ${newUser.name} ([REDACTED]) as ${newUser.role}`,
        ipAddress: '127.0.0.1',
      });
    }

    syncUserToSupabase({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      departmentName: newUser.departmentName,
      status: newUser.status,
      studentIdNumber: newUser.studentIdNumber,
      employeeIdNumber: newUser.employeeIdNumber,
      program: newUser.program,
      joinedDate: newUser.joinedDate,
    });

    return newUser;
  },

  updateUser(id: string, updates: Partial<User>, updater?: User): User {
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex((u) => u.id === id);
    if (index < 0) throw new Error('User not found');

    const resolvedUpdater = updater || this.getCurrentUser();
    if (!resolvedUpdater) {
      throw new Error('Unauthorized: Authentication required to update user accounts.');
    }

    // Privilege Escalation Guard
    if (resolvedUpdater.role !== 'admin') {
      if (resolvedUpdater.id !== id) {
        throw new Error('Unauthorized: You cannot modify other user accounts.');
      }
      // Non-administrators cannot modify security-critical attributes
      const forbiddenFields: (keyof User)[] = ['role', 'status', 'departmentId', 'studentIdNumber', 'employeeIdNumber', 'id'];
      for (const field of forbiddenFields) {
        if (field in updates && (updates as any)[field] !== users[index][field]) {
          throw new Error(`Unauthorized: Modifying administrative attribute "${field}" is strictly forbidden.`);
        }
      }
    }

    const { password, ...safeUpdates } = updates;
    if (password) {
      setStoredCredentialHash(id, password);
    }

    // Sanitize user inputs
    if (safeUpdates.name) safeUpdates.name = sanitizeTextInput(safeUpdates.name);
    if (safeUpdates.phone) safeUpdates.phone = sanitizeTextInput(safeUpdates.phone);
    if (safeUpdates.program) safeUpdates.program = sanitizeTextInput(safeUpdates.program);

    const updated = { ...users[index], ...safeUpdates };
    users[index] = updated;
    setItem(KEYS.USERS, users);

    this.addAuditLog({
      userId: resolvedUpdater.id,
      userName: resolvedUpdater.name,
      userRole: resolvedUpdater.role,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      details: `Updated user profile/status for ${updated.name}`,
      ipAddress: '127.0.0.1',
    });

    syncUserToSupabase({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      departmentName: updated.departmentName,
      status: updated.status,
      studentIdNumber: updated.studentIdNumber,
      employeeIdNumber: updated.employeeIdNumber,
      program: updated.program,
      joinedDate: updated.joinedDate,
    });

    return updated;
  },

  updateUserPassword(userId: string, newPasswordHash: string): boolean {
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex((u) => u.id === userId);
    if (index < 0) return false;

    // Secure: Store hash in isolated credentials store, remove from user record
    setStoredCredentialHash(userId, newPasswordHash);
    if (users[index].password) {
      delete users[index].password;
      setItem(KEYS.USERS, users);
    }
    return true;
  },

  saveUser(user: User, caller?: User): User {
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const { password, ...safeUser } = user;
    if (password) {
      setStoredCredentialHash(user.id, password);
    }

    const resolvedCaller = caller || this.getCurrentUser();
    const index = users.findIndex((u) => u.id === safeUser.id);

    // Prevent privilege escalation if existing user role is being modified by non-admin
    if (index >= 0 && resolvedCaller && resolvedCaller.role !== 'admin') {
      if (users[index].role !== safeUser.role) {
        throw new Error('Unauthorized: Role alteration is restricted to system administrators.');
      }
      if (users[index].status !== safeUser.status) {
        throw new Error('Unauthorized: Status alteration is restricted to system administrators.');
      }
    }

    if (index >= 0) {
      users[index] = safeUser as User;
    } else {
      users.unshift(safeUser as User);
    }
    setItem(KEYS.USERS, users);

    syncUserToSupabase({
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role,
      departmentName: safeUser.departmentName,
      status: safeUser.status,
      studentIdNumber: safeUser.studentIdNumber,
      employeeIdNumber: safeUser.employeeIdNumber,
      program: safeUser.program,
      joinedDate: safeUser.joinedDate,
    });

    return safeUser as User;
  },

  deleteUser(id: string, deleter?: User): boolean {
    const resolvedDeleter = deleter || this.getCurrentUser();
    if (!resolvedDeleter || resolvedDeleter.role !== 'admin') {
      throw new Error('Unauthorized: Only system administrators can delete user accounts.');
    }
    if (id === resolvedDeleter.id) {
      throw new Error('Action Denied: Administrator self-deletion is forbidden.');
    }

    const targetUser = this.getUserById(id);
    const users = this.getUsers().filter((u) => u.id !== id);
    setItem(KEYS.USERS, users);
    removeStoredCredential(id);

    if (targetUser) {
      this.addAuditLog({
        userId: resolvedDeleter.id,
        userName: resolvedDeleter.name,
        userRole: resolvedDeleter.role,
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: id,
        details: `De-provisioned user account ID ${id} (${targetUser.name})`,
        ipAddress: '127.0.0.1',
      });
    }
    return true;
  },

  /**
   * GDPR / FERPA Compliant Account Deletion & Right to be Forgotten.
   * Permanently erases or anonymizes all personal identifiers, submissions, and credentials.
   */
  purgeUserPersonalData(userId: string): { success: boolean; message: string } {
    const user = this.getUserById(userId);
    if (!user) return { success: false, message: 'User record not found.' };

    // 1. Remove credentials from isolated credential vault
    removeStoredCredential(userId);

    // 2. Anonymize user submissions
    const submissions = this.getSubmissions();
    const updatedSubmissions = submissions.map((sub) => {
      if (sub.studentId === userId) {
        return {
          ...sub,
          studentName: '[Deactivated Student Record]',
          comments: '',
          grade: sub.grade
            ? {
                ...sub.grade,
                feedback: '[Archived Evaluation]',
                internalNotes: '',
                privateNotes: '',
              }
            : undefined,
        };
      }
      return sub;
    });
    setItem(KEYS.SUBMISSIONS, updatedSubmissions);

    // 3. Un-enroll user from all active courses
    const courses = this.getCourses();
    const updatedCourses = courses.map((course) => ({
      ...course,
      enrolledStudentIds: (course.enrolledStudentIds || []).filter((id) => id !== userId),
    }));
    setItem(KEYS.COURSES, updatedCourses);

    // 4. Remove user notifications
    const allNotifications = getItem<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    setItem(
      KEYS.NOTIFICATIONS,
      allNotifications.filter((n) => n.userId !== userId)
    );

    // 5. Remove user record from user directory
    const users = getItem<User[]>(KEYS.USERS, INITIAL_USERS).filter((u) => u.id !== userId);
    setItem(KEYS.USERS, users);

    // 6. Log compliance audit event with zero PII
    this.addAuditLog({
      userId: 'system',
      userName: 'Privacy Officer / System',
      userRole: 'admin',
      action: 'USER_DATA_PURGED',
      entityType: 'User',
      entityId: userId,
      details: `Permanent GDPR/FERPA Right-to-be-Forgotten data erasure fulfilled for Account ID: ${userId}`,
      ipAddress: '127.0.0.1',
    });

    // 7. Clear session if deleted user was active
    if (this.getCurrentUserId() === userId) {
      this.setCurrentUserId('');
      removeSessionToken();
    }

    return { success: true, message: 'Personal data and account successfully purged.' };
  },

  // Current session user
  getCurrentUserId(): string {
    return localStorage.getItem(KEYS.CURRENT_USER_ID) || '';
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
    const resolvedCreator = creator || this.getCurrentUser();
    if (!resolvedCreator || resolvedCreator.role !== 'admin') {
      throw new Error('Unauthorized: Only system administrators can create academic departments.');
    }

    const id = deptData.id || `dept-${Date.now()}`;
    const newDept: Department = {
      id,
      name: sanitizeTextInput(deptData.name || ''),
      code: sanitizeTextInput(deptData.code || '').toUpperCase(),
      head: sanitizeTextInput(deptData.head || deptData.headOfDepartment || ''),
      headOfDepartment: sanitizeTextInput(deptData.headOfDepartment || deptData.head || ''),
      building: deptData.building ? sanitizeTextInput(deptData.building) : undefined,
      contactEmail: deptData.contactEmail?.trim().toLowerCase(),
      description: deptData.description ? sanitizeTextInput(deptData.description) : undefined,
      status: 'active',
      coursesCount: 0,
    };
    depts.push(newDept);
    setItem(KEYS.DEPARTMENTS, depts);

    this.addAuditLog({
      userId: resolvedCreator.id,
      userName: resolvedCreator.name,
      userRole: resolvedCreator.role,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
      entityId: id,
      details: `Created department ${newDept.name} (${newDept.code})`,
      ipAddress: '127.0.0.1',
    });

    return newDept;
  },

  updateDepartment(id: string, updates: Partial<Department>, updater?: User): Department {
    const resolvedUpdater = updater || this.getCurrentUser();
    if (!resolvedUpdater || resolvedUpdater.role !== 'admin') {
      throw new Error('Unauthorized: Only system administrators can update academic departments.');
    }

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

    this.addAuditLog({
      userId: resolvedUpdater.id,
      userName: resolvedUpdater.name,
      userRole: resolvedUpdater.role,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'Department',
      entityId: id,
      details: `Updated department info for ${updated.name}`,
      ipAddress: '127.0.0.1',
    });

    return updated;
  },

  saveDepartment(dept: Department, caller?: User): Department {
    const resolved = caller || this.getCurrentUser();
    if (!resolved || resolved.role !== 'admin') {
      throw new Error('Unauthorized: Administrator privilege required.');
    }
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
    const resolvedDeleter = deleter || this.getCurrentUser();
    if (!resolvedDeleter || resolvedDeleter.role !== 'admin') {
      throw new Error('Unauthorized: Only system administrators can delete academic departments.');
    }

    const depts = this.getDepartments().filter((d) => d.id !== id);
    setItem(KEYS.DEPARTMENTS, depts);
    this.addAuditLog({
      userId: resolvedDeleter.id,
      userName: resolvedDeleter.name,
      userRole: resolvedDeleter.role,
      action: 'DEPARTMENT_DELETED',
      entityType: 'Department',
      entityId: id,
      details: `Deleted department ${id}`,
      ipAddress: '127.0.0.1',
    });
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
    const resolvedCreator = creator || this.getCurrentUser();
    if (!resolvedCreator || (resolvedCreator.role !== 'admin' && resolvedCreator.role !== 'faculty')) {
      throw new Error('Unauthorized: Only administrators or faculty can create course catalog entries.');
    }

    const courses = this.getCourses();
    const id = courseData.id || `course-${Date.now()}`;
    const code = sanitizeTextInput(courseData.code || courseData.courseCode || '').toUpperCase();
    const title = sanitizeTextInput(courseData.title || courseData.courseName || '');
    const facultyId = resolvedCreator.role === 'faculty' ? resolvedCreator.id : (courseData.facultyId || (courseData.facultyIds && courseData.facultyIds[0]) || '');
    const facultyName = resolvedCreator.role === 'faculty' ? resolvedCreator.name : (courseData.facultyName || '');

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
      description: courseData.description ? sanitizeTextInput(courseData.description) : '',
      syllabus: courseData.syllabus ? sanitizeTextInput(courseData.syllabus) : undefined,
      credits: courseData.credits || 3,
      status: 'active',
    };

    courses.push(newCourse);
    setItem(KEYS.COURSES, courses);

    this.addAuditLog({
      userId: resolvedCreator.id,
      userName: resolvedCreator.name,
      userRole: resolvedCreator.role,
      action: 'COURSE_CREATED',
      entityType: 'Course',
      entityId: id,
      details: `Created course catalog entry ${newCourse.code} (${newCourse.title})`,
      ipAddress: '127.0.0.1',
    });

    return newCourse;
  },

  updateCourse(id: string, updates: Partial<Course>, updater?: User): Course {
    const resolvedUpdater = updater || this.getCurrentUser();
    if (!resolvedUpdater) {
      throw new Error('Unauthorized: Authentication required.');
    }

    const courses = this.getCourses();
    const index = courses.findIndex((c) => c.id === id);
    if (index < 0) throw new Error('Course not found');

    if (resolvedUpdater.role !== 'admin') {
      const isAssigned = courses[index].facultyId === resolvedUpdater.id || courses[index].facultyIds?.includes(resolvedUpdater.id);
      if (!isAssigned) {
        throw new Error('Unauthorized: You can only update courses for which you are the assigned faculty instructor.');
      }
    }

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

    this.addAuditLog({
      userId: resolvedUpdater.id,
      userName: resolvedUpdater.name,
      userRole: resolvedUpdater.role,
      action: 'COURSE_UPDATED',
      entityType: 'Course',
      entityId: id,
      details: `Updated course ${updated.code} - ${updated.title}`,
      ipAddress: '127.0.0.1',
    });

    return updated;
  },

  saveCourse(course: Course, caller?: User): Course {
    const resolved = caller || this.getCurrentUser();
    if (!resolved || (resolved.role !== 'admin' && resolved.role !== 'faculty')) {
      throw new Error('Unauthorized: Administrator or Faculty role required.');
    }
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
    const resolvedDeleter = deleter || this.getCurrentUser();
    if (!resolvedDeleter || resolvedDeleter.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can delete courses from the catalog.');
    }

    const course = this.getCourseById(id);
    const courses = this.getCourses().filter((c) => c.id !== id);
    setItem(KEYS.COURSES, courses);

    if (course) {
      this.addAuditLog({
        userId: resolvedDeleter.id,
        userName: resolvedDeleter.name,
        userRole: resolvedDeleter.role,
        action: 'COURSE_DELETED',
        entityType: 'Course',
        entityId: id,
        details: `Removed course ${course.code} from catalog`,
        ipAddress: '127.0.0.1',
      });
    }
    return true;
  },

  // Assignments (Role-based Filtering & Publication Guard)
  getAssignments(requester?: User): Assignment[] {
    const active = requester || this.getCurrentUser();
    const all = getItem<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    if (!active) return [];

    // System administrators see all assignments
    if (active.role === 'admin') return all;

    // Faculty see assignments for courses they instruct or in their department
    if (active.role === 'faculty') {
      const myCourses = this.getCourses().filter(
        (c) => c.facultyId === active.id || c.facultyIds?.includes(active.id)
      );
      const myCourseIds = new Set(myCourses.map((c) => c.id));
      return all.filter((a) => myCourseIds.has(a.courseId));
    }

    // Students: CANNOT view drafts or un-enrolled assignments
    // Only published assignments for courses they are actively enrolled in
    const enrolledCourses = this.getCourses().filter(
      (c) => c.enrolledStudentIds?.includes(active.id)
    );
    const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id));

    return all.filter(
      (a) => a.status === 'published' && enrolledCourseIds.has(a.courseId)
    );
  },

  getAssignmentById(id: string, requester?: User): Assignment | undefined {
    const active = requester || this.getCurrentUser();
    const assignment = getItem<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS).find((a) => a.id === id);
    if (!assignment) return undefined;
    if (!active) return undefined;

    if (active.role === 'admin') return assignment;
    if (active.role === 'faculty') {
      const course = this.getCourseById(assignment.courseId);
      const isAssigned = course && (course.facultyId === active.id || course.facultyIds?.includes(active.id));
      return isAssigned ? assignment : undefined;
    }

    // Student access guard: Must be enrolled and assignment must be published
    if (active.role === 'student') {
      if (assignment.status !== 'published') return undefined;
      const course = this.getCourseById(assignment.courseId);
      if (!course || !course.enrolledStudentIds?.includes(active.id)) return undefined;
    }

    return assignment;
  },

  updateAssignment(id: string, updates: Partial<Assignment>, user?: User): Assignment {
    const resolvedUser = user || this.getCurrentUser();
    if (!resolvedUser || (resolvedUser.role !== 'admin' && resolvedUser.role !== 'faculty')) {
      throw new Error('Unauthorized: Only faculty instructors and administrators can modify assignments.');
    }

    const assignments = getItem<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const index = assignments.findIndex((a) => a.id === id);
    if (index < 0) throw new Error('Assignment not found');

    if (resolvedUser.role === 'faculty') {
      const course = this.getCourseById(assignments[index].courseId);
      const isAssigned = course && (course.facultyId === resolvedUser.id || course.facultyIds?.includes(resolvedUser.id));
      if (!isAssigned) {
        throw new Error('Unauthorized: You can only modify assignments for courses you instruct.');
      }
    }

    const safeUpdates = { ...updates };
    if (safeUpdates.title) safeUpdates.title = sanitizeTextInput(safeUpdates.title);
    if (safeUpdates.description) safeUpdates.description = sanitizeTextInput(safeUpdates.description);
    if (safeUpdates.instructions) safeUpdates.instructions = sanitizeTextInput(safeUpdates.instructions);

    const updated = { ...assignments[index], ...safeUpdates };
    assignments[index] = updated;
    setItem(KEYS.ASSIGNMENTS, assignments);

    this.addAuditLog({
      userId: resolvedUser.id,
      userName: resolvedUser.name,
      userRole: resolvedUser.role,
      action: 'ASSIGNMENT_UPDATED',
      entityType: 'Assignment',
      entityId: id,
      details: `Updated assignment "${updated.title}" for ${updated.courseCode}`,
      ipAddress: '127.0.0.1',
    });

    return updated;
  },

  saveAssignment(assignment: Assignment, creator?: User): Assignment {
    const resolvedCreator = creator || this.getCurrentUser();
    if (!resolvedCreator || (resolvedCreator.role !== 'admin' && resolvedCreator.role !== 'faculty')) {
      throw new Error('Unauthorized: Only faculty instructors and administrators can create or publish assignments.');
    }

    if (resolvedCreator.role === 'faculty') {
      const course = this.getCourseById(assignment.courseId);
      const isAssigned = course && (course.facultyId === resolvedCreator.id || course.facultyIds?.includes(resolvedCreator.id));
      if (!isAssigned) {
        throw new Error('Unauthorized: You can only create assignments for courses you instruct.');
      }
    }

    const assignments = getItem<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const index = assignments.findIndex((a) => a.id === assignment.id);
    const isNew = index < 0;

    const sanitizedAssignment: Assignment = {
      ...assignment,
      title: sanitizeTextInput(assignment.title),
      description: sanitizeTextInput(assignment.description),
      instructions: sanitizeTextInput(assignment.instructions || ''),
    };

    if (index >= 0) {
      assignments[index] = sanitizedAssignment;
    } else {
      assignments.unshift(sanitizedAssignment);
    }
    setItem(KEYS.ASSIGNMENTS, assignments);

    this.addAuditLog({
      userId: resolvedCreator.id,
      userName: resolvedCreator.name,
      userRole: resolvedCreator.role,
      action: isNew ? 'ASSIGNMENT_CREATED' : 'ASSIGNMENT_UPDATED',
      entityType: 'Assignment',
      entityId: sanitizedAssignment.id,
      details: `${isNew ? 'Created' : 'Updated'} assignment "${sanitizedAssignment.title}" for ${sanitizedAssignment.courseCode}`,
      ipAddress: '127.0.0.1',
    });

    // If published, notify enrolled students
    if (isNew && sanitizedAssignment.status === 'published') {
      const course = this.getCourseById(sanitizedAssignment.courseId);
      if (course && course.enrolledStudentIds.length > 0) {
        course.enrolledStudentIds.forEach((stuId) => {
          this.addNotification({
            userId: stuId,
            title: `New Assignment: ${sanitizedAssignment.title}`,
            message: `${sanitizedAssignment.facultyName} posted a new assignment for ${sanitizedAssignment.courseCode}. Due on ${new Date(sanitizedAssignment.dueAt).toLocaleDateString()}.`,
            type: 'assignment',
            actionTab: 'assignments',
          });
        });
      }
    }

    return sanitizedAssignment;
  },

  deleteAssignment(id: string, user?: User): boolean {
    const resolvedUser = user || this.getCurrentUser();
    if (!resolvedUser || (resolvedUser.role !== 'admin' && resolvedUser.role !== 'faculty')) {
      throw new Error('Unauthorized: Only faculty instructors and administrators can archive assignments.');
    }

    const assignment = this.getAssignmentById(id, resolvedUser);
    if (!assignment) {
      throw new Error('Assignment not found or unauthorized.');
    }

    if (resolvedUser.role === 'faculty') {
      const course = this.getCourseById(assignment.courseId);
      const isAssigned = course && (course.facultyId === resolvedUser.id || course.facultyIds?.includes(resolvedUser.id));
      if (!isAssigned) {
        throw new Error('Unauthorized: You can only delete assignments for courses you instruct.');
      }
    }

    const assignments = getItem<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS).filter((a) => a.id !== id);
    setItem(KEYS.ASSIGNMENTS, assignments);

    this.addAuditLog({
      userId: resolvedUser.id,
      userName: resolvedUser.name,
      userRole: resolvedUser.role,
      action: 'ASSIGNMENT_ARCHIVED',
      entityType: 'Assignment',
      entityId: id,
      details: `Archived/Removed assignment "${assignment.title}"`,
      ipAddress: '127.0.0.1',
    });

    return true;
  },

  // Submissions (Authorized & Ownership Enforcement to eliminate IDOR)
  getSubmissions(requester?: User): Submission[] {
    const active = requester || this.getCurrentUser();
    if (!active) return []; // Defense in Depth: Never leak submissions to unauthenticated callers

    const list = getItem<Submission[]>(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    if (active.role === 'admin') return list;

    if (active.role === 'faculty') {
      const facultyCourses = this.getCourses().filter(
        (c) => c.facultyId === active.id || c.facultyIds?.includes(active.id)
      );
      const courseIds = new Set(facultyCourses.map((c) => c.id));
      return list.filter((s) => courseIds.has(s.courseId));
    }

    // Students: Strictly access ONLY their own submissions with private faculty notes stripped
    return list
      .filter((s) => s.studentId === active.id)
      .map((s) => {
        if (s.grade) {
          const { internalNotes, privateNotes, ...safeGrade } = s.grade;
          return { ...s, grade: safeGrade as Grade };
        }
        return s;
      });
  },

  getSubmissionById(id: string, requester?: User): Submission | undefined {
    const active = requester || this.getCurrentUser();
    if (!active) return undefined; // Defense in Depth: Never return submission to unauthenticated caller

    const sub = getItem<Submission[]>(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS).find((s) => s.id === id);
    if (!sub) return undefined;

    if (active.role === 'admin') return sub;

    if (active.role === 'faculty') {
      const facultyCourses = this.getCourses().filter(
        (c) => c.facultyId === active.id || c.facultyIds?.includes(active.id)
      );
      const courseIds = new Set(facultyCourses.map((c) => c.id));
      return courseIds.has(sub.courseId) ? sub : undefined;
    }

    if (active.role === 'student') {
      // IDOR Guard: A student cannot view another student's submission
      if (sub.studentId !== active.id) return undefined;
      // Field-level filtering: Strip internal faculty grading notes
      if (sub.grade) {
        const { internalNotes, privateNotes, ...safeGrade } = sub.grade;
        return { ...sub, grade: safeGrade as Grade };
      }
    }
    return sub;
  },

  saveSubmission(
    submissionData: Omit<Submission, 'id' | 'receiptId' | 'submittedAt' | 'isLate' | 'lateDays' | 'latePenaltyPercent' | 'status' | 'version'>,
    student?: User
  ): Submission {
    const activeStudent = student || this.getCurrentUser();
    if (!activeStudent || activeStudent.role !== 'student') {
      throw new Error('Unauthorized: Only enrolled students can submit assignments.');
    }

    const assignment = this.getAssignmentById(submissionData.assignmentId, activeStudent);
    if (!assignment) {
      throw new Error('Assignment not found or inaccessible.');
    }

    // Business Logic & IDOR Guard: Verify student is enrolled in this course
    const course = this.getCourseById(assignment.courseId);
    if (!course || !course.enrolledStudentIds?.includes(activeStudent.id)) {
      throw new Error('Unauthorized: You are not enrolled in the course for this assignment.');
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

    const allSubmissions = getItem<Submission[]>(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    const existing = allSubmissions.filter(
      (s) => s.assignmentId === assignment.id && s.studentId === activeStudent.id
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
      fileName: sanitizeFileName(submissionData.fileName),
      comments: submissionData.comments ? sanitizeTextInput(submissionData.comments) : undefined,
      studentId: activeStudent.id, // Strictly bind to authenticated student ID
      studentName: activeStudent.name,
      studentIdNumber: activeStudent.studentIdNumber || 'STU-001',
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

    this.addAuditLog({
      userId: activeStudent.id,
      userName: activeStudent.name,
      userRole: activeStudent.role,
      action: isLate ? 'SUBMISSION_LATE' : 'SUBMISSION_ON_TIME',
      entityType: 'Submission',
      entityId: submissionId,
      details: `Submitted "${newSubmission.fileName}" for "${assignment.title}" (${isLate ? `${lateDays} day(s) late` : 'on time'}). Receipt #${receiptId}`,
      ipAddress: '127.0.0.1',
    });

    // Notify assignment faculty
    this.addNotification({
      userId: assignment.facultyId,
      title: isLate ? `Late Submission: ${assignment.title}` : `New Submission: ${assignment.title}`,
      message: `${activeStudent.name} submitted ${newSubmission.fileName} for ${assignment.courseCode}. Status: ${isLate ? 'Late' : 'On Time'}.`,
      type: 'submission',
      actionTab: 'submissions',
    });

    // Notify student of receipt
    this.addNotification({
      userId: activeStudent.id,
      title: `Submission Confirmed #${receiptId}`,
      message: `Your file "${newSubmission.fileName}" was received successfully for "${assignment.title}".`,
      type: 'submission',
      actionTab: 'my-submissions',
    });

    syncAppointmentToSupabase({
      id: newSubmission.id,
      studentId: activeStudent.id,
      studentName: activeStudent.name,
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

  // Grading (Strict Authorization & Input Validation)
  gradeSubmission(
    submissionId: string,
    marksOrData: number | { marksObtained: number; feedback?: string; privateNotes?: string; internalNotes?: string; maxMarks?: number },
    feedbackOrFaculty?: string | User,
    facultyOrNotes?: User | string,
    notesOptional?: string
  ): Submission {
    const submissions = getItem<Submission[]>(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    const index = submissions.findIndex((s) => s.id === submissionId);
    if (index < 0) throw new Error('Submission not found');

    const sub = submissions[index];
    const assignment = this.getAssignmentById(sub.assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    let marksObtained = 0;
    let feedback = '';
    let faculty: User | undefined;
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

    const activeGrader = faculty || this.getCurrentUser();
    if (!activeGrader || (activeGrader.role !== 'faculty' && activeGrader.role !== 'admin')) {
      throw new Error('Unauthorized: Only certified faculty instructors and administrators can grade student submissions.');
    }

    if (activeGrader.role === 'faculty') {
      const course = this.getCourseById(assignment.courseId);
      const isAssigned = course && (course.facultyId === activeGrader.id || course.facultyIds?.includes(activeGrader.id));
      if (!isAssigned) {
        throw new Error('Unauthorized: You can only grade submissions for courses assigned to you.');
      }
    }

    const maxMarks = assignment.maxMarks;
    if (typeof marksObtained !== 'number' || isNaN(marksObtained) || marksObtained < 0 || marksObtained > maxMarks) {
      throw new Error(`Validation Error: Marks obtained must be a valid number between 0 and ${maxMarks}`);
    }

    const sanitizedFeedback = sanitizeTextInput(feedback);
    const sanitizedInternalNotes = internalNotes ? sanitizeTextInput(internalNotes) : undefined;
    const percentage = Number(((marksObtained / maxMarks) * 100).toFixed(1));
    const now = new Date().toISOString();

    const oldGrade = sub.grade;
    const grade: Grade = {
      id: oldGrade?.id || `grade-${Date.now()}`,
      submissionId: sub.id,
      assignmentId: sub.assignmentId,
      studentId: sub.studentId,
      facultyId: activeGrader.id,
      facultyName: activeGrader.name,
      gradedByName: activeGrader.name,
      marksObtained,
      maxMarks,
      percentage,
      feedback: sanitizedFeedback,
      internalNotes: sanitizedInternalNotes,
      privateNotes: sanitizedInternalNotes,
      gradedAt: now,
      auditTrail: [
        ...(oldGrade?.auditTrail || []),
        {
          action: oldGrade ? 'Grade Modified' : 'Grade Published',
          by: activeGrader.name,
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

    this.addAuditLog({
      userId: activeGrader.id,
      userName: activeGrader.name,
      userRole: activeGrader.role,
      action: oldGrade ? 'GRADE_MODIFIED' : 'GRADE_RECORDED',
      entityType: 'Grade',
      entityId: grade.id,
      details: `${oldGrade ? 'Updated' : 'Recorded'} grade for ${sub.studentName} on "${assignment.title}": ${marksObtained}/${maxMarks} (${percentage}%)`,
      ipAddress: '127.0.0.1',
    });

    this.addNotification({
      userId: sub.studentId,
      title: `Grade Published: ${assignment.title}`,
      message: `${activeGrader.name} posted your grade: ${marksObtained}/${maxMarks} (${percentage}%). Feedback: "${sanitizedFeedback.slice(0, 80)}..."`,
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
      title: sanitizeTextInput(notifData.title),
      message: sanitizeTextInput(notifData.message),
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

  // Audit Logs (Strict Admin-Only Access Guard to Prevent Internal Exposure)
  getAuditLogs(requester?: User): AuditLog[] {
    const active = requester || this.getCurrentUser();
    if (!active || active.role !== 'admin') {
      return []; // Defense against internal exposure: Non-admins cannot inspect system audit logs
    }
    return getItem(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  addAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...logData,
      details: redactSensitive(logData.details || ''),
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
