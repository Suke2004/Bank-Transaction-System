const ROLE_WEIGHTS = {
  customer: 0,
  teller: 1,
  manager: 2,
  admin: 3,
  superAdmin: 4,
};

/**
 * RBAC middleware factory
 * Ensures user has at least the minimum role weight required.
 * Relies on req.user being populated by authMiddleware.
 *
 * @param {string} minRole Minimum role required ('customer', 'teller', 'manager', 'admin', 'superAdmin')
 */
const rbacMiddleware = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized access, user context missing",
      });
    }

    const userRole = req.user.role || "customer";
    const userWeight = ROLE_WEIGHTS[userRole] !== undefined ? ROLE_WEIGHTS[userRole] : 0;
    const requiredWeight = ROLE_WEIGHTS[minRole] !== undefined ? ROLE_WEIGHTS[minRole] : 0;

    if (userWeight < requiredWeight) {
      return res.status(403).json({
        message: `Forbidden access, requires at least ${minRole} privilege`,
      });
    }

    return next();
  };
};

module.exports = rbacMiddleware;
