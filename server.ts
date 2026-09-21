import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  // Configure multer memory storage
  const storageUpload = multer.memoryStorage();
  const upload = multer({
    storage: storageUpload,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB limit
    }
  });

  // Ensure uploads directory exists
  const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'assignments');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // API route for assignment submission
  app.post("/api/assignments/:assignmentId/submit", upload.single("assignmentFile"), async (req, res) => {
    try {
      // 1. Check that a file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a PDF file before submitting."
        });
      }

      const file = req.file;

      // 2. Validate file size (10 MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return res.status(413).json({
          success: false,
          message: "File size exceeds the maximum allowed size of 10 MB."
        });
      }

      // 3. Check the extension case-insensitively (.pdf)
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== ".pdf") {
        return res.status(400).json({
          success: false,
          message: "Only PDF files are allowed."
        });
      }

      // 4. Check the detected MIME type
      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          message: "Only PDF files are allowed."
        });
      }

      // 5. Verify the PDF file signature/magic bytes
      // A valid PDF normally begins with %PDF- (hex: 25 50 44 46)
      const magicBytes = file.buffer.toString("ascii", 0, 4);
      if (magicBytes !== "%PDF") {
        return res.status(400).json({
          success: false,
          message: "The selected file is not a valid PDF document. Please select a valid PDF file."
        });
      }

      // 6. Generate secure unique filename
      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const randomHex = crypto.randomBytes(4).toString("hex");
      const secureStoredName = `submission_${req.params.assignmentId}_${timestamp}_${randomHex}.pdf`;

      // 7. Save file to physical storage (outside executable code directories)
      const destPath = path.join(UPLOADS_DIR, secureStoredName);
      await fs.promises.writeFile(destPath, file.buffer);

      // 8. Return success response
      return res.status(201).json({
        success: true,
        message: "Assignment submitted successfully",
        submissionId: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
        filename: file.originalname,
        storedFilename: secureStoredName,
        fileSize: file.size,
        mimeType: file.mimetype
      });
    } catch (error) {
      console.error("Error in backend submission validation:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong while submitting your assignment. Please try again later."
      });
    }
  });

  // Serve the uploads folder statically
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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
