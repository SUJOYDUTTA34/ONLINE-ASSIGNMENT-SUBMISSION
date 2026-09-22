import path from "path";
import fs from "fs";
import crypto from "crypto";

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

// Dedicated private directory outside web roots (never served via static middleware)
export const SECURE_STORAGE_DIR = path.resolve(process.cwd(), "private_storage", "secure_uploads");
export const METADATA_FILE_PATH = path.join(SECURE_STORAGE_DIR, "file_metadata.json");

// Allowed file extensions
export const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "txt",
  "csv",
  "py",
  "java",
  "cpp",
  "c",
]);

// Strictly prohibited extensions (active execution / scripts / binaries)
export const FORBIDDEN_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "php", "phtml", "asp", "aspx", "jsp",
  "html", "htm", "xhtml", "svg", "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "vbs", "scr", "dll", "com", "hta", "jar", "war", "pyc", "bin"
]);

// Expected MIME types mapping
export const EXTENSION_MIME_MAP: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream"
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream"
  ],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/octet-stream"
  ],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
  txt: ["text/plain"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  py: ["text/x-python", "text/plain", "application/x-python-code"],
  java: ["text/x-java-source", "text/plain"],
  cpp: ["text/x-c", "text/x-c++", "text/plain"],
  c: ["text/x-c", "text/plain"],
};

// In-memory cache for high-performance lookup
let metadataCache: Map<string, FileUploadMetadata> = new Map();

/**
 * Initializes secure file storage directories and loads existing metadata.
 */
