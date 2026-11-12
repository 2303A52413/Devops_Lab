const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "endpoints-test-secret-key-1234567890";
const app = require("../server");

describe("API Endpoints & Integration Suite", () => {
  const adminToken = jwt.sign(
    { id: "507f1f77bcf86cd799439011", name: "Admin User", email: "admin@sru.edu", role: "Admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const studentToken = jwt.sign(
    { id: "507f1f77bcf86cd799439022", name: "Student User", email: "student@sru.edu", role: "Student" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  test("GET /api/health returns 200 and success message", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Backend is working");
  });

  test("POST /api/auth/login rejects request without email or password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "" });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /email and password are required/i);
  });

  test("POST /api/auth/register validates required fields and password length", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Alice", email: "alice@sru.edu", password: "123" });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /at least 8 characters/i);
  });

  test("Protected routes reject requests without Authorization token", async () => {
    const res = await request(app).get("/api/announcements");
    assert.equal(res.status, 401);
    assert.match(res.body.message, /authentication is required/i);
  });

  test("Student cannot access Admin-only /api/users endpoint", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${studentToken}`);
    assert.equal(res.status, 403);
    assert.match(res.body.message, /permission/i);
  });

  test("Student cannot create announcements", async () => {
    const res = await request(app)
      .post("/api/announcements")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        title: "Unauthorized Notice",
        description: "Should fail",
        category: "General",
        department: "CSE",
        date: new Date(),
        expiryDate: new Date(Date.now() + 86400000),
      });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /permission/i);
  });

  test("Student cannot create categories", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "New Category" });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /permission/i);
  });
});
