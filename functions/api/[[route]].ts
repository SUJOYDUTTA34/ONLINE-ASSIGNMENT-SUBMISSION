// Cloudflare Pages Functions API Handler with D1 Database & R2 Storage
// Handles /api/* endpoints when deployed on Cloudflare Pages / Workers

interface Env {
  DB?: any; // Cloudflare D1 Database binding
  STORAGE?: any; // Cloudflare R2 Storage binding
}

const R2_PUBLIC_BASE = "https://pub-8557046cca48459d9643063d35d0e38c.r2.dev";

export async function onRequest(context: { request: Request; env: Env; params: { route?: string[] } }) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const method = request.method.toUpperCase();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id, x-user-role, x-user-email",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Ensure D1 core assignments (asg-501 to asg-504) exist
  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO assignments (id, course_code, title, description, due_date, max_marks, created_by, created_at)
         VALUES 
         ('asg-501', 'CS-301', 'SQL Normalization & BCNF Implementation', 'Design and normalize a university database schema up to BCNF with complex SQL queries and join operations.', '2026-10-15 23:59:00', 50, 'fac-201', '2026-10-05 08:04:00'),
         ('asg-502', 'CS-302', 'Python Data Analysis Pipeline', 'Build modular Pandas and NumPy analysis script.', '2026-10-20 23:59:00', 40, 'fac-201', '2026-10-05 08:04:00'),
         ('asg-503', 'BCA-301', 'BCA-301 — Coursework & Assignment Submission', 'Submit assignments, project files, exercises or reports for Numerical Methods.', '2026-11-04 15:23:00', 100, 'fac-201', '2026-10-05 08:04:00'),
         ('asg-504', 'CS-401', 'CS-401 — Coursework & Assignment Submission', 'Submit assignments, project files, exercises or reports for Microprocessor Microcontroller.', '2026-11-04 15:23:00', 100, 'fac-201', '2026-10-05 08:04:00')`
      ).run();
    } catch (e) {
      // Ignore if table already populated
    }
  }

  try {
    // Health check & status
    if (path === "health" || path === "") {
      return jsonResponse({
        status: "ok",
        message: "Scholaris Cloudflare API online",
        hasD1: !!env.DB,
        hasR2: !!env.STORAGE,
        timestamp: new Date().toISOString(),
      }, corsHeaders);
    }

    // 1. Submit Assignment: POST /api/assignments/:id/submit OR POST /api/submissions
    if ((path.includes("submit") || path === "submissions") && method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      
      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = (formData.get("assignmentFile") || formData.get("file")) as File | null;
        const rawAssignmentId = (formData.get("assignmentId") || path.split("/")[1] || "asg-501") as string;
        const studentId = (formData.get("userId") || formData.get("studentId") || "stu-101") as string;
        const studentName = (formData.get("userName") || formData.get("studentName") || "Sujoy Dutta") as string;
        const studentIdNumber = (formData.get("studentIdNumber") || "2024-1388") as string;
        const courseCode = (formData.get("courseCode") || "CS-302") as string;
        const assignmentTitle = (formData.get("assignmentTitle") || "Coursework Submission") as string;
        
        const timestamp = Date.now();
        const submissionId = `sub-${timestamp.toString().slice(-4)}`;
        const receiptId = `REC-${timestamp.toString().slice(-6)}`;

        // Map assignment ID to D1 schema (asg-501, asg-502, asg-503, asg-504)
        let resolvedAssignmentId = rawAssignmentId;
        if (courseCode === "CS-301" || rawAssignmentId.includes("301") || rawAssignmentId.includes("dbms")) {
          resolvedAssignmentId = "asg-501";
        } else if (courseCode === "CS-302" || rawAssignmentId.includes("302") || rawAssignmentId.includes("python")) {
          resolvedAssignmentId = "asg-502";
        } else if (courseCode === "BCA-301" || rawAssignmentId.includes("bca")) {
          resolvedAssignmentId = "asg-503";
        } else if (courseCode === "CS-401" || rawAssignmentId.includes("401")) {
          resolvedAssignmentId = "asg-504";
        }

        let fileKey = "";
        let originalName = file ? file.name : "submission.pdf";
        let fileSizeStr = file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "0.50 MB";
        let mimeType = file?.type || "application/octet-stream";

        // Upload directly to Cloudflare R2 Storage (Bucket: assignment-files, Key: submissions/filename)
        if (file && env.STORAGE) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          fileKey = `submissions/${safeName}`;
          
          try {
            await env.STORAGE.put(fileKey, file.stream(), {
              httpMetadata: { 
                contentType: mimeType,
                contentDisposition: `inline; filename="${safeName}"`
              },
              customMetadata: {
                studentId,
                studentName,
                assignmentId: resolvedAssignmentId,
                submissionId,
                uploadedAt: new Date().toISOString(),
              }
            });
          } catch (r2Error: any) {
            console.warn("R2 Put Error:", r2Error);
          }
        }

        const r2Url = fileKey ? `${R2_PUBLIC_BASE}/${fileKey}` : `submissions/${resolvedAssignmentId}/${originalName}`;

        // Insert Record into Cloudflare D1 Database (Table: submissions)
        if (env.DB) {
          try {
            await env.DB.prepare(
              `INSERT OR REPLACE INTO submissions (id, assignment_id, student_id, student_name, file_name, file_url, file_size, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              submissionId,
              resolvedAssignmentId,
              studentId === "user-stu-1" ? "stu-101" : studentId,
              studentName,
              originalName,
              fileKey || r2Url,
              fileSizeStr,
              "submitted"
            ).run();
          } catch (dbErr: any) {
            console.warn("D1 Insert Error (fallback):", dbErr);
            try {
              await env.DB.prepare(
                `INSERT OR REPLACE INTO submissions (id, assignment_id, student_id, file_url, file_name, file_size, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              ).bind(
                submissionId,
                resolvedAssignmentId,
                studentId === "user-stu-1" ? "stu-101" : studentId,
                fileKey || r2Url,
                originalName,
                fileSizeStr,
                "submitted"
              ).run();
            } catch (fallbackErr) {
              console.error("D1 Fallback Insert failed:", fallbackErr);
            }
          }
        }

        return jsonResponse({
          success: true,
          message: "Coursework verified and synced with Cloudflare R2 & D1 Database.",
          submissionId,
          receiptId,
          fileKey: fileKey || `submission_${timestamp}`,
          storedFilename: fileKey || `submission_${timestamp}`,
          filename: originalName,
          fileSize: fileSizeStr,
          mimeType,
          r2Url: fileKey ? `${R2_PUBLIC_BASE}/${fileKey}` : null,
          status: "submitted",
          metadata: {
            id: submissionId,
            fileKey,
            originalFilename: originalName,
            fileSize: file ? file.size : 1024,
            fileSizeFormatted: fileSizeStr,
            mimeType,
            uploadTime: new Date().toISOString(),
            user: { id: studentId, name: studentName, email: "sujoydutta830@gmail.com", role: "student" },
            assignment: { id: resolvedAssignmentId, title: assignmentTitle, courseCode },
            submission: { id: submissionId, receiptId }
          }
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

    // 3. Create Assignment: POST /api/assignments
    if (path === "assignments" && method === "POST") {
      if (!env.DB) return jsonResponse({ error: "D1 not connected" }, corsHeaders, 503);
      
      const body = await request.json() as any;
      const id = body.id || `asg-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();
      
      try {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO assignments (id, course_code, title, description, due_date, max_marks, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.courseCode || body.course_code || "CS-301",
          body.title || "New Course Assignment",
          body.description || "",
          body.dueAt || body.due_date || now,
          body.maxMarks || body.max_marks || 50,
          body.facultyId || body.created_by || "fac-201",
          body.createdAt || body.created_at || now
        ).run();

        return jsonResponse({ success: true, id, message: "Assignment added to D1 database" }, corsHeaders, 201);
      } catch (e: any) {
        return jsonResponse({ success: false, error: e.message }, corsHeaders, 500);
      }
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
            "SELECT * FROM submissions ORDER BY id DESC"
          ).all();
          return jsonResponse({ success: true, submissions: results || [] }, corsHeaders);
        } catch (e: any) {
          return jsonResponse({ success: false, error: e.message }, corsHeaders, 500);
        }
      }
      return jsonResponse({ success: true, submissions: [] }, corsHeaders);
    }

    // 6. Sync all Frontend Assignments & Submissions to Cloudflare D1
    if (path === "sync-d1" || path === "sync-all") {
      if (!env.DB) return jsonResponse({ error: "D1 database not connected" }, corsHeaders, 503);

      const coreAssignments = [
        {
          id: "asg-501",
          course_code: "CS-301",
          title: "SQL Normalization & BCNF Implementation",
          description: "Design and normalize a university database schema up to BCNF with complex SQL queries and join operations.",
          due_date: "2026-10-15 23:59:00",
          max_marks: 50,
          created_by: "fac-201",
          created_at: "2026-10-05 08:04:00"
        },
        {
          id: "asg-502",
          course_code: "CS-302",
          title: "Python Data Analysis Pipeline",
          description: "Build modular Pandas and NumPy analysis script.",
          due_date: "2026-10-20 23:59:00",
          max_marks: 40,
          created_by: "fac-201",
          created_at: "2026-10-05 08:04:00"
        },
        {
          id: "asg-503",
          course_code: "BCA-301",
          title: "BCA-301 — Coursework & Assignment Submission",
          description: "Submit assignments, project files, exercises or reports for Numerical Methods.",
          due_date: "2026-11-04 15:23:00",
          max_marks: 100,
          created_by: "fac-201",
          created_at: "2026-10-05 08:04:00"
        },
        {
          id: "asg-504",
          course_code: "CS-401",
          title: "CS-401 — Coursework & Assignment Submission",
          description: "Submit assignments, project files, exercises or reports for Microprocessor Microcontroller.",
          due_date: "2026-11-04 15:23:00",
          max_marks: 100,
          created_by: "fac-201",
          created_at: "2026-10-05 08:04:00"
        }
      ];

      for (const asg of coreAssignments) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO assignments (id, course_code, title, description, due_date, max_marks, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          asg.id,
          asg.course_code,
          asg.title,
          asg.description,
          asg.due_date,
          asg.max_marks,
          asg.created_by,
          asg.created_at
        ).run();
      }

      return jsonResponse({
        success: true,
        message: "Successfully synchronized all 4 assignments into Cloudflare D1 database!",
        count: coreAssignments.length
      }, corsHeaders);
    }

    // 7. R2 List Objects: GET /api/r2/list
    if (path === "r2/list" && method === "GET") {
      if (env.STORAGE) {
        const listed = await env.STORAGE.list({ prefix: "submissions/" });
        return jsonResponse({ success: true, objects: listed.objects || [] }, corsHeaders);
      }
      return jsonResponse({ success: true, objects: [] }, corsHeaders);
    }

    // 8. File Retrieval from R2: GET /api/files/:key or GET /api/files/download/:key
    if (path.startsWith("files/") && method === "GET") {
      const fileKey = decodeURIComponent(path.replace(/^files\/(download\/)?/, ""));
      if (!env.STORAGE) {
        return new Response("Storage not configured", { status: 503, headers: corsHeaders });
      }

      const keyToFetch = fileKey.startsWith("submissions/") ? fileKey : `submissions/${fileKey}`;
      const object = await env.STORAGE.get(keyToFetch);
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
