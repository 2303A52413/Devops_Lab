const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const Announcement = require("../models/Announcement");
const User = require("../models/User");
const Category = require("../models/Category");
const ScheduledNotice = require("../models/ScheduledNotice");
const Setting = require("../models/Setting");
const { authenticate, requireRole } = require("../middleware/auth");

const defaultCategories = ["Academic", "Examinations", "Events", "General", "Workshop", "Placement"];

const safeUser = (user) => ({
  id: user._id ? user._id.toString() : user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const makeToken = (user) =>
  jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

const sendError = (res, error, status = 400) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return res.status(409).json({
      message: `A record with that ${field} already exists`,
    });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid record ID" });
  }
  if (error.name === "ValidationError") {
    const firstKey = Object.keys(error.errors || {})[0];
    const message = firstKey ? error.errors[firstKey].message : error.message;
    return res.status(400).json({ message });
  }
  return res.status(status).json({ message: error.message || "An unexpected error occurred" });
};

// ==========================================
// BACKGROUND AUTOMATION: Publish Due Notices
// ==========================================
const publishDueNotices = async () => {
  const now = new Date();
  const dueNotices = await ScheduledNotice.find({
    status: "Scheduled",
    publishDate: { $lte: now },
  }).select("_id");

  for (const dueNotice of dueNotices) {
    const claimed = await ScheduledNotice.findOneAndUpdate(
      { _id: dueNotice._id, status: "Scheduled" },
      { status: "Publishing" },
      { new: true }
    );
    if (!claimed) continue;

    try {
      await Announcement.create({
        title: claimed.title,
        description: claimed.description,
        category: claimed.category,
        department: claimed.department,
        date: claimed.publishDate,
        expiryDate: claimed.expiryDate,
        targetRole: claimed.targetRole,
        status: claimed.expiryDate && claimed.expiryDate < now ? "Expired" : "Published",
      });
      await ScheduledNotice.findByIdAndDelete(claimed._id);
    } catch (error) {
      await ScheduledNotice.findByIdAndUpdate(claimed._id, { status: "Scheduled" });
      console.error("Failed to publish scheduled notice:", error.message);
    }
  }
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Health Check
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Backend is working" });
});

// Check if first-time administrator setup is required
router.get("/auth/setup-status", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ setupRequired: userCount === 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to check setup status" });
  }
});

// Initial administrator setup
router.post("/auth/setup", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(409).json({ message: "Initial administrator setup is already complete" });
    }

    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "Admin",
    });

    await Promise.all(
      defaultCategories.map((category) =>
        Category.updateOne(
          { name: category },
          { $setOnInsert: { name: category, description: `${category} notices and updates` } },
          { upsert: true }
        )
      )
    );

    await Setting.updateOne(
      {},
      {
        $setOnInsert: {
          university: "SR University",
          emailNotifications: true,
          expiryDays: "7",
          autoExpire: true,
        },
      },
      { upsert: true }
    );

    return res.status(201).json({
      token: makeToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// Self-Registration for Students & Faculty
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email address already exists" });
    }

    const assignedRole = role === "Faculty" ? "Faculty" : "Student";

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
    });

    return res.status(201).json({
      token: makeToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// User Login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Email or password is incorrect" });
    }

    return res.json({
      token: makeToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ==========================================
// PROTECTED ROUTES (Requires valid JWT)
// ==========================================
router.use(authenticate);

// Get Current User Profile
router.get("/auth/me", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Account no longer exists" });
    }
    return res.json({ user: safeUser(user) });
  } catch (error) {
    return sendError(res, error);
  }
});