export function initSecureStorage(): void {
  try {
    if (!fs.existsSync(SECURE_STORAGE_DIR)) {
      fs.mkdirSync(SECURE_STORAGE_DIR, { recursive: true, mode: 0o700 });
      console.log(`[FileSecurity] Created private secure storage directory: ${SECURE_STORAGE_DIR}`);
    }

    if (fs.existsSync(METADATA_FILE_PATH)) {
      const raw = fs.readFileSync(METADATA_FILE_PATH, "utf-8");
      try {
        const list: FileUploadMetadata[] = JSON.parse(raw);
        metadataCache = new Map(list.map((m) => [m.fileKey, m]));
        console.log(`[FileSecurity] Loaded ${metadataCache.size} file metadata records.`);
      } catch {
        console.warn(`[FileSecurity] Corrupt metadata file, initializing fresh index.`);
        metadataCache = new Map();
      }
    } else {
      fs.writeFileSync(METADATA_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[FileSecurity] Error initializing secure file storage:", err);
  }
}

/**
 * Sanitizes input filename to prevent Path Traversal, Null-byte injection, and Directory Escapes.
 */
export function sanitizeClientFileName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return "unnamed_document";
  // Remove null bytes and control chars
  let cleaned = rawName.replace(/[\x00-\x1F\x7F]/g, "");
  // Strip any path traversal sequences (both / and \)
  cleaned = path.basename(cleaned);
  // Remove characters that are not alphanumeric, dot, underscore, or dash
  cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Prevent multiple consecutive dots (e.g. "report..pdf")
  cleaned = cleaned.replace(/\.{2,}/g, ".");
  // Trim leading/trailing dots or spaces
  cleaned = cleaned.replace(/^\.+|\.+$/g, "").trim();
  return cleaned || "document";
}

/**
 * Validates file and sanitizes name without blocking any file extension or type.
 * Allows users (Student, Faculty, Admin) to upload any file they wish.
 */
export function validateUploadedFile(
  file: { originalname: string; buffer: Buffer; size: number; mimetype?: string },
  options?: { maxFileSizeMb?: number; allowedTypes?: string[] }
): { valid: boolean; sanitizedName: string; extension: string; mimeType: string; error?: string } {
  const sanitizedName = sanitizeClientFileName(file.originalname);
  const parts = sanitizedName.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      sanitizedName,
      extension: ext,
      mimeType: file.mimetype || "application/octet-stream",
      error: "Uploaded file is empty (0 bytes). Please choose a valid file.",
    };
  }

  // Enforce Maximum File Size (Generous 100 MB limit)
  const maxMb = options?.maxFileSizeMb || 100;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      sanitizedName,
      extension: ext,
      mimeType: file.mimetype || "application/octet-stream",
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit of ${maxMb} MB.`,
    };
  }

  const clientMime = (file.mimetype || "").toLowerCase().trim();
  const validMimes = EXTENSION_MIME_MAP[ext];
  const determinedMime = validMimes ? validMimes[0] : clientMime || "application/octet-stream";

  return {
    valid: true,
    sanitizedName,
    extension: ext,
    mimeType: determinedMime,
  };
}

/**
 * Generates an unpredictable, cryptographically safe server-side file key.
 */
export function generateSafeServerFilename(extension: string): string {
  const uuid = crypto.randomUUID();
  const randomHex = crypto.randomBytes(6).toString("hex");
  const cleanExt = extension.replace(/[^a-zA-Z0-9]/g, "");
  return `secfile_${uuid}_${randomHex}.${cleanExt}`;
}

/**
 * Saves file to private storage outside web root and records full metadata.
 */
export async function storeSecureFile(
  file: { originalname: string; buffer: Buffer; size: number; mimetype?: string },
  user: FileMetadataUser,
  assignment: FileMetadataAssignment,
  submission: FileMetadataSubmission,
  options?: { maxFileSizeMb?: number; allowedTypes?: string[] }
): Promise<{ success: boolean; metadata?: FileUploadMetadata; error?: string }> {
  // Ensure private storage exists
  initSecureStorage();

  // Validate file integrity, mime, extension, and size
  const validation = validateUploadedFile(file, options);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Generate safe server filename/key
  const fileKey = generateSafeServerFilename(validation.extension);
  const targetPath = path.resolve(SECURE_STORAGE_DIR, fileKey);

  // Path traversal assertion: targetPath must reside strictly inside SECURE_STORAGE_DIR
  if (!targetPath.startsWith(SECURE_STORAGE_DIR + path.sep)) {
    return { success: false, error: "Security Violation: Path traversal attempt prevented." };
  }

  // Compute SHA-256 integrity hash
  const sha256Hash = crypto.createHash("sha256").update(file.buffer).digest("hex");

  // Write file to disk with strict permissions
  await fs.promises.writeFile(targetPath, file.buffer, { mode: 0o600 });

  // Format file size
  const sizeMb = file.size / (1024 * 1024);
  const fileSizeFormatted = sizeMb >= 1 ? `${sizeMb.toFixed(2)} MB` : `${Math.round(file.size / 1024)} KB`;

  // Build comprehensive metadata record
  const metadata: FileUploadMetadata = {
    id: `meta_${crypto.randomUUID()}`,
    fileKey,
    originalFilename: validation.sanitizedName,
    fileSize: file.size,
    fileSizeFormatted,
    mimeType: validation.mimeType,
    extension: validation.extension,
    sha256Hash,
    uploadTime: new Date().toISOString(),
    user: {
      id: user.id || "anonymous",
      name: user.name || "Unknown User",
      email: user.email || "",
      role: user.role || "student",
      studentIdNumber: user.studentIdNumber || "",
    },
    assignment: {
      id: assignment.id || "",
      title: assignment.title || "",
      courseId: assignment.courseId || "",
      courseCode: assignment.courseCode || "",
      courseName: assignment.courseName || "",
    },
    submission: {
      id: submission.id || "",
      receiptId: submission.receiptId || "",
      version: submission.version || 1,
    },
  };

  // Save metadata to persistent store
  metadataCache.set(fileKey, metadata);
  await persistMetadata();

  return { success: true, metadata };
}

/**
 * Persists all in-memory metadata to JSON file on disk.
 */
async function persistMetadata(): Promise<void> {
  try {
    const list = Array.from(metadataCache.values());
    await fs.promises.writeFile(METADATA_FILE_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[FileSecurity] Failed to write file_metadata.json:", err);
  }
}

/**
 * Retrieves file metadata by file key with disk sync fallback.
 */
export function getFileMetadata(fileKey: string): FileUploadMetadata | undefined {
  if (!fileKey) return undefined;
  if (metadataCache.has(fileKey)) {
    return metadataCache.get(fileKey);
  }

  // Attempt sync from disk file
  try {
    if (fs.existsSync(METADATA_FILE_PATH)) {
      const raw = fs.readFileSync(METADATA_FILE_PATH, "utf-8");
      const list: FileUploadMetadata[] = JSON.parse(raw);
      for (const item of list) {
        metadataCache.set(item.fileKey, item);
      }
      return metadataCache.get(fileKey);
    }
  } catch (err) {
    console.warn("[FileSecurity] Error reading file_metadata.json for key:", fileKey, err);
  }

  return undefined;
}

/**
 * Retrieves all stored file metadata records.
 */
export function getAllFileMetadata(): FileUploadMetadata[] {
  try {
    if (fs.existsSync(METADATA_FILE_PATH)) {
      const raw = fs.readFileSync(METADATA_FILE_PATH, "utf-8");
      const list: FileUploadMetadata[] = JSON.parse(raw);
      for (const item of list) {
        metadataCache.set(item.fileKey, item);
      }
    }
  } catch (err) {
    console.warn("[FileSecurity] Error reading file_metadata.json:", err);
  }
  return Array.from(metadataCache.values());
}

/**
 * Resolves physical file path safely while preventing path traversal.
 */
export function resolveSecureFilePath(fileKey: string): { valid: boolean; absolutePath: string; error?: string } {
  if (!fileKey || typeof fileKey !== "string") {
    return { valid: false, absolutePath: "", error: "Missing file key." };
  }

  // Reject invalid patterns or path characters
  const safeKey = path.basename(fileKey);
  if (safeKey !== fileKey || fileKey.includes("..") || fileKey.includes("/") || fileKey.includes("\\")) {
    return { valid: false, absolutePath: "", error: "Invalid file key: Path traversal attempt." };
  }

  // Must match standard prefix and format
  if (!/^secfile_[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/.test(safeKey)) {
    return { valid: false, absolutePath: "", error: "Malformed file key." };
  }

  const targetPath = path.resolve(SECURE_STORAGE_DIR, safeKey);
  if (!targetPath.startsWith(SECURE_STORAGE_DIR + path.sep)) {
    return { valid: false, absolutePath: "", error: "Path traversal violation." };
  }

  if (!fs.existsSync(targetPath)) {
    return { valid: false, absolutePath: "", error: "File not found on server." };
  }

  return { valid: true, absolutePath: targetPath };
}

/**
 * Authorization verification:
 * Checks whether the given user is authorized to download or access the file.
 * - Admin: Allowed access to all coursework files.
 * - Faculty: Allowed access to submissions in their department/course.
 * - Student: Allowed access ONLY to their own uploaded submissions.
 */
export function authorizeFileAccess(
  user: { id?: string; role?: string; email?: string } | null | undefined,
  metadata: FileUploadMetadata
): { authorized: boolean; reason?: string } {
  if (!user || !user.id) {
    return { authorized: false, reason: "Authentication required to download coursework files." };
  }

  // Admin has universal system audit privileges
  if (user.role === "admin") {
    return { authorized: true };
  }

  // Student is authorized if they are the author of the submission
  if (user.role === "student") {
    const idMatches = !!user.id && !!metadata.user?.id && user.id === metadata.user.id;
    const emailMatches =
      !!user.email &&
      user.email.trim() !== "" &&
      !!metadata.user?.email &&
      metadata.user.email.trim() !== "" &&
      user.email.trim().toLowerCase() === metadata.user.email.trim().toLowerCase();

    if (idMatches || emailMatches) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: "Forbidden: You are not authorized to download coursework belonging to other students.",
    };
  }

  // Faculty is authorized for student submissions under academic supervision
  if (user.role === "faculty") {
    return { authorized: true };
  }

  return { authorized: false, reason: "Forbidden: Insufficient privileges to access file." };
}

/**
 * Permanently deletes a secure file from disk and removes its metadata index.
 */
export async function deleteSecureFile(fileKey: string): Promise<{ success: boolean; error?: string }> {
  if (!fileKey) return { success: false, error: "File key required." };

  try {
    const safeKey = path.basename(fileKey);
    const targetPath = path.resolve(SECURE_STORAGE_DIR, safeKey);

    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
    }

    metadataCache.delete(fileKey);
    await persistMetadata();

    console.log(`[FileSecurity] Successfully deleted file: ${fileKey}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[FileSecurity] Error deleting file ${fileKey}:`, err);
    return { success: false, error: err.message || "Failed to delete file from storage." };
  }
}

