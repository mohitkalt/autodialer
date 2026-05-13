/**
 * Extracts a human-readable message from RTK Query `fetchBaseQuery` errors.
 * Handles bodies forwarded by Next route handlers: `{ message }`, FastAPI `{ detail }`,
 * and `{ error }`; validation arrays on `detail` pick nested `msg` when present.
 */
function messageFromApiData(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data.trim();
  if (typeof data !== "object") return "";

  const o = data as Record<string, unknown>;

  const message = o.message;
  if (typeof message === "string" && message.trim()) return message.trim();

  const detail = o.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const msg = row.msg;
        if (typeof msg === "string" && msg.trim()) return msg.trim();
      }
      return "";
    });
    const joined = parts.filter(Boolean).join("; ").trim();
    if (joined) return joined;
  }

  const err = o.error;
  if (typeof err === "string" && err.trim()) return err.trim();

  return "";
}

export function getRtkErrorMessage(error: unknown): string {
  if (error != null && typeof error === "object") {
    const e = error as { data?: unknown; error?: string; message?: string };
    const fromData = messageFromApiData(e.data);
    if (fromData) return fromData;
    if (typeof e.error === "string" && e.error.trim()) return e.error.trim();
    if (typeof e.message === "string" && e.message.trim()) return e.message.trim();
  }
  return "";
}
