import fs from "fs";
import path from "path";

// Cloudflare D1 Credentials & Configuration
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "5fb0fecd021df22c60e523bcc6909ecb";
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || "a71f76cb-8197-4ff4-afcd-c501b3ee0bfa";
const AUTH_EMAIL = process.env.CLOUDFLARE_AUTH_EMAIL || "";
const AUTH_KEY = process.env.CLOUDFLARE_AUTH_KEY || "";

function getAuthToken(): string {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN.trim();
  }
  if (process.env.CF_API_TOKEN) {
    return process.env.CF_API_TOKEN.trim();
  }
  try {
    const tomlPath = path.join(process.env.APPDATA || "", "xdg.config", ".wrangler", "config", "default.toml");
    if (fs.existsSync(tomlPath)) {
      const content = fs.readFileSync(tomlPath, "utf-8");
      const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (_) {}
  return "";
}

const CACHE_FILE = path.join(process.cwd(), "private_storage", "d1_local_cache.json");

interface D1QueryResult<T = any> {
  success: boolean;
  results?: T[];
  meta?: any;
  error?: string;
  isCloudflare?: boolean;
}

// Local cache storage helper for offline / pre-token development fallback
function getLocalCache(): { assignments: any[]; submissions: any[]; materials: any[] } {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("[D1 Cache] Error reading cache file:", e);
  }
  return { assignments: [], submissions: [], materials: [] };
}

function saveLocalCache(data: { assignments: any[]; submissions: any[]; materials: any[] }) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("[D1 Cache] Error saving cache file:", e);
  }
}

/**
 * Execute SQL query against Cloudflare D1 REST API.
 * POST https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query
 */
export async function executeD1Query<T = any>(sql: string, params: any[] = []): Promise<D1QueryResult<T>> {
  const token = getAuthToken();
  if (!token && !(AUTH_EMAIL && AUTH_KEY)) {
    return {
      success: false,
      error: "Cloudflare API Token not provided. Using local storage.",
      isCloudflare: false,
    };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (AUTH_EMAIL && AUTH_KEY) {
    headers["X-Auth-Email"] = AUTH_EMAIL.trim();
    headers["X-Auth-Key"] = AUTH_KEY.trim();
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ sql, params }),
    });

    const data = await res.json() as any;

    if (!data.success) {
      const errMsg = (data.errors && data.errors.map((e: any) => e.message).join(", ")) || "Unknown D1 Error";
      console.warn(`[Cloudflare D1] Query warning: ${errMsg}`);
      return { success: false, error: errMsg, isCloudflare: true };
    }

    const firstResult = data.result && data.result[0];
    const results = firstResult?.results || [];
    return {
      success: true,
      results,
      meta: firstResult?.meta,
      isCloudflare: true,
    };
  } catch (err: any) {
    console.error("[Cloudflare D1] Network / Execution Error:", err);
    return {
      success: false,
      error: err?.message || "Cloudflare D1 Network Error",
      isCloudflare: true,
    };
  }
}

/**
 * Initialize all required tables in Cloudflare D1 database (assignments, submissions, course_materials)
 */
