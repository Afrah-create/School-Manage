import type { Role } from "@uganda-cbc-sms/shared";
import { create } from "zustand";
import {
  deleteSmsTokenCookie,
  getSmsTokenFromCookie,
  setSmsTokenCookie,
} from "@/lib/cookies";
import { jwtCookieMaxAge } from "@/lib/jwtPayload";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  photoUrl?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
  setToken: (token: string | null) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  hasRole: (role: Role | Role[]) => boolean;
};

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

function parseUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const role = o.role as string | undefined;
  if (
    typeof o.id === "string" &&
    typeof o.email === "string" &&
    typeof o.fullName === "string" &&
    typeof role === "string"
  ) {
    return {
      id: o.id,
      fullName: o.fullName,
      email: o.email,
      role: role as Role,
      photoUrl: typeof o.photoUrl === "string" ? o.photoUrl : null,
    };
  }
  return null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,

  hasRole: (role) => {
    const u = get().user;
    if (!u) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(u.role);
  },

  setToken: (token) => set({ token }),

  updateUser: (patch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : null,
    })),

  login: (user, token) => {
    const maxAge = jwtCookieMaxAge(token);
    setSmsTokenCookie(token, maxAge);
    set({
      user,
      token,
      isAuthenticated: true,
      hydrated: true,
    });
  },

  logout: () => {
    deleteSmsTokenCookie();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      hydrated: true,
    });
  },

  hydrate: async () => {
    const token = getSmsTokenFromCookie();
    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        hydrated: true,
      });
      return;
    }

    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        deleteSmsTokenCookie();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          hydrated: true,
        });
        return;
      }
      const envelope = (await res.json()) as {
        success?: boolean;
        data?: unknown;
      };
      const user = parseUser(envelope.data);
      if (!user || envelope.success === false) {
        deleteSmsTokenCookie();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          hydrated: true,
        });
        return;
      }
      set({
        token,
        user,
        isAuthenticated: true,
        hydrated: true,
      });
    } catch {
      deleteSmsTokenCookie();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        hydrated: true,
      });
    }
  },
}));
