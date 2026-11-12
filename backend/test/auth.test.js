const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticate, requireRole } = require("../middleware/auth");

describe("Authentication & Security Suite", () => {
  const secret = "test-secret-key-12345678901234567890";
  process.env.JWT_SECRET = secret;

  test("Bcrypt password hashing and verification", async () => {
    const rawPassword = "SecurePassword@2026";
    const hash = await bcrypt.hash(rawPassword, 10);
    assert.notEqual(rawPassword, hash);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.equal(isMatch, true);

    const isWrongMatch = await bcrypt.compare("WrongPassword", hash);
    assert.equal(isWrongMatch, false);
  });

  test("JWT signing and verification", () => {
    const payload = { id: "user123", email: "student@sru.edu", role: "Student" };
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    assert.ok(token);

    const decoded = jwt.verify(token, secret);
    assert.equal(decoded.id, "user123");
    assert.equal(decoded.email, "student@sru.edu");
    assert.equal(decoded.role, "Student");
  });

  test("Authenticate middleware validates Bearer token", () => {
    const payload = { id: "user456", email: "faculty@sru.edu", role: "Faculty" };
    const token = jwt.sign(payload, secret);

    const req = {
      get: (header) => (header.toLowerCase() === "authorization" ? `Bearer ${token}` : null),
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    authenticate(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, "user456");
    assert.equal(req.user.role, "Faculty");
  });

  test("Authenticate middleware rejects missing token", () => {
    const req = { get: () => null };
    let statusSet = null;
    let jsonSent = null;
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    authenticate(req, res, next);
    assert.equal(nextCalled, false);
    assert.equal(statusSet, 401);
    assert.ok(jsonSent.message.includes("required"));
  });

  test("RequireRole middleware restricts unauthorized roles", () => {
    const req = { user: { role: "Student" } };
    let statusSet = null;
    let jsonSent = null;
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonSent = data; return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const checkAdmin = requireRole("Admin");
    checkAdmin(req, res, next);

    assert.equal(nextCalled, false);
    assert.equal(statusSet, 403);
    assert.ok(jsonSent.message.includes("permission"));
  });

  test("RequireRole middleware permits authorized roles", () => {
    const req = { user: { role: "Faculty" } };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const checkStaff = requireRole("Admin", "Faculty");
    checkStaff(req, res, next);

    assert.equal(nextCalled, true);
  });
});
