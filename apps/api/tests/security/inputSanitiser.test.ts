import express from "express";
import request from "supertest";
import { globalInputSanitiser } from "../../src/middleware/inputSanitiser.js";

function testApp() {
  const app = express();
  app.use(express.json());
  app.use(globalInputSanitiser);
  app.post("/echo", (req, res) => {
    res.json({ body: req.body });
  });
  return app;
}

describe("globalInputSanitiser", () => {
  it("strips script tags from string fields", async () => {
    const app = testApp();
    const res = await request(app)
      .post("/echo")
      .send({ name: '<script>alert("x")</script>Alice' })
      .expect(200);
    expect(res.body.body.name).not.toContain("<script>");
    expect(String(res.body.body.name)).toContain("Alice");
  });

  it("does not modify password fields", async () => {
    const app = testApp();
    const password = "p@ss<script>word";
    const res = await request(app).post("/echo").send({ password }).expect(200);
    expect(res.body.body.password).toBe(password);
  });
});
