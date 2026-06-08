/**
 * uploadMedia — direct-to-S3 upload via presigned URL.
 * The browser PUT the file straight to Supabase; the Render server only
 * handles a tiny JSON request to generate the presigned URL.
 * Falls back to the legacy server-proxy endpoint if presigned URL fails.
 */
import axiosClient from "../api/axiosClient";

export async function uploadMedia(file) {
  // 1. Ask backend for a presigned PUT URL
  let presignedData;
  try {
    const r = await axiosClient.post("/branches/presigned-upload/", {
      filename: file.name,
      content_type: file.type || "application/octet-stream",
    });
    presignedData = r.data;
  } catch {
    presignedData = null;
  }

  if (presignedData?.presigned_url) {
    // 2. Upload directly from browser to Supabase — bypasses Render server
    const res = await fetch(presignedData.presigned_url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    return presignedData.public_url;
  }

  // Fallback: legacy server-proxy upload (small files only)
  const fd = new FormData();
  fd.append("file", file);
  const r = await axiosClient.post("/branches/upload-media/", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!r.data?.url) throw new Error(r.data?.error || "Upload failed.");
  return r.data.url;
}
