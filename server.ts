import "dotenv/config";
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
} from "./server/fileSecurity";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Online Assignment Portal" <no-reply@example.com>',
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

  // Helper to extract user info from request headers or query
  function extractRequestUser(req: express.Request) {
    const id = (req.headers["x-user-id"] as string) || (req.query.userId as string) || "";
    const role = (req.headers["x-user-role"] as string) || (req.query.userRole as string) || "";
    const email = (req.headers["x-user-email"] as string) || (req.query.userEmail as string) || "";
    const name = (req.headers["x-user-name"] as string) || "";
    return { id, role, email, name };
  }

  // =========================================================================
  // SECURE FILE MANAGEMENT & SUBMISSION ROUTES
  // =========================================================================

  // 1. Secure Assignment Submission File Upload: POST /api/assignments/:assignmentId/submit
  app.post(
    "/api/assignments/:assignmentId/submit",
    (req, res, next) => {
      upload.single("assignmentFile")(req as any, res as any, (err: any) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              success: false,
              message: "File size exceeds the permitted server limit (max 100 MB).",
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
          id: body.submissionId || `sub-${Date.now().toString().slice(-6)}`,
          receiptId: body.receiptId || `REC-${Date.now().toString(36).toUpperCase()}`,
          version: Number(body.version) || 1,
        };

        const maxFileSizeMb = Number(body.maxFileSizeMb) || 100;
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

        // Store file in private vault with comprehensive validation
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

        return res.status(201).json({
          success: true,
          message: "Coursework file verified and securely stored in private vault.",
          fileKey: metadata.fileKey,
          storedFilename: metadata.fileKey,
          filename: metadata.originalFilename,
          fileSize: metadata.fileSizeFormatted,
          mimeType: metadata.mimeType,
          submissionId: metadata.submission.id,
          receiptId: metadata.submission.receiptId,
          sha256Hash: metadata.sha256Hash,
          uploadTime: metadata.uploadTime,
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

  // 2. Course Materials & General File Upload: POST /api/files/upload
  app.post(
    "/api/files/upload",
    upload.single("file") as any,
    async (req: express.Request, res: express.Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No document file was provided in the upload request.",
          });
        }

        const body = req.body || {};
        const userMeta = {
          id: (req.headers["x-user-id"] as string) || body.userId || "user-unknown",
          name: (req.headers["x-user-name"] as string) || body.userName || "User",
          email: (req.headers["x-user-email"] as string) || body.userEmail || "",
          role: (req.headers["x-user-role"] as string) || body.userRole || "faculty",
        };

        const courseId = body.courseId || "gen-course";
        const courseCode = body.courseCode || "GEN";
        const courseName = body.courseName || "General Course";
        const docName = body.assignmentTitle || body.docName || req.file.originalname;

        // Store file in private vault with security validation
        const result = await storeSecureFile(
          {
            originalname: req.file.originalname,
            buffer: req.file.buffer,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
          userMeta,
          {
            id: courseId,
            title: docName,
            courseId,
            courseCode,
            courseName,
          },
          {
            id: `doc-${Date.now()}`,
            receiptId: `DOC-${Date.now().toString(36).toUpperCase()}`,
            version: 1,
          },
          { maxFileSizeMb: 100 }
        );

        if (!result.success || !result.metadata) {
          return res.status(400).json({
            success: false,
            message: result.error || "File security validation failed.",
          });
        }

        const metadata = result.metadata;

        return res.status(201).json({
          success: true,
          message: "Document successfully uploaded and securely stored.",
          fileKey: metadata.fileKey,
          storedFilename: metadata.fileKey,
          filename: metadata.originalFilename,
          fileSize: metadata.fileSizeFormatted,
          mimeType: metadata.mimeType,
          metadata,
        });
      } catch (error) {
        console.error("[FileSecurity] Error during material upload:", error);
        return res.status(500).json({
          success: false,
          message: "Internal error processing document upload.",
        });
      }
    }
  );

  // Secure Authorized File Download Route
  app.get("/api/files/download/:fileKey(*)", async (req, res) => {
    try {
      const fileKey = req.params.fileKey;

      const resolved = resolveSecureFilePath(fileKey);
      if (resolved.valid && fs.existsSync(resolved.absolutePath)) {
        const metadata = getFileMetadata(fileKey);
        const downloadName = metadata ? metadata.originalFilename : path.basename(fileKey);
        const mimeType = metadata ? metadata.mimeType : "application/octet-stream";

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
        res.setHeader("Content-Type", mimeType);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

        const fileStream = fs.createReadStream(resolved.absolutePath);
        return fileStream.pipe(res);
      }

      if (fileKey.startsWith("http")) {
        return res.redirect(fileKey);
      }

      return res.status(404).json({ success: false, error: "File not found." });
    } catch (err) {
      console.error("[FileSecurity] Download error:", err);
      return res.status(500).json({ success: false, error: "Error initiating secure file download." });
    }
  });

  // Secure File Preview Route
  app.get("/api/files/preview/:fileKey(*)", async (req, res) => {
    try {
      const fileKey = req.params.fileKey;

      const resolved = resolveSecureFilePath(fileKey);
      if (resolved.valid && fs.existsSync(resolved.absolutePath)) {
        const metadata = getFileMetadata(fileKey);
        const previewName = metadata ? metadata.originalFilename : path.basename(fileKey);
        const mimeType = metadata ? metadata.mimeType : "application/pdf";

        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(previewName)}"`);
        res.setHeader("Content-Type", mimeType);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-same-origin");
        res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

        const fileStream = fs.createReadStream(resolved.absolutePath);
        return fileStream.pipe(res);
      }

      if (fileKey.startsWith("http")) {
        return res.redirect(fileKey);
      }

      return res.status(404).json({ success: false, error: "File not found in local vault." });
    } catch (err) {
      console.error("[FileSecurity] Preview error:", err);
      return res.status(500).json({ success: false, error: "Error retrieving file preview." });
    }
  });

  // File Metadata API
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

  // Delete File API
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

  // All Metadata Records API
  app.get("/api/files/metadata", (req, res) => {
    const requester = extractRequestUser(req);
    if (requester.role !== "admin" && requester.role !== "faculty") {
      return res.status(403).json({ success: false, error: "Forbidden: Auditor or faculty access required." });
    }
    const all = getAllFileMetadata();
    return res.json({ success: true, count: all.length, records: all });
  });

  // Explicitly block direct public access to uploads directory
  app.use("/uploads", (req, res) => {
    return res.status(403).json({
      error: "Access Denied: Direct public file access is restricted. Use the authorized /api/files/download/:fileKey route.",
      policy: "SECURE_STORAGE_ISOLATION",
    });
  });

  // Catch-all 404 handler for undefined /api/* routes
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
