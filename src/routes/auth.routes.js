const express = require("express");
const authController = require("../controllers/auth.controller");
const { validateRegister, validateLogin } = require("../middleware/validate.middleware");

const router = express.Router();

/* POST /api/auth/register */
router.post("/register", validateRegister, authController.userRegisterController);

/* POST /api/auth/login */
router.post("/login", validateLogin, authController.userLoginController);

/* POST /api/auth/logout */
router.post("/logout", authController.userLogoutController);

module.exports = router;
