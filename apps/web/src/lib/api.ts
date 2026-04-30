import axios from "axios";
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
    if (err.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

export async function apiGet<T>(url: string): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url);
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data as T;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ApiEnvelope<T>>(url, body);
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data as T;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiEnvelope<T>>(url, body);
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await api.delete<ApiEnvelope<T>>(url);
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data as T;
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const res = await api.get(url, { responseType: "blob" });
  const ct = String(res.headers["content-type"] ?? "");
  if (ct.includes("application/json")) {
    const text = await (res.data as Blob).text();
    const j = JSON.parse(text) as { error?: string };
    throw new Error(j.error ?? "Request failed");
  }
  return res.data as Blob;
}
