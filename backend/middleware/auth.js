const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Your session is invalid or expired" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to do this" });
  }

  return next();
};

module.exports = { authenticate, requireRole };
