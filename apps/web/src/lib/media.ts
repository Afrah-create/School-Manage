/** Resolve API-relative upload paths to a browser-loadable URL. */
export function resolveUploadUrl(relativeUrl: string | null | undefined): string | null {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith("http")) return relativeUrl;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
}
