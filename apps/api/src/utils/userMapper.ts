import type { UserPublic } from "@uganda-cbc-sms/shared";
import type { QueryResultRow } from "pg";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  photo_url?: string | null;
};

export function toUserPublic(row: UserRow | QueryResultRow): UserPublic {
  const r = row as UserRow;
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    role: r.role as UserPublic["role"],
    isActive: r.is_active,
    photoUrl: r.photo_url ?? null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
  };
}
