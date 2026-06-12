const express = require("express");
const adminController = require("../controllers/admin.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const rbacMiddleware = require("../middleware/rbac.middleware");

const router = express.Router();

// Enforce authMiddleware globally for all administrative routes
router.use(authMiddleware);

/* ─── USER MANAGEMENT (Tellers+) ─────────────────────────────────────── */

/* GET /api/v1/admin/users - Search/list users */
router.get("/users", rbacMiddleware("teller"), adminController.searchUsers);

/* GET /api/v1/admin/users/:id - Detailed user profile */
router.get("/users/:id", rbacMiddleware("teller"), adminController.getUserDetail);

/* PATCH /api/v1/admin/users/:id/suspend - Suspend user account (Admin+) */
router.patch("/users/:id/suspend", rbacMiddleware("admin"), adminController.suspendUser);

/* PATCH /api/v1/admin/users/:id/unsuspend - Restore user account (Admin+) */
router.patch("/users/:id/unsuspend", rbacMiddleware("admin"), adminController.unsuspendUser);

/* PATCH /api/v1/admin/users/:id/role - Change user role (SuperAdmin only) */
router.patch("/users/:id/role", rbacMiddleware("superAdmin"), adminController.changeUserRole);

/* ─── ACCOUNT CONTROL (Tellers+) ─────────────────────────────────────── */

/* GET /api/v1/admin/accounts - List all system accounts */
router.get("/accounts", rbacMiddleware("teller"), adminController.listAllAccounts);

/* GET /api/v1/admin/accounts/:id - Fetch details of any account */
router.get("/accounts/:id", rbacMiddleware("teller"), adminController.getAccountAdmin);

/* PATCH /api/v1/admin/accounts/:id/freeze - Freeze account (Manager+) */
router.patch("/accounts/:id/freeze", rbacMiddleware("manager"), adminController.freezeAccount);

/* PATCH /api/v1/admin/accounts/:id/unfreeze - Unfreeze account (Manager+) */
router.patch("/accounts/:id/unfreeze", rbacMiddleware("manager"), adminController.unfreezeAccount);

/* PATCH /api/v1/admin/accounts/:id/close - Close account override (Manager+) */
router.patch("/accounts/:id/close", rbacMiddleware("manager"), adminController.closeAccountAdmin);

/* PATCH /api/v1/admin/accounts/:id/limit - Update account daily limit (Manager+) */
router.patch("/accounts/:id/limit", rbacMiddleware("manager"), adminController.setAccountLimit);

/* POST /api/v1/admin/accounts/:id/fund - Deposit funds directly (Admin+) */
router.post("/accounts/:id/fund", rbacMiddleware("admin"), adminController.fundAccount);

/* ─── TRANSACTION CONTROL (Tellers+) ─────────────────────────────────── */

/* GET /api/v1/admin/transactions - List all transactions in system */
router.get("/transactions", rbacMiddleware("teller"), adminController.listAllTransactions);

/* GET /api/v1/admin/transactions/export - Placeholder if needed, but not specified */

/* GET /api/v1/admin/transactions/:id - Fetch single transaction details */
router.get("/transactions/:id", rbacMiddleware("teller"), adminController.getTransactionAdmin);

/* PATCH /api/v1/admin/transactions/:id/flag - Flag suspicious transaction (Manager+) */
router.patch("/transactions/:id/flag", rbacMiddleware("manager"), adminController.flagTransaction);

/* POST /api/v1/admin/transactions/:id/reverse - Reverse completed transaction (Manager+) */
router.post("/transactions/:id/reverse", rbacMiddleware("manager"), adminController.reverseTransaction);

/* ─── SYSTEM CONFIGURATIONS (Admins+) ───────────────────────────────── */

/* GET /api/v1/admin/system/audit-logs/export - Export audit trail to CSV (defined BEFORE :id / param routes) */
router.get("/system/audit-logs/export", rbacMiddleware("admin"), adminController.exportAuditLogsCsv);

/* GET /api/v1/admin/system/audit-logs - View audit logs */
router.get("/system/audit-logs", rbacMiddleware("admin"), adminController.getAuditLogs);

/* GET /api/v1/admin/system/health - Check infrastructure health metrics */
router.get("/system/health", rbacMiddleware("admin"), adminController.getSystemHealth);

/* GET /api/v1/admin/system/config - Retrieve key-value configurations */
router.get("/system/config", rbacMiddleware("admin"), adminController.getSystemConfig);

/* PUT /api/v1/admin/system/config - Add/update system config setting */
router.put("/system/config", rbacMiddleware("admin"), adminController.updateSystemConfig);

module.exports = router;
