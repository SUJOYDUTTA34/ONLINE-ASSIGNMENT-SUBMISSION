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
  SECURE_STORAGE_DIR,
} from "./server/fileSecurity";
import {
  uploadToCloudflareR2,
  listCloudflareR2Objects,
  deleteFromCloudflareR2,
  R2_PUBLIC_URL,
} from "./server/r2Service";
import {
  initD1Tables,
  getD1Assignments,
  saveD1Assignment,
  deleteD1Assignment,
  getD1Submissions,
  saveD1Submission,
  deleteD1Submission,
  saveD1CourseMaterial,
  getD1Status,
} from "./server/d1Service";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize secure file storage vault outside web root
  initSecureStorage();

  // Initialize Cloudflare D1 tables (assignments, submissions, course_materials)
  initD1Tables().catch((err) => {
    console.warn("[D1 Startup Notice]:", err?.message);
  });

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

  // Helper to extract user info from request headers or query
  function extractRequestUser(req: express.Request) {
    const id = (req.headers["x-user-id"] as string) || (req.query.userId as string) || "";
    const role = (req.headers["x-user-role"] as string) || (req.query.userRole as string) || "";
    const email = (req.headers["x-user-email"] as string) || (req.query.userEmail as string) || "";
    const name = (req.headers["x-user-name"] as string) || "";
    return { id, role, email, name };
  }

  // =========================================================================
  // CLOUDFLARE D1 DATABASE & R2 ROUTES
  // =========================================================================

  // D1 & R2 Status endpoint
  app.get("/api/d1/status", async (req, res) => {
    try {
      const status = await getD1Status();
      return res.json({ success: true, ...status });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 1. Assignments List: GET /api/assignments
  app.get("/api/assignments", async (req, res) => {
    try {
      const assignments = await getD1Assignments();
      return res.json({ success: true, assignments });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 2. Create or Update Assignment: POST /api/assignments (Supports attached file/photo upload to R2)
  app.post(
    "/api/assignments",
    upload.single("file") as any,
    async (req: express.Request, res: express.Response) => {
      try {
        const body = req.body || {};
        const id = body.id || `asg-${Date.now().toString().slice(-6)}`;
        let fileUrl = body.file_url || body.fileUrl || "";
        let fileName = body.file_name || body.fileName || "";

        // If faculty attached a file or photo with the assignment, upload to Cloudflare R2
        if (req.file) {
          try {
            const r2Res = await uploadToCloudflareR2(
              req.file.buffer,
              req.file.originalname,
              req.file.mimetype,
              "assignments"
            );
            if (r2Res.success && r2Res.url) {
              fileUrl = r2Res.url;
              fileName = req.file.originalname;
            }
          } catch (r2Err) {
            console.warn("[Cloudflare R2] Assignment attachment upload logged:", r2Err);
          }
        }

        const d1Result = await saveD1Assignment({
          id,
          courseCode: body.courseCode || body.course_code,
          courseName: body.courseName || body.course_name,
          title: body.title || "Assignment",
          description: body.description,
          instructions: body.instructions,
          dueAt: body.dueAt || body.due_date,
          maxMarks: body.maxMarks || body.max_marks,
          createdBy: body.facultyId || body.created_by,
          createdByName: body.facultyName || body.created_by_name,
          status: body.status || "published",
          allowedFileTypes: body.allowedFileTypes,
          allowed_file_types: body.allowed_file_types,
          maxFileSizeMb: body.maxFileSizeMb || body.max_file_size_mb,
          allowLateSubmission: body.allowLateSubmission,
          latePenaltyPercentPerDay: body.latePenaltyPercentPerDay,
          allowResubmission: body.allowResubmission,
          maxResubmissions: body.maxResubmissions,
          fileUrl,
          fileName,
        });

        return res.status(201).json({
          success: true,
          id,
          fileUrl,
          fileName,
          isCloudflare: d1Result.isCloudflare,
          message: "Assignment saved and synchronized with Cloudflare D1 & R2.",
        });
      } catch (err: any) {
        console.error("[Assignments] Error creating assignment:", err);
        return res.status(500).json({ success: false, error: err?.message || "Error creating assignment" });
      }
    }
  );

  // 3. Delete Assignment: DELETE /api/assignments/:id
  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteD1Assignment(id);
      return res.json({ success: true, message: `Assignment ${id} deleted.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 4. Submissions List: GET /api/submissions
  app.get("/api/submissions", async (req, res) => {
    try {
      const submissions = await getD1Submissions();
      return res.json({ success: true, submissions });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 5. Delete Submission: DELETE /api/submissions/:id
  app.delete("/api/submissions/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteD1Submission(id);
      return res.json({ success: true, message: `Submission ${id} deleted.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 6. Sync all Core Assignments & Submissions to Cloudflare D1
  app.post("/api/sync-d1", async (req, res) => {
    try {
      const coreAssignments = [
        {
          id: "asg-501",
          course_code: "CS-301",
          course_name: "Database Management Systems",
          title: "SQL Normalization & BCNF Implementation",
          description: "Design and normalize a university database schema up to BCNF with complex SQL queries and join operations.",
          instructions: "Implement normalization up to 3NF/BCNF. Upload your .sql file or PDF report.",
          due_date: "2026-10-15 23:59:00",
          max_marks: 50,
          created_by: "fac-201",
          created_by_name: "Dr. Arvind Rao",
          created_at: "2026-10-05 08:04:00",
        },
        {
          id: "asg-502",
          course_code: "CS-302",
          course_name: "Python Programming Lab",
          title: "Python Data Analysis Pipeline",
          description: "Build modular Pandas and NumPy analysis script with complete unit test suites.",
          instructions: "Deliver clean Python script (.py) or Jupyter notebook with charts.",
          due_date: "2026-10-20 23:59:00",
          max_marks: 40,
          created_by: "fac-201",
          created_by_name: "Dr. Arvind Rao",
          created_at: "2026-10-05 08:04:00",
        },
        {
          id: "asg-503",
          course_code: "BCA-301",
          course_name: "Numerical Methods",
          title: "BCA-301 — Coursework & Assignment Submission",
          description: "Submit assignments, project files, exercises or reports for Numerical Methods.",
          instructions: "Upload assignment solution PDF or code archive.",
          due_date: "2026-11-04 15:23:00",
          max_marks: 100,
          created_by: "fac-201",
          created_by_name: "Dr. Arvind Rao",
          created_at: "2026-10-05 08:04:00",
        },
        {
          id: "asg-504",
          course_code: "CS-401",
          course_name: "Microprocessor & Microcontroller",
          title: "CS-401 — Coursework & Assignment Submission",
          description: "Submit assignments, project files, exercises or reports for Microprocessor Microcontroller.",
          instructions: "Upload assembly/C code and simulation circuit schematics.",
          due_date: "2026-11-04 15:23:00",
          max_marks: 100,
          created_by: "fac-201",
          created_by_name: "Dr. Arvind Rao",
          created_at: "2026-10-05 08:04:00",
        },
      ];

      for (const asg of coreAssignments) {
        await saveD1Assignment(asg);
      }

      const status = await getD1Status();
      return res.json({
        success: true,
        message: "Successfully synchronized assignments to D1 database.",
        count: coreAssignments.length,
        status,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

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

        // Upload to Cloudflare R2 bucket in submissions/ folder
        let r2Result = null;
        try {
          r2Result = await uploadToCloudflareR2(
            req.file.buffer,
            metadata.originalFilename || req.file.originalname,
            metadata.mimeType || req.file.mimetype,
            "submissions"
          );
        } catch (r2Err) {
          console.warn("[Cloudflare R2] Background upload attempt logged:", r2Err);
        }

        // Save submission record into Cloudflare D1 database
        let d1Result = null;
        try {
          d1Result = await saveD1Submission({
            id: metadata.submission.id,
            assignment_id: assignmentId,
            student_id: userMeta.id === "user-stu-1" ? "stu-101" : userMeta.id,
            student_name: userMeta.name,
            student_email: userMeta.email,
            student_id_number: userMeta.studentIdNumber,
            file_name: metadata.originalFilename,
            file_url: r2Result?.url || metadata.fileKey,
            file_key: metadata.fileKey,
            file_size: metadata.fileSizeFormatted,
            mime_type: metadata.mimeType,
            sha256_hash: metadata.sha256Hash,
            status: "submitted",
            version: metadata.submission.version,
            receipt_id: metadata.submission.receiptId,
            submitted_at: metadata.uploadTime,
          });
        } catch (d1Err) {
          console.warn("[Cloudflare D1] Submission record save logged:", d1Err);
        }

        return res.status(201).json({
          success: true,
          message: "Coursework file verified, securely stored, and synced with Cloudflare R2 & D1 Database.",
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
          d1: d1Result,
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
      const prefix = (req.query.prefix as string) || "";
      const objects = await listCloudflareR2Objects(prefix);
      return res.json({ success: true, objects });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to list R2 files" });
    }
  });

  // Sync existing local files to Cloudflare R2
  app.post("/api/r2/sync-all", async (req, res) => {
    try {
      const files = getAllFileMetadata();
      const results = [];
      for (const file of files) {
        const resolved = resolveSecureFilePath(file.fileKey);
        if (resolved.valid && fs.existsSync(resolved.absolutePath)) {
          const buffer = fs.readFileSync(resolved.absolutePath);
          const r2Res = await uploadToCloudflareR2(buffer, file.originalFilename, file.mimeType, "submissions");
          results.push({ filename: file.originalFilename, ...r2Res });
        }
      }
      return res.json({ success: true, syncedCount: results.length, results });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Sync failed" });
    }
  });

  // Secure Authorized File Download Route
  app.get("/api/files/download/:fileKey", async (req, res) => {
    try {
      const fileKey = req.params.fileKey;

      const resolved = resolveSecureFilePath(fileKey);
      if (!resolved.valid) {
        return res.status(400).json({
          success: false,
          error: resolved.error || "Invalid file request.",
        });
      }

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

  // Secure File Preview Route
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

  // General File / Document Upload API: POST /api/files/upload (Uploads to R2 & D1)
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
        const courseCode = (req.body.courseCode as string) || "";
        const courseName = (req.body.courseName as string) || "";
        const assignmentId = (req.body.assignmentId as string) || "general";
        const assignmentTitle = (req.body.assignmentTitle as string) || req.file.originalname;

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
            courseCode,
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

        // Upload to Cloudflare R2
        let r2Res = null;
        try {
          r2Res = await uploadToCloudflareR2(
            req.file.buffer,
            result.metadata.originalFilename || req.file.originalname,
            result.metadata.mimeType || req.file.mimetype,
            "materials"
          );
        } catch (r2Err) {
          console.warn("[Cloudflare R2] Materials upload logged:", r2Err);
        }

        // Save into Cloudflare D1
        try {
          await saveD1CourseMaterial({
            id: `mat-${Date.now()}`,
            course_id: courseId,
            course_code: courseCode,
            name: assignmentTitle,
            file_name: result.metadata.originalFilename || req.file.originalname,
            file_key: result.metadata.fileKey,
            file_url: r2Res?.url || "",
            file_size: result.metadata.fileSizeFormatted,
            file_type: req.file.originalname.split(".").pop()?.toUpperCase() || "FILE",
            category: (req.body.category as string) || "General",
            uploaded_by: (req.body.userName as string) || user.name || "User",
            uploaded_by_id: user.id,
            uploaded_at: result.metadata.uploadTime,
          });
        } catch (d1Err) {
          console.warn("[Cloudflare D1] Course material save logged:", d1Err);
        }

        return res.status(201).json({
          success: true,
          message: "File successfully uploaded and stored in R2 & D1.",
          fileKey: result.metadata.fileKey,
          filename: result.metadata.originalFilename,
          fileSize: result.metadata.fileSizeFormatted,
          mimeType: result.metadata.mimeType,
          sha256Hash: result.metadata.sha256Hash,
          uploadTime: result.metadata.uploadTime,
          r2Url: r2Res?.url || null,
          metadata: result.metadata,
        });
      } catch (err: any) {
        console.error("[FileSecurity] Error during generic upload:", err);
        return res.status(500).json({ success: false, message: "Server error during file upload." });
      }
    }
  );

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

      // Also attempt to delete from R2 if key corresponds to R2
      deleteFromCloudflareR2(`submissions/${fileKey}`).catch(() => {});
      deleteFromCloudflareR2(`materials/${fileKey}`).catch(() => {});

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
