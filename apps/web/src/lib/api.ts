import axios, { isAxiosError, type AxiosError, type AxiosResponse } from "axios";
import { useAuthStore } from "@/store/authStore";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const t = useAuthStore.getState().token;
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const cfg = err.config;
    const path = `${cfg?.baseURL ?? ""}${cfg?.url ?? ""}`;
    const isLoginRequest = /\b\/auth\/login\b/.test(path) || String(cfg?.url ?? "").includes("/auth/login");

    if (err.response?.status === 401 && typeof window !== "undefined" && !isLoginRequest) {
      const auth = useAuthStore.getState();
      // During initial app boot, protected queries can run before auth hydrate completes.
      // Avoid false logout/redirect loops from these transient 401s.
      if (!auth.hydrated && !auth.token) {
        return Promise.reject(err);
      }
      auth.logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

const GENERIC = "Something went wrong. Please try again.";

type ApiErrorBodyShape = {
  error?: unknown;
  message?: unknown;
  errors?: unknown;
};

function flattenFieldErrors(fields: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(fields)) {
    const msgs = Array.isArray(raw) ? raw.map(String) : raw != null ? [String(raw)] : [];
    const readable = msgs.map((x) => x.trim()).filter(Boolean);
    if (readable.length === 0) continue;
    const label = humanizeFieldKey(key);
    parts.push(`${label}: ${readable.join(", ")}`);
  }
  return parts.length ? parts.join(". ") : null;
}

function humanizeFieldKey(key: string): string {
  const known: Record<string, string> = {
    email: "Email",
    password: "Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    academicYearId: "Academic year",
    teacherId: "Teacher",
    classId: "Class",
    subjectId: "Subject",
    termId: "Term",
    classSubjectIds: "Assignments",
    code: "Code",
  };
  if (known[key]) return known[key];
  const spaced = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).trim();
}

function parseNestErrors(errors: Record<string, unknown>): string | null {
  const formErrors = errors["formErrors"];
  if (Array.isArray(formErrors)) {
    const fe: string[] = [];
    for (const item of formErrors) {
      if (typeof item === "string") {
        const t = item.trim();
        if (t) fe.push(t);
      }
    }
    if (fe.length) return fe.join(". ");
  }
  const fieldErrors = errors["fieldErrors"];
  if (fieldErrors && typeof fieldErrors === "object" && fieldErrors !== null) {
    return flattenFieldErrors(fieldErrors as Record<string, unknown>);
  }
  return null;
}

/** Readable message for JSON error bodies returned by Express (and similar). */
export function messageFromApiBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as ApiErrorBodyShape;
  if (typeof o.error === "string" && o.error.trim()) return o.error.trim();
  if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
  if (o.errors && typeof o.errors === "object" && o.errors !== null) {
    return parseNestErrors(o.errors as Record<string, unknown>);
  }
  return null;
}

/** Turn axios/fetch/network failures into a message suitable for alerts and forms. */
export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) return axiosFailureToMessage(err);
  if (err instanceof Error && err.message.trim()) return err.message;
  return GENERIC;
}

function axiosFailureToMessage(err: AxiosError<unknown>): string {
  const fromBody = messageFromApiBody(err.response?.data);
  if (fromBody) return fromBody;

  const status = err.response?.status;
  const raw = err.response?.data;

  if (!err.response) {
    if (err.code === "ECONNABORTED") return "The request took too long. Please try again.";
    if (err.code === "ERR_NETWORK") {
      return "We couldn't reach the server. Check your internet connection, or try again in a moment.";
    }
    return "We couldn't reach the server. Please try again.";
  }

  if (typeof raw === "string" && raw.trim()) return raw.trim();

  if (status === 401) {
    return "You need to sign in to continue, or your session has expired.";
  }
  if (status === 403) {
    return "You don't have permission to do that. Ask an administrator if you need access.";
  }
  if (status === 404) {
    return "We couldn't find what you're looking for. It may have been removed or the link is wrong.";
  }
  if (status === 409) {
    return "That can't be done because it conflicts with existing data. Refresh the page and try again.";
  }
  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (status != null && status >= 500) {
    return "Something went wrong on our side. Please try again in a few minutes.";
  }
  if (status != null && status >= 400) {
    return "We couldn't complete that action. Check your information and try again.";
  }

  return GENERIC;
}

async function parseEnvelope<T>(run: () => Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  try {
    const { data } = await run();
    if (!data.success) {
      const msg =
        typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : "We couldn't complete that request.";
      throw new Error(msg);
    }
    return data.data as T;
  } catch (e) {
    if (axios.isCancel(e)) throw e;
    if (isAxiosError(e)) {
      throw new Error(getApiErrorMessage(e));
    }
    if (e instanceof Error) throw e;
    throw new Error(GENERIC);
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  return parseEnvelope(() => api.get<ApiEnvelope<T>>(url));
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return parseEnvelope(() => api.post<ApiEnvelope<T>>(url, body));
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return parseEnvelope(() => api.patch<ApiEnvelope<T>>(url, body));
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  return parseEnvelope(() => api.put<ApiEnvelope<T>>(url, body));
}

export async function apiDelete<T>(url: string): Promise<T> {
  return parseEnvelope(() => api.delete<ApiEnvelope<T>>(url));
}

export async function apiGetBlob(url: string): Promise<Blob> {
  try {
    const res = await api.get(url, { responseType: "blob" });
    const ct = String(res.headers["content-type"] ?? "");
    if (ct.includes("application/json")) {
      const text = await (res.data as Blob).text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        throw new Error("We couldn't download that file. Please try again.");
      }
      const msg = messageFromApiBody(parsed);
      throw new Error(msg ?? "We couldn't download that file. Please try again.");
    }
    return res.data as Blob;
  } catch (e) {
    if (isAxiosError(e)) {
      throw new Error(getApiErrorMessage(e));
    }
    if (e instanceof Error) throw e;
    throw new Error(GENERIC);
  }
}
