import { signToken, verifyToken } from "../../src/utils/jwt.js";

describe("JWT RS256", () => {
  it("signs and verifies tokens with jti and session id", () => {
    const token = signToken("user-uuid", "admin", "session-uuid");
    const payload = verifyToken(token);
    expect(payload.sub).toBe("user-uuid");
    expect(payload.role).toBe("admin");
    expect(payload.sid).toBe("session-uuid");
    expect(payload.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("rejects tampered tokens", () => {
    const token = signToken("user-uuid", "teacher", "session-uuid");
    const bad = `${token.slice(0, -4)}xxxx`;
    expect(() => verifyToken(bad)).toThrow();
  });
});
