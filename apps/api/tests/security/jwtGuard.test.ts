import express from "express";
import request from "supertest";
import { requireAuth } from "../../src/middleware/jwtGuard.js";

describe("requireAuth", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const app = express();
    app.get("/protected", requireAuth, (_req, res) => {
      res.json({ ok: true });
    });
    const res = await request(app).get("/protected").expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for malformed bearer token", async () => {
    const app = express();
    app.get("/protected", requireAuth, (_req, res) => {
      res.json({ ok: true });
    });
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer not-a-valid-jwt")
      .expect(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });
});
