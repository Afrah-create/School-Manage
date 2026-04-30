/** Client-side cookie helpers (readable by middleware when not httpOnly). */

const SMS_TOKEN = "sms_token";

export function setCookie(name: string, value: string, maxAgeSec?: number): void {
  if (typeof document === "undefined") return;
  let s = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
  if (maxAgeSec !== undefined && maxAgeSec > 0) {
    s += `; max-age=${Math.floor(maxAgeSec)}`;
  }
  document.cookie = s;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const encoded = encodeURIComponent(name);
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(`${encoded}=`)) {
      return decodeURIComponent(part.slice(encoded.length + 1));
    }
  }
  return null;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

export function getSmsTokenFromCookie(): string | null {
  return getCookie(SMS_TOKEN);
}

export function setSmsTokenCookie(token: string, maxAgeSec?: number): void {
  setCookie(SMS_TOKEN, token, maxAgeSec);
}

export function deleteSmsTokenCookie(): void {
  deleteCookie(SMS_TOKEN);
}

export { jwtCookieMaxAge } from "./jwtPayload";
