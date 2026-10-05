export type UserRole = 'student' | 'faculty' | 'admin';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl: string;
  coverUrl?: string;
  status: UserStatus;
  phone?: string;
  address?: string;
  bio?: string;
  enrolledCourseIds?: string[];
  departmentId: string;
  departmentName?: string;
  studentIdNumber?: string;
  employeeIdNumber?: string;
  semester?: number;
  program?: string;
  joinedDate: string;
  createdAt?: string;
  designation?: string;
  qualification?: string;
  alternateEmail?: string;
  dateOfJoining?: string;
  researchInterests?: string;
  phdMphilTitle?: string;
  institution?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  head: string;
  headOfDepartment?: string;
  building?: string;
  contactEmail?: string;
  status: 'active' | 'inactive';
  description?: string;
  coursesCount?: number;
}

export interface Course {
  id: string;
  courseCode: string;
  code?: string;
  courseName: string;
  title?: string;
  departmentId: string;
  departmentCode?: string;
  departmentName?: string;
  semester?: number;
  academicYear?: string;
  facultyId?: string;
  facultyIds: string[];
  facultyName?: string;
  facultyNames?: string[];
  enrolledStudentIds: string[];
  description: string;
  syllabus?: string;
  documentUrl?: string;
  documentName?: string;
  credits: number;
  status: 'active' | 'archived';
  documents?: {
    id: string;
    name: string;
    fileName: string;
    fileSize: string;
    fileType: string;
    category: 'syllabus' | 'lecture' | 'guide' | 'manual' | 'reference';
    description?: string;
    dataUrl: string;
    uploadedBy: string;
    uploadedById: string;
    uploadedAt: string;
  }[];
}

export interface AssignmentResource {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  title: string;
  description: string;
  instructions: string;
  maxMarks: number;
  publishedAt: string;
  dueAt: string;
  allowLateSubmission: boolean;
  latePenaltyPercentPerDay: number;
  allowResubmission: boolean;
  maxResubmissions: number;
  allowedFileTypes: string[]; // e.g. ['pdf', 'docx', 'zip']
  maxFileSizeMb: number;
  resources: AssignmentResource[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
}

export interface FileMetadataUser {
  id: string;
  name: string;
  email: string;
  role: string;
  studentIdNumber?: string;
}

export interface FileMetadataAssignment {
  id: string;
  title?: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
}

export interface FileMetadataSubmission {
  id: string;
  receiptId?: string;
  version?: number;
}

export interface FileUploadMetadata {
  id: string;
  fileKey: string;
  originalFilename: string;
  fileSize: number;
  fileSizeFormatted: string;
  mimeType: string;
  extension: string;
  sha256Hash: string;
  uploadTime: string;
  user: FileMetadataUser;
  assignment: FileMetadataAssignment;
  submission: FileMetadataSubmission;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  fileName: string;
  fileKey?: string;
  storedFileName?: string;
  fileSize: string;
  fileType: string;
  fileData?: string;
  fileMetadata?: FileUploadMetadata;
  r2Url?: string;
  comments?: string;
  submittedAt: string;
  isLate: boolean;
  lateDays: number;
  latePenaltyPercent: number;
  version: number;
  status: 'submitted' | 'late' | 'graded' | 'resubmission_requested';
  receiptId: string;
  grade?: Grade;
}

export interface Grade {
  id: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  facultyId: string;
  facultyName: string;
  gradedByName?: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  feedback: string;
  internalNotes?: string;
  privateNotes?: string;
  gradedAt: string;
  auditTrail?: {
    action: string;
    by: string;
    at: string;
    oldMarks?: number;
    newMarks?: number;
  }[];
}

export interface AppNotification {
  id: string;
  userId: string;
  roleScope?: 'all' | 'student' | 'faculty' | 'admin';
  title: string;
  message: string;
  type: 'assignment' | 'submission' | 'grade' | 'deadline' | 'system' | 'announcement';
  isRead: boolean;
  createdAt: string;
  actionTab?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType?: 'User' | 'Assignment' | 'Submission' | 'Grade' | 'Course' | 'Department' | 'Auth' | 'System';
  targetEntity?: string;
  entityId?: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  status?: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyTemplate: string;
  lastUpdated: string;
}

export interface SystemStats {
  totalUsers?: number;
  totalStudents: number;
  totalFaculty: number;
  totalCourses: number;
  totalDepartments?: number;
  totalAssignments: number;
  totalSubmissions: number;
  pendingReviews: number;
  gradedSubmissions: number;
  storageUsed?: string;
}
