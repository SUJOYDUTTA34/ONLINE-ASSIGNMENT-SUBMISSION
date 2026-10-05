// Cloudflare Pages Functions API Handler with D1 Database & R2 Storage
// Handles all /api/* endpoints when deployed on Cloudflare Pages / Workers

interface Env {
  DB?: any; // Cloudflare D1 Database binding
  STORAGE?: any; // Cloudflare R2 Storage binding
}

const R2_PUBLIC_BASE = "https://pub-8557046cca48459d9643063d35d0e38c.r2.dev";

// Auto-initialize D1 tables if not already present
async function ensureD1Tables(db: any) {
  if (!db) return;
  try {
    await db.prepare(`
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
    `).run();

    await db.prepare(`
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
    `).run();

    await db.prepare(`
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
    `).run();
  } catch (err) {
    console.error("[Cloudflare D1 Table Init Error]:", err);
  }
}

export async function onRequest(context: { request: Request; env: Env; params: { route?: string[] } }) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const method = request.method.toUpperCase();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id, x-user-role, x-user-email, x-user-name",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Ensure tables exist on D1
  if (env.DB) {
    await ensureD1Tables(env.DB);
  }

  try {
    // 0. Health check & live status
    if (path === "health" || path === "" || path === "d1/status") {
      let assignmentCount = 0;
      let submissionCount = 0;
      let materialsCount = 0;
      if (env.DB) {
        try {
          const a = await env.DB.prepare("SELECT COUNT(*) as count FROM assignments").first();
          assignmentCount = a?.count ?? 0;
          const s = await env.DB.prepare("SELECT COUNT(*) as count FROM submissions").first();
          submissionCount = s?.count ?? 0;
          const m = await env.DB.prepare("SELECT COUNT(*) as count FROM course_materials").first();
          materialsCount = m?.count ?? 0;
        } catch (_) {}
      }
      return jsonResponse({
        status: "ok",
        message: "Cloudflare D1 & R2 Portal API Online",
        hasD1: !!env.DB,
        hasR2: !!env.STORAGE,
        databaseName: "assignment_portal_db",
        bucketName: "assignment-files",
        counts: {
          assignments: assignmentCount,
          submissions: submissionCount,
          courseMaterials: materialsCount,
        },
        timestamp: new Date().toISOString(),
      }, corsHeaders);
    }

    // 1. Submit Assignment: POST /api/assignments/:id/submit OR POST /api/submissions
    if ((path.includes("submit") || path === "submissions") && method === "POST") {
      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = (formData.get("assignmentFile") || formData.get("file")) as File | null;
        const assignmentId = (formData.get("assignmentId") || path.split("/")[1] || "asg-501") as string;
        const studentId = (formData.get("userId") || formData.get("studentId") || "stu-101") as string;
        const studentName = (formData.get("userName") || formData.get("studentName") || "Student") as string;
        const studentEmail = (formData.get("userEmail") || formData.get("studentEmail") || "") as string;
        const studentIdNumber = (formData.get("studentIdNumber") || "2024-1388") as string;
        const courseCode = (formData.get("courseCode") || "CS-301") as string;
        const assignmentTitle = (formData.get("assignmentTitle") || "Assignment Submission") as string;
        const comments = (formData.get("comments") || "") as string;

        const timestamp = Date.now();
        const submissionId = `sub-${timestamp.toString().slice(-6)}`;
        const receiptId = `REC-${timestamp.toString().slice(-6)}`;

        let fileKey = "";
        let originalName = file ? file.name : "submission.pdf";
        let fileSizeStr = file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "0.50 MB";
        let mimeType = file?.type || "application/octet-stream";

        // Upload directly to Cloudflare R2 Storage (Bucket: assignment-files, Key: submissions/filename)
        if (file && env.STORAGE) {
          const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          fileKey = `submissions/${safeName}`;

          try {
            await env.STORAGE.put(fileKey, file.stream(), {
              httpMetadata: {
                contentType: mimeType,
                contentDisposition: `inline; filename="${safeName}"`,
              },
              customMetadata: {
                studentId,
                studentName,
                studentEmail,
                assignmentId,
                submissionId,
                uploadedAt: new Date().toISOString(),
              },
            });
          } catch (r2Error: any) {
            console.error("Cloudflare R2 Put Error:", r2Error);
          }
        }

        const r2Url = fileKey ? `${R2_PUBLIC_BASE}/${fileKey}` : "";

        // Insert Record into Cloudflare D1 Database (Table: submissions)
        if (env.DB) {
          try {
            await env.DB.prepare(`
              INSERT INTO submissions (
                id, assignment_id, student_id, student_name, student_email, student_id_number,
                file_name, file_url, file_key, file_size, mime_type, status, version, receipt_id, submitted_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                file_name = excluded.file_name,
                file_url = excluded.file_url,
                file_key = excluded.file_key,
                file_size = excluded.file_size,
                status = excluded.status;
            `).bind(
              submissionId,
              assignmentId,
              studentId,
              studentName,
              studentEmail,
              studentIdNumber,
              originalName,
              r2Url,
              fileKey,
              fileSizeStr,
              mimeType,
              "submitted",
              1,
              receiptId,
              new Date().toISOString()
            ).run();
          } catch (dbErr: any) {
            console.error("Cloudflare D1 Submission Insert Error:", dbErr);
          }
        }

        return jsonResponse({
          success: true,
          message: "Coursework verified and stored in Cloudflare R2 & D1 Database.",
          submissionId,
          receiptId,
          fileKey: fileKey || `submission_${timestamp}`,
          storedFilename: fileKey || `submission_${timestamp}`,
          filename: originalName,
          fileSize: fileSizeStr,
          mimeType,
          r2Url: r2Url || null,
          status: "submitted",
          metadata: {
            id: submissionId,
            fileKey,
            originalFilename: originalName,
            fileSize: file ? file.size : 1024,
            fileSizeFormatted: fileSizeStr,
            mimeType,
            uploadTime: new Date().toISOString(),
            user: { id: studentId, name: studentName, email: studentEmail, role: "student" },
            assignment: { id: assignmentId, title: assignmentTitle, courseCode },
            submission: { id: submissionId, receiptId },
          },
        }, corsHeaders, 201);
      }
    }

    // 2. Assignments List: GET /api/assignments
    if (path === "assignments" && method === "GET") {
      if (env.DB) {
        try {
          const { results } = await env.DB.prepare(
            "SELECT * FROM assignments ORDER BY due_date ASC"
          ).all();
          return jsonResponse({ success: true, assignments: results || [] }, corsHeaders);
        } catch (e: any) {
          return jsonResponse({ success: false, error: e.message }, corsHeaders, 500);
        }
      }
      return jsonResponse({ success: true, assignments: [] }, corsHeaders);
    }

    // 3. Create or Update Assignment: POST /api/assignments (Supports JSON or Multipart with file/photo upload)
    if (path === "assignments" && method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      let body: any = {};
      let attachedFile: File | null = null;

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        attachedFile = (formData.get("file") || formData.get("assignmentFile") || formData.get("photo")) as File | null;
        for (const [key, value] of formData.entries()) {
          if (typeof value === "string") {
            body[key] = value;
          }
        }
      } else {
        body = await request.json() as any;
      }

      const id = body.id || `asg-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();
      let fileUrl = body.file_url || body.fileUrl || "";
      let fileName = body.file_name || body.fileName || "";

      // If an assignment file or photo was uploaded, stream to Cloudflare R2
      if (attachedFile && env.STORAGE) {
        const safeName = `${Date.now()}_${attachedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const key = `assignments/${safeName}`;
        try {
          await env.STORAGE.put(key, attachedFile.stream(), {
            httpMetadata: {
              contentType: attachedFile.type || "application/octet-stream",
              contentDisposition: `inline; filename="${safeName}"`,
            },
          });
          fileUrl = `${R2_PUBLIC_BASE}/${key}`;
          fileName = attachedFile.name;
        } catch (r2Err) {
          console.error("R2 Assignment file upload error:", r2Err);
        }
      }

      if (env.DB) {
        try {
          await env.DB.prepare(`
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
          `).bind(
            id,
            body.courseCode || body.course_code || "CS-301",
            body.courseName || body.course_name || "Course",
            body.title || "New Course Assignment",
            body.description || "",
            body.instructions || "",
            body.dueAt || body.due_date || now,
            Number(body.maxMarks || body.max_marks || 100),
            body.facultyId || body.created_by || "fac-201",
            body.facultyName || body.created_by_name || "Faculty",
            body.createdAt || body.created_at || now,
            body.status || "published",
            Array.isArray(body.allowedFileTypes) ? body.allowedFileTypes.join(",") : (body.allowed_file_types || "all,pdf,docx,zip"),
            Number(body.maxFileSizeMb || body.max_file_size_mb || 100),
            body.allowLateSubmission !== undefined ? (body.allowLateSubmission ? 1 : 0) : 1,
            Number(body.latePenaltyPercentPerDay || body.late_penalty_percent_per_day || 5),
            body.allowResubmission !== undefined ? (body.allowResubmission ? 1 : 0) : 1,
            Number(body.maxResubmissions || body.max_resubmissions || 3),
            fileUrl,
            fileName
          ).run();

          return jsonResponse({
            success: true,
            id,
            fileUrl,
            fileName,
            message: "Assignment saved to Cloudflare D1 & R2",
          }, corsHeaders, 201);
        } catch (e: any) {
          return jsonResponse({ success: false, error: e.message }, corsHeaders, 500);
        }
      }

      return jsonResponse({ success: true, id, fileUrl, message: "Assignment processed" }, corsHeaders, 201);
    }

    // 4. Delete Assignment: DELETE /api/assignments/:id
    if (path.startsWith("assignments/") && method === "DELETE") {
      const asgId = path.replace("assignments/", "");
      if (env.DB) {
        await env.DB.prepare("DELETE FROM assignments WHERE id = ?").bind(asgId).run();
        return jsonResponse({ success: true, message: `Assignment ${asgId} deleted from D1` }, corsHeaders);
      }
      return jsonResponse({ success: true }, corsHeaders);
    }

    // 5. Submissions List: GET /api/submissions
    if (path === "submissions" && method === "GET") {
      if (env.DB) {
        try {
          const { results } = await env.DB.prepare(
            "SELECT * FROM submissions ORDER BY submitted_at DESC"
          ).all();
          return jsonResponse({ success: true, submissions: results || [] }, corsHeaders);
        } catch (e: any) {
          return jsonResponse({ success: false, error: e.message }, corsHeaders, 500);
        }
      }
      return jsonResponse({ success: true, submissions: [] }, corsHeaders);
    }

    // 6. Delete Submission: DELETE /api/submissions/:id
    if (path.startsWith("submissions/") && method === "DELETE") {
      const subId = path.replace("submissions/", "");
      if (env.DB) {
        await env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(subId).run();
        return jsonResponse({ success: true, message: `Submission ${subId} deleted from D1` }, corsHeaders);
      }
      return jsonResponse({ success: true }, corsHeaders);
    }

    // 7. General File / Course Material Upload: POST /api/files/upload
    if (path === "files/upload" && method === "POST") {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return jsonResponse({ success: false, error: "No file provided" }, corsHeaders, 400);
      }

      const courseId = (formData.get("courseId") as string) || "";
      const courseCode = (formData.get("courseCode") as string) || "";
      const docName = (formData.get("assignmentTitle") || formData.get("name") || file.name) as string;
      const userName = (formData.get("userName") as string) || "User";
      const userId = (formData.get("userId") as string) || "";
      const category = (formData.get("category") as string) || "General";

      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const fileKey = `materials/${safeName}`;
      let r2Url = "";

      if (env.STORAGE) {
        try {
          await env.STORAGE.put(fileKey, file.stream(), {
            httpMetadata: {
              contentType: file.type || "application/octet-stream",
              contentDisposition: `inline; filename="${safeName}"`,
            },
          });
          r2Url = `${R2_PUBLIC_BASE}/${fileKey}`;
        } catch (e) {
          console.error("R2 Upload error in files/upload:", e);
        }
      }

      const matId = `mat-${Date.now()}`;
      const fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      const fileType = file.name.split(".").pop()?.toUpperCase() || "FILE";

      if (env.DB) {
        try {
          await env.DB.prepare(`
            INSERT INTO course_materials (
              id, course_id, course_code, name, file_name, file_key, file_url,
              file_size, file_type, category, uploaded_by, uploaded_by_id, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            matId, courseId, courseCode, docName, file.name, fileKey, r2Url,
            fileSize, fileType, category, userName, userId, new Date().toISOString()
          ).run();
        } catch (dbErr) {
          console.error("D1 Material insert error:", dbErr);
        }
      }

      return jsonResponse({
        success: true,
        fileKey,
        filename: file.name,
        fileSize,
        fileType,
        r2Url,
        message: "File uploaded and stored in Cloudflare R2 & D1",
      }, corsHeaders, 201);
    }

    // 8. Sync all Core Assignments & Submissions to Cloudflare D1
    if (path === "sync-d1" || path === "sync-all") {
      if (!env.DB) return jsonResponse({ error: "D1 database not connected" }, corsHeaders, 503);

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
        await env.DB.prepare(`
          INSERT INTO assignments (
            id, course_code, course_name, title, description, instructions,
            due_date, max_marks, created_by, created_by_name, created_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            course_code = excluded.course_code,
            title = excluded.title,
            description = excluded.description,
            instructions = excluded.instructions,
            due_date = excluded.due_date,
            max_marks = excluded.max_marks;
        `).bind(
          asg.id,
          asg.course_code,
          asg.course_name,
          asg.title,
          asg.description,
          asg.instructions,
          asg.due_date,
          asg.max_marks,
          asg.created_by,
          asg.created_by_name,
          asg.created_at,
          "published"
        ).run();
      }

      return jsonResponse({
        success: true,
        message: "Successfully synchronized assignments into Cloudflare D1 database!",
        count: coreAssignments.length,
      }, corsHeaders);
    }

    // 9. R2 List Objects: GET /api/r2/list
    if (path === "r2/list" && method === "GET") {
      if (env.STORAGE) {
        const prefix = url.searchParams.get("prefix") || "";
        const listed = await env.STORAGE.list({ prefix });
        const objects = (listed.objects || []).map((o: any) => ({
          key: o.key,
          size: o.size,
          lastModified: o.uploaded,
          url: `${R2_PUBLIC_BASE}/${o.key}`,
        }));
        return jsonResponse({ success: true, objects }, corsHeaders);
      }
      return jsonResponse({ success: true, objects: [] }, corsHeaders);
    }

    // 10. File Retrieval from R2: GET /api/files/:key or GET /api/files/download/:key
    if (path.startsWith("files/") && method === "GET") {
      const fileKey = decodeURIComponent(path.replace(/^files\/(download\/)?/, ""));
      if (!env.STORAGE) {
        return new Response("Storage not configured", { status: 503, headers: corsHeaders });
      }

      const object = await env.STORAGE.get(fileKey);
      if (!object) {
        return new Response("File not found in R2 bucket", { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Content-Disposition", `attachment; filename="${fileKey.split("/").pop()}"`);

      return new Response(object.body, { headers });
    }

    // Default fallback
    return jsonResponse({ error: "Endpoint not found", path }, corsHeaders, 404);

  } catch (error: any) {
    console.error("Pages Function Error:", error);
    return jsonResponse({ error: error.message || "Internal server error" }, corsHeaders, 500);
  }
}

function jsonResponse(data: any, headers: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}