// ==========================================
// DASHBOARD STATISTICS
// ==========================================
router.get("/dashboard/stats", async (req, res) => {
  try {
    await publishDueNotices();
    const now = new Date();

    const [
      totalAnnouncements,
      publishedNotices,
      scheduledNotices,
      expiredNotices,
      draftNotices,
      totalUsers,
      totalCategories,
      categoryStats,
      userRoles,
    ] = await Promise.all([
      Announcement.countDocuments(),
      Announcement.countDocuments({
        status: "Published",
        expiryDate: { $gte: now },
      }),
      ScheduledNotice.countDocuments({ status: "Scheduled" }),
      Announcement.countDocuments({
        $or: [
          { status: "Expired" },
          { status: { $ne: "Draft" }, expiryDate: { $lt: now } },
        ],
      }),
      Announcement.countDocuments({ status: "Draft" }),
      User.countDocuments(),
      Category.countDocuments(),
      Announcement.aggregate([
        { $match: { status: { $ne: "Draft" } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),
    ]);

    const roleCounts = { Admin: 0, Faculty: 0, Student: 0 };
    for (const r of userRoles) {
      if (r._id) roleCounts[r._id] = r.count;
    }

    return res.json({
      totalAnnouncements,
      publishedNotices,
      scheduledNotices,
      expiredNotices,
      draftNotices,
      totalUsers,
      totalCategories,
      roleCounts,
      categoryCounts: categoryStats,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ==========================================
// ANNOUNCEMENTS CRUD
// ==========================================

// GET /announcements (Filtered by role, search, category, status)
router.get("/announcements", async (req, res) => {
  try {
    await publishDueNotices();
    const { search, category, status } = req.query;
    const filter = {};

    if (category && category !== "All") filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: String(search).slice(0, 100), $options: "i" } },
        { description: { $regex: String(search).slice(0, 100), $options: "i" } },
        { department: { $regex: String(search).slice(0, 100), $options: "i" } },
      ];
    }

    if (req.user.role !== "Admin") {
      filter.targetRole = { $in: ["All", req.user.role] };
    }

    const announcements = await Announcement.find(filter).sort({ date: -1, createdAt: -1 });
    return res.json(announcements);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /announcements/:id (Single Announcement)
router.get("/announcements/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    if (
      req.user.role !== "Admin" &&
      announcement.targetRole !== "All" &&
      announcement.targetRole !== req.user.role
    ) {
      return res.status(403).json({ message: "You do not have permission to view this notice" });
    }

    return res.json(announcement);
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /announcements (Create Announcement - Admin & Faculty)
router.post("/announcements", requireRole("Admin", "Faculty"), async (req, res) => {
  try {
    const { title, description, category, department, date, publishDate, expiryDate, status, targetRole } = req.body;

    if (!title?.trim() || !description?.trim() || !category?.trim() || !department?.trim()) {
      return res.status(400).json({ message: "Title, description, category, and department are required" });
    }

    const effectiveDate = new Date(date || publishDate || new Date());
    if (isNaN(effectiveDate.getTime())) {
      return res.status(400).json({ message: "Invalid publish date" });
    }

    if (!expiryDate) {
      return res.status(400).json({ message: "Expiry date is required" });
    }
    const parsedExpiryDate = new Date(expiryDate);
    if (isNaN(parsedExpiryDate.getTime())) {
      return res.status(400).json({ message: "Invalid expiry date" });
    }
    if (parsedExpiryDate < effectiveDate) {
      return res.status(400).json({ message: "Expiry date must be on or after the publish date" });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      department: department.trim(),
      date: effectiveDate,
      expiryDate: parsedExpiryDate,
      status: status || "Published",
      targetRole: targetRole || "All",
      createdBy: req.user.id,
    });

    return res.status(201).json(announcement);
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /announcements/:id (Update Announcement - Admin & Faculty)
router.put("/announcements/:id", requireRole("Admin", "Faculty"), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const fields = ["title", "description", "category", "department", "status", "targetRole"];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        announcement[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      }
    }

    if (req.body.date !== undefined || req.body.publishDate !== undefined) {
      const parsedDate = new Date(req.body.date || req.body.publishDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid publish date" });
      }
      announcement.date = parsedDate;
    }

    if (req.body.expiryDate !== undefined) {
      const parsedExpiry = new Date(req.body.expiryDate);
      if (isNaN(parsedExpiry.getTime())) {
        return res.status(400).json({ message: "Invalid expiry date" });
      }
      announcement.expiryDate = parsedExpiry;
    }

    if (announcement.expiryDate < announcement.date) {
      return res.status(400).json({ message: "Expiry date must be on or after the publish date" });
    }

    await announcement.save();
    return res.json(announcement);
  } catch (error) {
    return sendError(res, error);
  }
});

// DELETE /announcements/:id (Delete Announcement - Admin Only)
router.delete("/announcements/:id", requireRole("Admin"), async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    return res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    return sendError(res, error);
  }
});

// ==========================================
// USERS CRUD (Admin Only)
// ==========================================

// GET /users (List Users - Admin Only)
router.get("/users", requireRole("Admin"), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users.map(safeUser));
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /users/:id (Single User - Admin or Self)
router.get("/users/:id", async (req, res) => {
  try {
    if (req.user.role !== "Admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ message: "You do not have permission to view this user" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(safeUser(user));
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /users (Create User - Admin Only)
router.post("/users", requireRole("Admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Name and email are required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email address already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || "Student",
    });

    return res.status(201).json(safeUser(user));
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /users/:id (Update User - Admin or Self)
router.put("/users/:id", async (req, res) => {
  try {
    if (req.user.role !== "Admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ message: "You do not have permission to update this user" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, email, password, role } = req.body;

    if (name?.trim()) {
      user.name = name.trim();
    }

    if (email?.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing && existing._id.toString() !== user._id.toString()) {
          return res.status(409).json({ message: "An account with this email address already exists" });
        }
        user.email = normalizedEmail;
      }
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      user.password = password; // pre-save hook will hash this
    }

    if (role && req.user.role === "Admin") {
      if (req.user.id === user._id.toString() && role !== "Admin") {
        return res.status(400).json({ message: "You cannot change your own administrator role" });
      }
      user.role = role;
    }

    await user.save();
    return res.json(safeUser(user));
  } catch (error) {
    return sendError(res, error);
  }
});

// DELETE /users/:id (Delete User - Admin Only)
router.delete("/users/:id", requireRole("Admin"), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return sendError(res, error);
  }
});

// ==========================================
// CATEGORIES CRUD
// ==========================================

// GET /categories (List Categories)
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /categories/:id (Single Category)
router.get("/categories/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.json(category);
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /categories (Create Category - Admin Only)
router.post("/categories", requireRole("Admin"), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });
    if (existing) {
      return res.status(409).json({ message: "Category with this name already exists" });
    }

    const category = await Category.create({
      name: trimmedName,
      description: description?.trim() || "",
    });
    return res.status(201).json(category);
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /categories/:id (Update Category - Admin Only)
router.put("/categories/:id", requireRole("Admin"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { name, description } = req.body;
    if (name?.trim() && name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      });
      if (existing) {
        return res.status(409).json({ message: "Category with this name already exists" });
      }

      const oldName = category.name;
      category.name = name.trim();

      // Cascade category rename to existing announcements & scheduled notices
      await Promise.all([
        Announcement.updateMany({ category: oldName }, { category: category.name }),
        ScheduledNotice.updateMany({ category: oldName }, { category: category.name }),
      ]);
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    await category.save();
    return res.json(category);
  } catch (error) {
    return sendError(res, error);
  }
});

// DELETE /categories/:id (Delete Category - Admin Only)
router.delete("/categories/:id", requireRole("Admin"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const [inAnnouncements, inScheduled] = await Promise.all([
      Announcement.exists({ category: category.name }),
      ScheduledNotice.exists({ category: category.name }),
    ]);

    if (inAnnouncements || inScheduled) {
      return res.status(409).json({ message: "This category is used by existing notices and cannot be deleted" });
    }

    await category.deleteOne();
    return res.json({ message: "Category deleted successfully" });
  } catch (error) {
    return sendError(res, error);
  }
});

// ==========================================
// SCHEDULED NOTICES CRUD
// ==========================================

// GET /scheduled (List Scheduled Notices)
router.get("/scheduled", async (req, res) => {
  try {
    await publishDueNotices();
    const query = req.query.all === "true" && req.user.role !== "Student"
      ? {}
      : { status: "Scheduled" };

    const notices = await ScheduledNotice.find(query).sort({ publishDate: 1 });
    return res.json(notices);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /scheduled/:id (Single Scheduled Notice)
router.get("/scheduled/:id", async (req, res) => {
  try {
    const notice = await ScheduledNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: "Scheduled notice not found" });
    }
    return res.json(notice);
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /scheduled (Create Scheduled Notice - Admin & Faculty)
router.post("/scheduled", requireRole("Admin", "Faculty"), async (req, res) => {
  try {
    const { title, description, category, department, targetRole, publishDate, expiryDate } = req.body;

    if (!title?.trim() || !description?.trim() || !category?.trim() || !department?.trim()) {
      return res.status(400).json({ message: "Title, description, category, and department are required" });
    }

    if (!publishDate || !expiryDate) {
      return res.status(400).json({ message: "Publish date and expiry date are required" });
    }

    const parsedPublish = new Date(publishDate);
    const parsedExpiry = new Date(expiryDate);

    if (isNaN(parsedPublish.getTime()) || isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({ message: "Valid publish date and expiry date are required" });
    }

    if (parsedExpiry < parsedPublish) {
      return res.status(400).json({ message: "Expiry date must be on or after the publish date" });
    }

    const notice = await ScheduledNotice.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      department: department.trim(),
      targetRole: targetRole || "All",
      publishDate: parsedPublish,
      expiryDate: parsedExpiry,
      status: "Scheduled",
    });

    return res.status(201).json(notice);
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /scheduled/:id (Update Scheduled Notice - Admin & Faculty)
router.put("/scheduled/:id", requireRole("Admin", "Faculty"), async (req, res) => {
  try {
    const notice = await ScheduledNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: "Scheduled notice not found" });
    }

    const fields = ["title", "description", "category", "department", "targetRole", "status"];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        notice[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      }
    }

    if (req.body.publishDate !== undefined) {
      const parsedPublish = new Date(req.body.publishDate);
      if (isNaN(parsedPublish.getTime())) {
        return res.status(400).json({ message: "Invalid publish date" });
      }
      notice.publishDate = parsedPublish;
    }

    if (req.body.expiryDate !== undefined) {
      const parsedExpiry = new Date(req.body.expiryDate);
      if (isNaN(parsedExpiry.getTime())) {
        return res.status(400).json({ message: "Invalid expiry date" });
      }
      notice.expiryDate = parsedExpiry;
    }

    if (notice.expiryDate < notice.publishDate) {
      return res.status(400).json({ message: "Expiry date must be on or after the publish date" });
    }

    await notice.save();
    return res.json(notice);
  } catch (error) {
    return sendError(res, error);
  }
});

// DELETE /scheduled/:id (Cancel or Delete Scheduled Notice - Admin & Faculty)
router.delete("/scheduled/:id", requireRole("Admin", "Faculty"), async (req, res) => {
  try {
    if (req.query.hard === "true" && req.user.role === "Admin") {
      const deleted = await ScheduledNotice.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Scheduled notice not found" });
      }
      return res.json({ message: "Scheduled notice permanently deleted" });
    }

    const notice = await ScheduledNotice.findOneAndUpdate(
      { _id: req.params.id },
      { status: "Cancelled" },
      { new: true }
    );
    if (!notice) {
      return res.status(404).json({ message: "Scheduled notice not found" });
    }
    return res.json({ message: "Scheduled notice cancelled successfully", notice });
  } catch (error) {
    return sendError(res, error);
  }
});

// ==========================================
// REPORTS & ANALYTICS (MongoDB Aggregations)
// ==========================================

// GET /reports/publications
router.get("/reports/publications", async (req, res) => {
  try {
    await publishDueNotices();
    const { category, department, status, startDate, endDate } = req.query;
    const filter = {};

    if (category && category !== "All") filter.category = category;
    if (department && department !== "All Departments") filter.department = department;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const announcements = await Announcement.find(filter).sort({ date: -1, createdAt: -1 });
    return res.json(announcements);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /reports/categories
router.get("/reports/categories", async (req, res) => {
  try {
    const report = await Announcement.aggregate([
      { $match: { status: { $ne: "Draft" } } },
      {
        $group: {
          _id: "$category",
          totalNotices: { $sum: 1 },
          publishedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Published"] }, 1, 0] },
          },
          expiredCount: {
            $sum: { $cond: [{ $eq: ["$status", "Expired"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return res.json(report);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /reports/expired
router.get("/reports/expired", async (req, res) => {
  try {
    await publishDueNotices();
    const now = new Date();
    const expired = await Announcement.find({
      $or: [
        { status: "Expired" },
        { status: { $ne: "Draft" }, expiryDate: { $lt: now } },
      ],
    }).sort({ expiryDate: -1 });

    return res.json(expired);
  } catch (error) {
    return sendError(res, error);
  }
});

// ==========================================
// SYSTEM SETTINGS
// ==========================================

// GET /settings
router.get("/settings", async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        university: "SR University",
        emailNotifications: true,
        expiryDays: "7",
        autoExpire: true,
      });
    }
    return res.json(settings);
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /settings (Admin Only)
router.put("/settings", requireRole("Admin"), async (req, res) => {
  try {
    const { university, emailNotifications, expiryDays, autoExpire } = req.body;
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (university !== undefined) settings.university = university.trim();
    if (emailNotifications !== undefined) settings.emailNotifications = Boolean(emailNotifications);
    if (expiryDays !== undefined) settings.expiryDays = String(expiryDays);
    if (autoExpire !== undefined) settings.autoExpire = Boolean(autoExpire);
    settings.updatedBy = req.user.id;

    await settings.save();
    return res.json(settings);
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;
