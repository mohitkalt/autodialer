/**
 * Extracts a human-readable message from RTK Query / fetch errors that expose
 * `{ data: { message } }` (Next.js API routes forwarding upstream JSON).
 */
export function getRtkErrorMessage(error: unknown): string {
  return String((error as { data?: { message?: string } })?.data?.message ?? "").trim();
}
