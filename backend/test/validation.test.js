const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const User = require("../models/User");
const Announcement = require("../models/Announcement");
const Category = require("../models/Category");
const ScheduledNotice = require("../models/ScheduledNotice");

describe("Model Schema & Validation Tests", () => {
  test("User schema rejects invalid email format", async () => {
    const user = new User({
      name: "Test User",
      email: "invalid-email-string",
      password: "password123",
      role: "Student",
    });

    let validationError = null;
    try {
      await user.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.email);
    assert.match(validationError.errors.email.message, /valid email/i);
  });

  test("User schema enforces minimum password length of 8 characters", async () => {
    const user = new User({
      name: "Short Pass",
      email: "user@sru.edu",
      password: "123",
      role: "Student",
    });

    let validationError = null;
    try {
      await user.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.password);
  });

  test("Announcement schema validates expiryDate >= publishDate", async () => {
    const publishDate = new Date("2026-11-15");
    const invalidExpiry = new Date("2026-11-10");

    const announcement = new Announcement({
      title: "Exam Schedule",
      description: "Mid-semester examination details",
      category: "Examinations",
      department: "CSE",
      date: publishDate,
      expiryDate: invalidExpiry,
    });

    let validationError = null;
    try {
      await announcement.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.expiryDate);
    assert.match(validationError.errors.expiryDate.message, /on or after the publish date/i);
  });

  test("Announcement schema accepts valid dates", async () => {
    const publishDate = new Date("2026-11-15");
    const validExpiry = new Date("2026-11-20");

    const announcement = new Announcement({
      title: "Hackathon 2026",
      description: "Annual coding hackathon",
      category: "Events",
      department: "All Departments",
      date: publishDate,
      expiryDate: validExpiry,
      targetRole: "All",
    });

    let validationError = null;
    try {
      await announcement.validate();
    } catch (err) {
      validationError = err;
    }
    assert.equal(validationError, null);
  });

  test("ScheduledNotice schema validates expiryDate >= publishDate", async () => {
    const notice = new ScheduledNotice({
      title: "Workshop on AI",
      description: "Hands-on generative AI session",
      category: "Workshop",
      department: "CSE-AIML",
      publishDate: new Date("2026-12-01"),
      expiryDate: new Date("2026-11-30"),
    });

    let validationError = null;
    try {
      await notice.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.expiryDate);
  });

  test("Category schema requires a non-empty name", async () => {
    const category = new Category({ description: "Missing name" });
    let validationError = null;
    try {
      await category.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.name);
  });
});
