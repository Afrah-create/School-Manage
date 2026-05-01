import type { Role } from "@uganda-cbc-sms/shared";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; sessionId: string };
    }
  }
}

export {};
