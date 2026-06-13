import type { Role } from "@uganda-cbc-sms/shared";
import { create } from "zustand";
import {
  deleteSmsTokenCookie,
  getSmsTokenFromCookie,
  setSmsTokenCookie,
} from "@/lib/cookies";
import { jwtCookieMaxAge } from "@/lib/jwtPayload";
import { getApiTenantSlug } from "@/lib/tenantHost";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  photoUrl?: string | null;
  tenantId?: string;
  tenantSlug?: string;
  forcePasswordChange?: boolean;
};

export type SessionInfo = {
  inactivityMinutes: number;
  idleExpiresAt: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  /** Unix ms — local idle deadline (synced from API headers when available). */
  idleExpiresAt: number | null;
  login: (
    user: AuthUser,
    token: string,
    session?: SessionInfo,
    tenant?: { id: string; slug: string },
  ) => void;
  logout: () => void;
  logoutRemote: () => Promise<void>;
  hydrate: () => Promise<void>;
  setToken: (token: string | null) => void;
  setIdleExpiresAt: (unixMs: number) => void;
  bumpIdleExpiry: (inactivityMs: number) => void;
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
      forcePasswordChange: Boolean(o.forcePasswordChange),
    };
  }
  return null;
}

function idleDeadlineFromSession(session?: SessionInfo): number | null {
  if (!session?.idleExpiresAt) return null;
  const ms = Date.parse(session.idleExpiresAt);
  return Number.isFinite(ms) ? ms : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  tenantId: null,
  tenantSlug: null,
  isAuthenticated: false,
  hydrated: false,
  idleExpiresAt: null,

  hasRole: (role) => {
    const u = get().user;
    if (!u) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(u.role);
  },

  setToken: (token) => {
    if (token) {
      const maxAge = jwtCookieMaxAge(token);
      setSmsTokenCookie(token, maxAge);
    } else {
      deleteSmsTokenCookie();
    }
    set({ token });
  },

  updateUser: (patch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : null,
    })),

  setIdleExpiresAt: (unixMs) => set({ idleExpiresAt: unixMs }),

  bumpIdleExpiry: (inactivityMs) =>
    set({ idleExpiresAt: Date.now() + inactivityMs }),

  login: (user, token, session, tenant) => {
    const maxAge = jwtCookieMaxAge(token);
    setSmsTokenCookie(token, maxAge);
    const enriched: AuthUser = {
      ...user,
      tenantId: tenant?.id ?? user.tenantId,
      tenantSlug: tenant?.slug ?? user.tenantSlug,
    };
    set({
      user: enriched,
      token,
      tenantId: tenant?.id ?? null,
      tenantSlug: tenant?.slug ?? null,
      isAuthenticated: true,
      hydrated: true,
      idleExpiresAt: idleDeadlineFromSession(session) ?? Date.now() + 15 * 60_000,
    });
  },

  logout: () => {
    deleteSmsTokenCookie();
    set({
      user: null,
      token: null,
      tenantId: null,
      tenantSlug: null,
      isAuthenticated: false,
      hydrated: true,
      idleExpiresAt: null,
    });
  },

  logoutRemote: async () => {
    const token = get().token;
    if (token) {
      try {
        await fetch(`${baseUrl.replace(/\/$/, "")}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* best-effort */
      }
    }
    get().logout();
  },

  hydrate: async () => {
    const token = getSmsTokenFromCookie();
    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        hydrated: true,
        idleExpiresAt: null,
      });
      return;
    }

    set({ token });

    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Slug": getApiTenantSlug(token),
        },
      });
      if (!res.ok) {
        deleteSmsTokenCookie();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          hydrated: true,
          idleExpiresAt: null,
        });
        return;
      }
      const idleHeader = res.headers.get("x-session-idle-expires-at");
      const idleUnix = idleHeader ? Number(idleHeader) : NaN;
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
          idleExpiresAt: null,
        });
        return;
      }
      set({
        token,
        user,
        isAuthenticated: true,
        hydrated: true,
        idleExpiresAt: Number.isFinite(idleUnix) ? idleUnix * 1000 : Date.now() + 15 * 60_000,
      });
    } catch {
      deleteSmsTokenCookie();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        hydrated: true,
        idleExpiresAt: null,
      });
    }
  },
}));