export async function initD1Tables(): Promise<{ success: boolean; initialized: boolean; message: string }> {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      course_code TEXT,
      course_name TEXT,
      title TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      due_date TEXT,
      max_marks INTEGER DEFAULT 100,
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'published',
      allowed_file_types TEXT,
      max_file_size_mb INTEGER DEFAULT 100,
      allow_late_submission INTEGER DEFAULT 1,
      late_penalty_percent_per_day INTEGER DEFAULT 5,
      allow_resubmission INTEGER DEFAULT 1,
      max_resubmissions INTEGER DEFAULT 3,
      file_url TEXT,
      file_name TEXT
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT,
      student_email TEXT,
      student_id_number TEXT,
      file_name TEXT,
      file_url TEXT,
      file_key TEXT,
      file_size TEXT,
      mime_type TEXT,
      sha256_hash TEXT,
      status TEXT DEFAULT 'submitted',
      version INTEGER DEFAULT 1,
      receipt_id TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      grade_score REAL,
      grade_feedback TEXT,
      graded_by TEXT,
      graded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS course_materials (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      course_code TEXT,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_key TEXT NOT NULL,
      file_url TEXT,
      file_size TEXT,
      file_type TEXT,
      category TEXT,
      uploaded_by TEXT,
      uploaded_by_id TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );
  `;

  const statements = schemaSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let anyCFSuccess = false;
  for (const stmt of statements) {
    const res = await executeD1Query(stmt);
    if (res.success) {
      anyCFSuccess = true;
    }
  }

  if (anyCFSuccess) {
    console.log("[Cloudflare D1] Database schema tables verified on Cloudflare D1.");
    return { success: true, initialized: true, message: "Tables initialized on Cloudflare D1." };
  } else {
    console.log("[Cloudflare D1] Local schema initialized (Cloudflare D1 API Token required for live cloud sync).");
    return { success: true, initialized: false, message: "Local schema active. Provide CLOUDFLARE_API_TOKEN to sync live with Cloudflare D1." };
  }
}

/**
 * Get all assignments
 */
export async function getD1Assignments(): Promise<any[]> {
  const query = "SELECT * FROM assignments ORDER BY due_date ASC";
  const res = await executeD1Query(query);
  if (res.success && res.results) {
    return res.results;
  }
  const cache = getLocalCache();
  return cache.assignments;
}

/**
 * Insert or update an assignment in D1
 */
export async function saveD1Assignment(asg: {
  id: string;
  courseCode?: string;
  course_code?: string;
  courseName?: string;
  course_name?: string;
  title: string;
  description?: string;
  instructions?: string;
  dueAt?: string;
  due_date?: string;
  maxMarks?: number;
  max_marks?: number;
  createdBy?: string;
  created_by?: string;
  createdByName?: string;
  created_by_name?: string;
  createdAt?: string;
  created_at?: string;
  status?: string;
  allowedFileTypes?: string[];
  allowed_file_types?: string;
  maxFileSizeMb?: number;
  max_file_size_mb?: number;
  allowLateSubmission?: boolean | number;
  allow_late_submission?: number;
  latePenaltyPercentPerDay?: number;
  late_penalty_percent_per_day?: number;
  allowResubmission?: boolean | number;
  allow_resubmission?: number;
  maxResubmissions?: number;
  max_resubmissions?: number;
  fileUrl?: string;
  file_url?: string;
  fileName?: string;
  file_name?: string;
}): Promise<{ success: boolean; id: string; isCloudflare: boolean }> {
  const id = asg.id;
  const courseCode = asg.course_code || asg.courseCode || "CS-301";
  const courseName = asg.course_name || asg.courseName || "General Course";
  const title = asg.title;
  const description = asg.description || "";
  const instructions = asg.instructions || "";
  const dueDate = asg.due_date || asg.dueAt || new Date().toISOString();
  const maxMarks = Number(asg.max_marks || asg.maxMarks || 100);
  const createdBy = asg.created_by || asg.createdBy || "fac-201";
  const createdByName = asg.created_by_name || asg.createdByName || "Faculty";
  const createdAt = asg.created_at || asg.createdAt || new Date().toISOString();
  const status = asg.status || "published";
  const allowedTypes = Array.isArray(asg.allowedFileTypes)
    ? asg.allowedFileTypes.join(",")
    : asg.allowed_file_types || "pdf,docx,zip";
  const maxMb = Number(asg.max_file_size_mb || asg.maxFileSizeMb || 100);
  const allowLate = asg.allow_late_submission !== undefined ? Number(asg.allow_late_submission) : asg.allowLateSubmission ? 1 : 0;
  const penalty = Number(asg.late_penalty_percent_per_day || asg.latePenaltyPercentPerDay || 5);
  const allowResub = asg.allow_resubmission !== undefined ? Number(asg.allow_resubmission) : asg.allowResubmission ? 1 : 0;
  const maxResub = Number(asg.max_resubmissions || asg.maxResubmissions || 3);
  const fileUrl = asg.file_url || asg.fileUrl || "";
  const fileName = asg.file_name || asg.fileName || "";

  const sql = `
    INSERT INTO assignments (
      id, course_code, course_name, title, description, instructions,
      due_date, max_marks, created_by, created_by_name, created_at,
      status, allowed_file_types, max_file_size_mb, allow_late_submission,
      late_penalty_percent_per_day, allow_resubmission, max_resubmissions,
      file_url, file_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      course_code = excluded.course_code,
      course_name = excluded.course_name,
      title = excluded.title,
      description = excluded.description,
      instructions = excluded.instructions,
      due_date = excluded.due_date,
      max_marks = excluded.max_marks,
      status = excluded.status,
      file_url = excluded.file_url,
      file_name = excluded.file_name;
  `;

  const params = [
    id, courseCode, courseName, title, description, instructions,
    dueDate, maxMarks, createdBy, createdByName, createdAt,
    status, allowedTypes, maxMb, allowLate,
    penalty, allowResub, maxResub,
    fileUrl, fileName,
  ];

  const res = await executeD1Query(sql, params);

  // Update local cache
  const cache = getLocalCache();
  const existingIdx = cache.assignments.findIndex((a) => a.id === id);
  const record = {
    id, course_code: courseCode, course_name: courseName, title, description, instructions,
    due_date: dueDate, max_marks: maxMarks, created_by: createdBy, created_by_name: createdByName,
    created_at: createdAt, status, allowed_file_types: allowedTypes, max_file_size_mb: maxMb,
    allow_late_submission: allowLate, late_penalty_percent_per_day: penalty,
    allow_resubmission: allowResub, max_resubmissions: maxResub,
    file_url: fileUrl, file_name: fileName,
  };

  if (existingIdx >= 0) {
    cache.assignments[existingIdx] = record;
  } else {
    cache.assignments.unshift(record);
  }
  saveLocalCache(cache);

  return { success: true, id, isCloudflare: !!res.success };
}

/**
 * Delete an assignment from D1
 */
export async function deleteD1Assignment(id: string): Promise<{ success: boolean }> {
  await executeD1Query("DELETE FROM assignments WHERE id = ?", [id]);
  const cache = getLocalCache();
  cache.assignments = cache.assignments.filter((a) => a.id !== id);
  saveLocalCache(cache);
  return { success: true };
}

/**
 * Get all submissions
 */
export async function getD1Submissions(): Promise<any[]> {
  const query = "SELECT * FROM submissions ORDER BY submitted_at DESC";
  const res = await executeD1Query(query);
  if (res.success && res.results) {
    return res.results;
  }
  const cache = getLocalCache();
  return cache.submissions;
}

/**
 * Insert or update a submission in D1
 */
export async function saveD1Submission(sub: {
  id: string;
  assignmentId?: string;
  assignment_id?: string;
  studentId?: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  studentEmail?: string;
  student_email?: string;
  studentIdNumber?: string;
  student_id_number?: string;
  fileName?: string;
  file_name?: string;
  fileUrl?: string;
  file_url?: string;
  fileKey?: string;
  file_key?: string;
  fileSize?: string;
  file_size?: string;
  mimeType?: string;
  mime_type?: string;
  sha256Hash?: string;
  sha256_hash?: string;
  status?: string;
  version?: number;
  receiptId?: string;
  receipt_id?: string;
  submittedAt?: string;
  submitted_at?: string;
  gradeScore?: number;
  grade_score?: number;
  gradeFeedback?: string;
  grade_feedback?: string;
  gradedBy?: string;
  graded_by?: string;
  gradedAt?: string;
  graded_at?: string;
}): Promise<{ success: boolean; id: string; isCloudflare: boolean }> {
  const id = sub.id;
  const assignmentId = sub.assignment_id || sub.assignmentId || "asg-501";
  const studentId = sub.student_id || sub.studentId || "stu-101";
  const studentName = sub.student_name || sub.studentName || "Student";
  const studentEmail = sub.student_email || sub.studentEmail || "";
  const studentIdNumber = sub.student_id_number || sub.studentIdNumber || "";
  const fileName = sub.file_name || sub.fileName || "submission.pdf";
  const fileUrl = sub.file_url || sub.fileUrl || "";
  const fileKey = sub.file_key || sub.fileKey || "";
  const fileSize = sub.file_size || sub.fileSize || "1.0 MB";
  const mimeType = sub.mime_type || sub.mimeType || "application/octet-stream";
  const sha256Hash = sub.sha256_hash || sub.sha256Hash || "";
  const status = sub.status || "submitted";
  const version = Number(sub.version || 1);
  const receiptId = sub.receipt_id || sub.receiptId || `REC-${Date.now().toString(36).toUpperCase()}`;
  const submittedAt = sub.submitted_at || sub.submittedAt || new Date().toISOString();
  const gradeScore = sub.grade_score !== undefined ? sub.grade_score : sub.gradeScore ?? null;
  const gradeFeedback = sub.grade_feedback || sub.gradeFeedback || null;
  const gradedBy = sub.graded_by || sub.gradedBy || null;
  const gradedAt = sub.graded_at || sub.gradedAt || null;

  const sql = `
    INSERT INTO submissions (
      id, assignment_id, student_id, student_name, student_email, student_id_number,
      file_name, file_url, file_key, file_size, mime_type, sha256_hash,
      status, version, receipt_id, submitted_at,
      grade_score, grade_feedback, graded_by, graded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      file_name = excluded.file_name,
      file_url = excluded.file_url,
      file_key = excluded.file_key,
      file_size = excluded.file_size,
      mime_type = excluded.mime_type,
      status = excluded.status,
      version = excluded.version,
      grade_score = excluded.grade_score,
      grade_feedback = excluded.grade_feedback,
      graded_by = excluded.graded_by,
      graded_at = excluded.graded_at;
  `;

  const params = [
    id, assignmentId, studentId, studentName, studentEmail, studentIdNumber,
    fileName, fileUrl, fileKey, fileSize, mimeType, sha256Hash,
    status, version, receiptId, submittedAt,
    gradeScore, gradeFeedback, gradedBy, gradedAt,
  ];

  const res = await executeD1Query(sql, params);

  // Update local cache
  const cache = getLocalCache();
  const existingIdx = cache.submissions.findIndex((s) => s.id === id);
  const record = {
    id, assignment_id: assignmentId, student_id: studentId, student_name: studentName,
    student_email: studentEmail, student_id_number: studentIdNumber, file_name: fileName,
    file_url: fileUrl, file_key: fileKey, file_size: fileSize, mime_type: mimeType,
    sha256_hash: sha256Hash, status, version, receipt_id: receiptId, submitted_at: submittedAt,
    grade_score: gradeScore, grade_feedback: gradeFeedback, graded_by: gradedBy, graded_at: gradedAt,
  };

  if (existingIdx >= 0) {
    cache.submissions[existingIdx] = record;
  } else {
    cache.submissions.unshift(record);
  }
  saveLocalCache(cache);

  return { success: true, id, isCloudflare: !!res.success };
}

/**
 * Delete a submission from D1
 */
export async function deleteD1Submission(id: string): Promise<{ success: boolean }> {
  await executeD1Query("DELETE FROM submissions WHERE id = ?", [id]);
  const cache = getLocalCache();
  cache.submissions = cache.submissions.filter((s) => s.id !== id);
  saveLocalCache(cache);
  return { success: true };
}

/**
 * Insert or update a course material / document in D1
 */
export async function saveD1CourseMaterial(mat: {
  id: string;
  courseId?: string;
  course_id?: string;
  courseCode?: string;
  course_code?: string;
  name: string;
  fileName?: string;
  file_name?: string;
  fileKey?: string;
  file_key?: string;
  fileUrl?: string;
  file_url?: string;
  fileSize?: string;
  file_size?: string;
  fileType?: string;
  file_type?: string;
  category?: string;
  uploadedBy?: string;
  uploaded_by?: string;
  uploadedById?: string;
  uploaded_by_id?: string;
  uploadedAt?: string;
  uploaded_at?: string;
}): Promise<{ success: boolean; id: string }> {
  const id = mat.id;
  const courseId = mat.course_id || mat.courseId || "";
  const courseCode = mat.course_code || mat.courseCode || "";
  const name = mat.name;
  const fileName = mat.file_name || mat.fileName || "document";
  const fileKey = mat.file_key || mat.fileKey || "";
  const fileUrl = mat.file_url || mat.fileUrl || "";
  const fileSize = mat.file_size || mat.fileSize || "1.0 MB";
  const fileType = mat.file_type || mat.fileType || "PDF";
  const category = mat.category || "General";
  const uploadedBy = mat.uploaded_by || mat.uploadedBy || "Faculty";
  const uploadedById = mat.uploaded_by_id || mat.uploadedById || "";
  const uploadedAt = mat.uploaded_at || mat.uploadedAt || new Date().toISOString();

  const sql = `
    INSERT INTO course_materials (
      id, course_id, course_code, name, file_name, file_key, file_url,
      file_size, file_type, category, uploaded_by, uploaded_by_id, uploaded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      file_name = excluded.file_name,
      file_url = excluded.file_url,
      file_size = excluded.file_size,
      category = excluded.category;
  `;

  const params = [
    id, courseId, courseCode, name, fileName, fileKey, fileUrl,
    fileSize, fileType, category, uploadedBy, uploadedById, uploadedAt,
  ];

  await executeD1Query(sql, params);

  const cache = getLocalCache();
  const existingIdx = cache.materials.findIndex((m) => m.id === id);
  const record = {
    id, course_id: courseId, course_code: courseCode, name, file_name: fileName,
    file_key: fileKey, file_url: fileUrl, file_size: fileSize, file_type: fileType,
    category, uploaded_by: uploadedBy, uploaded_by_id: uploadedById, uploaded_at: uploadedAt,
  };
  if (existingIdx >= 0) cache.materials[existingIdx] = record;
  else cache.materials.unshift(record);
  saveLocalCache(cache);

  return { success: true, id };
}

/**
 * Get all courses from D1
 */
export async function getD1Courses(): Promise<any[]> {
  const query = "SELECT * FROM courses ORDER BY code ASC";
  const res = await executeD1Query(query);
  if (res.success && res.results) {
    return res.results;
  }
  return [];
}

/**
 * Insert or update a course in D1
 */
export async function saveD1Course(course: any): Promise<{ success: boolean; id: string; isCloudflare: boolean }> {
  const id = course.id || `course-${Date.now()}`;
  const code = (course.code || course.courseCode || "CS-101").toUpperCase();
  const title = course.title || course.courseName || "New Course";
  const departmentId = course.departmentId || course.department_id || "dept-1";
  const departmentName = course.departmentName || course.department_name || "Computer Science";
  const semester = Number(course.semester || 1);
  const academicYear = course.academicYear || course.academic_year || "2026-2027";
  const facultyId = course.facultyId || course.faculty_id || "fac-201";
  const facultyName = course.facultyName || course.faculty_name || "Faculty";
  const description = course.description || "";
  const credits = Number(course.credits || 4);
  const status = course.status || "active";

  const sql = `
    INSERT INTO courses (
      id, code, title, department_id, department_name, semester, academic_year,
      faculty_id, faculty_name, description, credits, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code = excluded.code,
      title = excluded.title,
      department_id = excluded.department_id,
      department_name = excluded.department_name,
      faculty_id = excluded.faculty_id,
      faculty_name = excluded.faculty_name,
      description = excluded.description,
      credits = excluded.credits,
      status = excluded.status;
  `;

  const params = [
    id, code, title, departmentId, departmentName, semester, academicYear,
    facultyId, facultyName, description, credits, status
  ];

  const res = await executeD1Query(sql, params);
  return { success: true, id, isCloudflare: !!res.success };
}

/**
 * Delete a course from D1
 */
export async function deleteD1Course(id: string): Promise<{ success: boolean }> {
  await executeD1Query("DELETE FROM courses WHERE id = ?", [id]);
  return { success: true };
}

/**
 * Returns overall D1 status and counts
 */
export async function getD1Status(): Promise<{
  connected: boolean;
  isCloudflare: boolean;
  databaseId: string;
  databaseName: string;
  hasApiToken: boolean;
  assignmentCount: number;
  submissionCount: number;
  materialsCount: number;
  courseCount: number;
}> {
  const hasToken = !!(getAuthToken() || (AUTH_EMAIL && AUTH_KEY));
  const testRes = await executeD1Query("SELECT COUNT(*) as count FROM assignments");

  if (testRes.success && testRes.isCloudflare) {
    const subsRes = await executeD1Query("SELECT COUNT(*) as count FROM submissions");
    const matRes = await executeD1Query("SELECT COUNT(*) as count FROM course_materials");
    const coursesRes = await executeD1Query("SELECT COUNT(*) as count FROM courses");
    return {
      connected: true,
      isCloudflare: true,
      databaseId: DATABASE_ID,
      databaseName: "assignment_portal_db",
      hasApiToken: hasToken,
      assignmentCount: testRes.results?.[0]?.count ?? 0,
      submissionCount: subsRes.results?.[0]?.count ?? 0,
      materialsCount: matRes.results?.[0]?.count ?? 0,
      courseCount: coursesRes.results?.[0]?.count ?? 0,
    };
  }

  const cache = getLocalCache();
  return {
    connected: true,
    isCloudflare: false,
    databaseId: DATABASE_ID,
    databaseName: "assignment_portal_db",
    hasApiToken: hasToken,
    assignmentCount: cache.assignments.length,
    submissionCount: cache.submissions.length,
    materialsCount: cache.materials.length,
    courseCount: 4,
  };
}
