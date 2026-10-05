import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import multer from "multer";
import fs from "fs";
import {
  initSecureStorage,
  storeSecureFile,
  resolveSecureFilePath,
  getFileMetadata,
  getAllFileMetadata,
  authorizeFileAccess,
  deleteSecureFile,
  SECURE_STORAGE_DIR,
} from "./server/fileSecurity";
import { uploadToCloudflareR2, listCloudflareR2Objects } from "./server/r2Service";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize secure file storage vault outside web root
  initSecureStorage();

  // API route for sending email
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: "SMTP configuration missing on server" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for port 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Your App" <no-reply@example.com>',
        to,
        subject,
        text,
        html,
      });
      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Configure multer memory storage with 100MB max cap
  const storageUpload = multer.memoryStorage();
  const upload = multer({
    storage: storageUpload,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100 MB limit
      files: 1,
    },
  });

  // =========================================================================
  // SECURE FILE MANAGEMENT ROUTES
  // =========================================================================

  /**
   * Helper to extract user info from request headers or query
   */
  function extractRequestUser(req: express.Request) {
    const id = (req.headers["x-user-id"] as string) || (req.query.userId as string) || "";
    const role = (req.headers["x-user-role"] as string) || (req.query.userRole as string) || "";
    const email = (req.headers["x-user-email"] as string) || (req.query.userEmail as string) || "";
    const name = (req.headers["x-user-name"] as string) || "";
    return { id, role, email, name };
  }

  // 1. Secure Assignment Submission File Upload
  app.post(
    "/api/assignments/:assignmentId/submit",
    (req, res, next) => {
      upload.single("assignmentFile")(req as any, res as any, (err: any) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              success: false,
              message: "File size exceeds the permitted server limit (max 25 MB). Please compress or choose a smaller file.",
            });
          }
          return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`,
          });
        } else if (err) {
          return res.status(400).json({
            success: false,
            message: `Upload initialization failed: ${err.message}`,
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No coursework file was provided in the upload request.",
          });
        }

        const assignmentId = req.params.assignmentId;
        const body = req.body || {};

        // Extract metadata inputs from body or headers
        const userMeta = {
          id: body.userId || (req.headers["x-user-id"] as string) || "user-unknown",
          name: body.userName || "Student",
          email: body.userEmail || "",
          role: body.userRole || "student",
          studentIdNumber: body.studentIdNumber || "",
        };

        const assignmentMeta = {
          id: assignmentId,
          title: body.assignmentTitle || "",
          courseId: body.courseId || "",
          courseCode: body.courseCode || "",
          courseName: body.courseName || "",
        };

        const submissionMeta = {
          id: body.submissionId || `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
          receiptId: body.receiptId || `REC-${Date.now().toString(36).toUpperCase()}`,
          version: Number(body.version) || 1,
        };

        // Parse optional assignment-specific constraints
        const maxFileSizeMb = Number(body.maxFileSizeMb) || 25;
        let allowedTypes: string[] | undefined = undefined;
        if (body.allowedTypes) {
          try {
            allowedTypes = Array.isArray(body.allowedTypes)
              ? body.allowedTypes
              : JSON.parse(body.allowedTypes);
          } catch {
            allowedTypes = String(body.allowedTypes).split(",").map((s) => s.trim());
          }
        }

        // Store file in private vault with comprehensive validation and metadata recording
        const result = await storeSecureFile(
          {
            originalname: req.file.originalname,
            buffer: req.file.buffer,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
          userMeta,
          assignmentMeta,
          submissionMeta,
          { maxFileSizeMb, allowedTypes }
        );

        if (!result.success || !result.metadata) {
          return res.status(400).json({
            success: false,
            message: result.error || "File security validation failed.",
          });
        }

        const metadata = result.metadata;

        // Automatically upload to Cloudflare R2 bucket in submissions/ folder
        let r2Result = null;
        try {
          r2Result = await uploadToCloudflareR2(
            req.file.buffer,
            metadata.originalFilename || req.file.originalname,
            metadata.mimeType || req.file.mimetype
          );
        } catch (r2Err) {
          console.warn("[Cloudflare R2] Background upload attempt logged:", r2Err);
        }

        return res.status(201).json({
          success: true,
          message: "Coursework file verified, securely stored, and synced with Cloudflare R2.",
          fileKey: metadata.fileKey,
          storedFilename: metadata.fileKey,
          filename: metadata.originalFilename,
          fileSize: metadata.fileSizeFormatted,
          mimeType: metadata.mimeType,
          submissionId: metadata.submission.id,
          receiptId: metadata.submission.receiptId,
          sha256Hash: metadata.sha256Hash,
          uploadTime: metadata.uploadTime,
          r2: r2Result,
          r2Url: r2Result?.url || null,
          metadata,
        });
      } catch (error) {
        console.error("[FileSecurity] Error during submission processing:", error);
        return res.status(500).json({
          success: false,
          message: "Internal error processing file upload. Please try again.",
        });
      }
    }
  );

  // Cloudflare R2 live objects API
  app.get("/api/r2/list", async (req, res) => {
    try {
      const objects = await listCloudflareR2Objects("submissions/");
      return res.json({ success: true, objects });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to list R2 files" });
    }
  });

  // Sync existing files to Cloudflare R2
  app.post("/api/r2/sync-all", async (req, res) => {
    try {
      const files = getAllFileMetadata();
      const results = [];
      for (const file of files) {
        const resolved = resolveSecureFilePath(file.fileKey);
        if (resolved.valid && fs.existsSync(resolved.absolutePath)) {
          const buffer = fs.readFileSync(resolved.absolutePath);
          const r2Res = await uploadToCloudflareR2(buffer, file.originalFilename, file.mimeType);
          results.push({ filename: file.originalFilename, ...r2Res });
        }
      }
      return res.json({ success: true, syncedCount: results.length, results });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Sync failed" });
    }
  });

  // 2. Secure Authorized File Download Route (prevents unauthorized access and path traversal)
  app.get("/api/files/download/:fileKey", async (req, res) => {
    try {
      const fileKey = req.params.fileKey;

      // Anti-Path Traversal Check
      const resolved = resolveSecureFilePath(fileKey);
      if (!resolved.valid) {
        return res.status(400).json({
          success: false,
          error: resolved.error || "Invalid file request.",
        });
      }

      // Metadata Lookup
      const metadata = getFileMetadata(fileKey);
      const requester = extractRequestUser(req);
      if (!metadata) {
        if (!fs.existsSync(resolved.absolutePath)) {
          return res.status(404).json({ success: false, error: "File not found." });
        }
        if (requester.role !== "admin" && requester.role !== "faculty") {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Verified authorization required to download coursework files.",
          });
        }
      } else {
        const authCheck = authorizeFileAccess(requester, metadata);
        if (!authCheck.authorized) {
          return res.status(403).json({
            success: false,
            error: authCheck.reason || "Unauthorized file access.",
          });
        }
      }

      const downloadName = metadata ? metadata.originalFilename : fileKey;
      const mimeType = metadata ? metadata.mimeType : "application/octet-stream";

      // Security Response Headers
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

      const fileStream = fs.createReadStream(resolved.absolutePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error("[FileSecurity] Download error:", err);
      return res.status(500).json({ success: false, error: "Error initiating secure file download." });
    }
  });

  // 3. Secure File Preview Route (inline viewing in sandboxed frame)
  app.get("/api/files/preview/:fileKey", async (req, res) => {
    try {
      const fileKey = req.params.fileKey;

      const resolved = resolveSecureFilePath(fileKey);
      if (!resolved.valid) {
        return res.status(400).json({ success: false, error: resolved.error });
      }

      const metadata = getFileMetadata(fileKey);
      const requester = extractRequestUser(req);
      if (!metadata) {
        if (!fs.existsSync(resolved.absolutePath)) {
          return res.status(404).json({ success: false, error: "File not found." });
        }
        if (requester.role !== "admin" && requester.role !== "faculty") {
          return res.status(403).json({ success: false, error: "Forbidden: Verified authorization required for preview." });
        }
      } else {
        const authCheck = authorizeFileAccess(requester, metadata);
        if (!authCheck.authorized) {
          return res.status(403).json({ success: false, error: authCheck.reason });
        }
      }

      const previewName = metadata ? metadata.originalFilename : fileKey;
      const mimeType = metadata ? metadata.mimeType : "application/pdf";

      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(previewName)}"`);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-same-origin");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

      const fileStream = fs.createReadStream(resolved.absolutePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error("[FileSecurity] Preview error:", err);
      return res.status(500).json({ success: false, error: "Error retrieving file preview." });
    }
  });

  // 4. File Metadata API (Authorized Inspection)
  app.get("/api/files/:fileKey/metadata", (req, res) => {
    const fileKey = req.params.fileKey;
    const metadata = getFileMetadata(fileKey);
    if (!metadata) {
      return res.status(404).json({ success: false, error: "Metadata record not found." });
    }

    const requester = extractRequestUser(req);
    const authCheck = authorizeFileAccess(requester, metadata);
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, error: authCheck.reason });
    }

    return res.json({ success: true, metadata });
  });

  // 5. General File Upload API (Allows Student, Faculty, Admin to upload any file)
  app.post(
    "/api/files/upload",
    upload.single("file") as any,
    async (req: express.Request, res: express.Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ success: false, message: "No file provided in request." });
        }

        const user = extractRequestUser(req);
        const courseId = (req.body.courseId as string) || "";
        const courseName = (req.body.courseName as string) || "";
        const assignmentId = (req.body.assignmentId as string) || "general";
        const assignmentTitle = (req.body.assignmentTitle as string) || "General Upload";

        const result = await storeSecureFile(
          req.file,
          {
            id: user.id || "anonymous-user",
            name: (req.body.userName as string) || user.name || "User",
            email: user.email || "",
            role: user.role,
            studentIdNumber: (req.body.studentIdNumber as string) || "",
          },
          {
            id: assignmentId,
            title: assignmentTitle,
            courseId,
            courseCode: (req.body.courseCode as string) || "",
            courseName,
          },
          {
            id: req.body.submissionId ? (req.body.submissionId as string) : "",
            receiptId: "",
            version: 1,
          },
          {
            maxFileSizeMb: 100,
          }
        );

        if (!result.success || !result.metadata) {
          return res.status(400).json({
            success: false,
            message: result.error || "File upload processing failed.",
          });
        }

        return res.status(201).json({
          success: true,
          message: "File successfully uploaded and stored.",
          fileKey: result.metadata.fileKey,
          filename: result.metadata.originalFilename,
          fileSize: result.metadata.fileSizeFormatted,
          mimeType: result.metadata.mimeType,
          sha256Hash: result.metadata.sha256Hash,
          uploadTime: result.metadata.uploadTime,
          metadata: result.metadata,
        });
      } catch (err: any) {
        console.error("[FileSecurity] Error during generic upload:", err);
        return res.status(500).json({ success: false, message: "Server error during file upload." });
      }
    }
  );

  // 6. Delete File API (Allows deleting any uploaded file from storage)
  app.delete("/api/files/:fileKey", async (req: express.Request, res: express.Response) => {
    try {
      const fileKey = req.params.fileKey;
      if (!fileKey) {
        return res.status(400).json({ success: false, message: "File key required." });
      }

      const result = await deleteSecureFile(fileKey);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error || "File could not be deleted." });
      }

      return res.json({ success: true, message: "File deleted successfully from secure storage." });
    } catch (err: any) {
      console.error("[FileSecurity] Error deleting file:", err);
      return res.status(500).json({ success: false, message: "Server error deleting file." });
    }
  });

  // 7. All Metadata Records API (Admin & Faculty Audit)
  app.get("/api/files/metadata", (req, res) => {
    const requester = extractRequestUser(req);
    if (requester.role !== "admin" && requester.role !== "faculty") {
      return res.status(403).json({ success: false, error: "Forbidden: Auditor or faculty access required." });
    }
    const all = getAllFileMetadata();
    return res.json({ success: true, count: all.length, records: all });
  });

  // 6. Explicitly block direct public access to uploads directory
  app.use("/uploads", (req, res) => {
    return res.status(403).json({
      error: "Access Denied: Direct public file access is restricted. Use the authorized /api/files/download/:fileKey route.",
      policy: "SECURE_STORAGE_ISOLATION",
    });
  });

  // Catch-all 404 handler for all undefined /api/* routes (Always return JSON, never HTML)
  app.all("/api/*", (req, res) => {
    return res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.originalUrl} not found.`,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
