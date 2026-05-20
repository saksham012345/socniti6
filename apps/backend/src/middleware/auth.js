const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "development-secret";

const requireAuth = (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ message: "Insufficient permissions" });
  next();
};

module.exports = { requireAuth, requireRole };
