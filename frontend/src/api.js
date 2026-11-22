// =============================================================
// API client — mirrors the FastAPI backend contract exactly.
//
//   POST   /api/chat/new                 -> { chat_id }
//   GET    /api/chat/history             -> [{ chat_id, title, created_at, updated_at }]
//   GET    /api/chat/{id}                -> { chat_id, title, messages[], created_at, updated_at }
//   POST   /api/chat/{id}/message        -> { chat_id, user_message, ai_response }
//   DELETE /api/chat/{id}                -> { message }
//
//   POST   /api/resume/upload  (file)    -> { resume_id, filename, analysis }
//   GET    /api/resume/history           -> [{ resume_id, filename, created_at }]
//   GET    /api/resume/{id}              -> { resume_id, filename, analysis, created_at }
//   DELETE /api/resume/{id}              -> { message }
//
//   GET    /health/database              -> { status: "success" | "error" }
//
// In dev the Vite proxy forwards these to the backend. For a deployed
// build set VITE_API_URL (e.g. https://api.example.com).
// =============================================================

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// FastAPI returns { detail: "..." } or, for validation errors,
// { detail: [{ msg, ... }] }. Turn either into a readable sentence.
function readDetail(data, status) {
  const detail = data?.detail ?? data?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (status === 0) return "Can't reach the server. Is the backend running?";
  return `Something went wrong (error ${status}).`;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new ApiError(readDetail(null, 0), 0);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(readDetail(data, response.status), response.status);
  }
  return data;
}

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const chatApi = {
  create: () => request("/api/chat/new", { method: "POST" }),
  history: () => request("/api/chat/history"),
  get: (id) => request(`/api/chat/${encodeURIComponent(id)}`),
  send: (id, message) =>
    request(`/api/chat/${encodeURIComponent(id)}/message`, json("POST", { message })),
  remove: (id) =>
    request(`/api/chat/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const resumeApi = {
  history: () => request("/api/resume/history"),
  get: (id) => request(`/api/resume/${encodeURIComponent(id)}`),
  remove: (id) =>
    request(`/api/resume/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // XMLHttpRequest (not fetch) so we can report real upload progress.
  // `onProgress(0..1)` fires while bytes are sent; `onUploaded()` fires once
  // the file has fully arrived and the server is busy analysing it.
  upload: (file, { onProgress, onUploaded } = {}) =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/api/resume/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.upload.onload = () => onUploaded?.();

      xhr.onerror = () => reject(new ApiError(readDetail(null, 0), 0));
      xhr.onload = () => {
        let data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = null;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(readDetail(data, xhr.status), xhr.status));
      };

      xhr.send(form);
    }),
};

export const healthApi = {
  database: async () => {
    const data = await request("/health/database");
    return data?.status === "success";
  },
};
