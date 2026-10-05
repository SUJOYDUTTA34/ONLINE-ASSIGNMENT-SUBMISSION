import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 Credentials & Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "5fb0fecd021df22c60e523bcc6909ecb";
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "a95cfc2b0e0f5b800dd1f1e68e7ca405";
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "e2746dcb7bb0608b8b1aaa7c73f5f7aad78bef56a30da3840c1df288977c7a38";
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "assignment-files";
const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://pub-8557046cca48459d9643063d35d0e38c.r2.dev").replace(/\/$/, "");

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface R2UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  etag?: string;
  error?: string;
}

/**
 * Uploads a buffer directly to Cloudflare R2 bucket.
 * Supports custom folders: 'submissions', 'assignments', 'materials'
 */
export async function uploadToCloudflareR2(
  buffer: Buffer,
  filename: string,
  contentType: string = "application/octet-stream",
  folder: string = "submissions"
): Promise<R2UploadResult> {
  try {
    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const cleanFolder = folder.replace(/\/+$/, "").replace(/^\/+/, "");
    const key = cleanFolder ? `${cleanFolder}/${safeName}` : safeName;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    const response = await r2Client.send(command);
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    console.log(`[Cloudflare R2] Successfully uploaded: ${key} -> ${publicUrl}`);

    return {
      success: true,
      key,
      url: publicUrl,
      etag: response.ETag,
    };
  } catch (err: any) {
    console.error("[Cloudflare R2] Upload error:", err);
    return {
      success: false,
      error: err?.message || "Failed to upload to Cloudflare R2",
    };
  }
}

/**
 * Lists objects from the Cloudflare R2 bucket with optional prefix
 */
export async function listCloudflareR2Objects(prefix: string = ""): Promise<any[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
    });
    const response = await r2Client.send(command);
    return (response.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `${R2_PUBLIC_URL}/${obj.Key}`,
    }));
  } catch (err) {
    console.error("[Cloudflare R2] List error:", err);
    return [];
  }
}

/**
 * Deletes an object from Cloudflare R2 bucket
 */
export async function deleteFromCloudflareR2(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    console.log(`[Cloudflare R2] Deleted object: ${key}`);
    return true;
  } catch (err) {
    console.error(`[Cloudflare R2] Failed to delete ${key}:`, err);
    return false;
  }
}

export { R2_PUBLIC_URL, R2_BUCKET_NAME };
