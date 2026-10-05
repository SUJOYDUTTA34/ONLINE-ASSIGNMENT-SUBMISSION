// Cloudflare Pages Functions API Handler with D1 Database & R2 Storage
// Handles /api/* endpoints when deployed on Cloudflare Pages / Workers

interface Env {
  DB?: any; // Cloudflare D1 Database binding
  STORAGE?: any; // Cloudflare R2 Storage binding
}

export async function onRequest(context: { request: Request; env: Env; params: { route?: string[] } }) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const method = request.method.toUpperCase();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Health check
    if (path === "health" || path === "") {
      return jsonResponse({
        status: "ok",
        message: "Cloudflare API online",
        hasD1: !!env.DB,
        hasR2: !!env.STORAGE,
        timestamp: new Date().toISOString()
      }, corsHeaders);
    }

    // 1. Assignments list (GET /api/assignments)
    if (path === "assignments" && method === "GET") {
      if (env.DB) {
        const { results } = await env.DB.prepare(
          "SELECT * FROM assignments ORDER BY due_date ASC"
        ).all();
        return jsonResponse(results || [], corsHeaders);
      }
      return jsonResponse({ message: "D1 database not configured" }, corsHeaders, 503);
    }

    // 2. Create Assignment (POST /api/assignments)
    if (path === "assignments" && method === "POST") {
      if (!env.DB) return jsonResponse({ error: "D1 not connected" }, corsHeaders, 503);
      
      const body = await request.json() as any;
      const id = body.id || crypto.randomUUID();
      
      await env.DB.prepare(
        `INSERT INTO assignments (id, course_id, title, description, due_date, max_marks, attachment_url, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        body.course_id || "general",
        body.title,
        body.description || "",
        body.due_date,
        body.max_marks || 100,
        body.attachment_url || null,
        body.created_by || "faculty"
      ).run();

      return jsonResponse({ success: true, id }, corsHeaders, 201);
    }

    // 3. Submissions (POST /api/submissions) - Upload PDF to R2 + Record in D1
    if (path === "submissions" && method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      
      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const assignmentId = formData.get("assignmentId") as string;
        const studentId = formData.get("studentId") as string;
        const submissionId = crypto.randomUUID();

        let fileKey = "";
        if (file && env.STORAGE) {
          fileKey = `submissions/${submissionId}-${file.name}`;
          await env.STORAGE.put(fileKey, file.stream(), {
            httpMetadata: { contentType: file.type || "application/octet-stream" },
          });
        }

        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO submissions (id, assignment_id, student_id, file_url, file_name, file_size, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
          ).bind(
            submissionId,
            assignmentId,
            studentId,
            fileKey || "direct_text_submission",
            file ? file.name : "text_submission.txt",
            file ? file.size : 0
          ).run();
        }

        return jsonResponse({ success: true, submissionId, fileKey }, corsHeaders, 201);
      }
    }

    // 4. File Retrieval from R2 (GET /api/files/:key)
    if (path.startsWith("files/") && method === "GET") {
      const fileKey = decodeURIComponent(path.replace("files/", ""));
      if (!env.STORAGE) {
        return new Response("Storage not configured", { status: 503, headers: corsHeaders });
      }

      const object = await env.STORAGE.get(fileKey);
      if (!object) {
        return new Response("File not found", { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      return new Response(object.body, { headers });
    }

    // Default fallback
    return jsonResponse({ error: "Endpoint not found", path }, corsHeaders, 404);

  } catch (error: any) {
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
