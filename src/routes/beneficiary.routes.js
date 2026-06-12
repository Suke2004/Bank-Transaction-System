const express = require("express");
const beneficiaryController = require("../controllers/beneficiary.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  validateBeneficiary,
  validateOtp,
  validatePin,
} = require("../middleware/validate.middleware");

const router = express.Router();

// Enforce authMiddleware for all beneficiary routes
router.use(authMiddleware);

/* GET /api/v1/beneficiaries - List saved payees */
router.get("/", beneficiaryController.listBeneficiaries);

/* POST /api/v1/beneficiaries - Add new payee (needs OTP) */
router.post(
  "/",
  (req, res, next) => {
    // Inject purpose into body for validateOtp middleware
    req.body.purpose = "ADD_BENEFICIARY";
    next();
  },
  validateOtp,
  validateBeneficiary,
  beneficiaryController.addBeneficiary
);

/* DELETE /api/v1/beneficiaries/:id - Delete payee (needs PIN) */
router.delete("/:id", validatePin, beneficiaryController.deleteBeneficiary);

module.exports = router;
