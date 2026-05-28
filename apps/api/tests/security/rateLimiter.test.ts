import express from "express";
import rateLimit from "express-rate-limit";
import request from "supertest";

describe("rate limit response shape", () => {
  it("returns standardized JSON when limit exceeded", async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.post(
      "/login",
      rateLimit({
        windowMs: 60_000,
        limit: 3,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          error: "Too many login attempts. Account may be locked.",
          code: "RATE_LIMITED",
        },
      }),
      (_req, res) => {
        res.json({ success: true });
      },
    );

    let lastStatus = 200;
    let lastBody: { success?: boolean; error?: string; code?: string } = {};
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post("/login").send({});
      lastStatus = res.status;
      lastBody = res.body;
      if (res.status === 429) break;
    }

    expect(lastStatus).toBe(429);
    expect(lastBody.success).toBe(false);
    expect(lastBody.code).toBe("RATE_LIMITED");
    expect(typeof lastBody.error).toBe("string");
  });
});
