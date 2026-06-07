// Resolves API paths to the Lovable backend when VITE_API_BASE_URL is set
// (e.g. on Vercel), or leaves them relative when running on Lovable itself.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}
