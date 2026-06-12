const beneficiaryModel = require("../models/beneficiary.model");
const accountModel = require("../models/account.model");
const otpService = require("../services/otp.service");
const pinService = require("../services/pin.service");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");

/**
 * GET /api/v1/beneficiaries
 * Returns the logged-in user's saved beneficiaries.
 */
const listBeneficiaries = asyncHandler(async (req, res) => {
  const beneficiaries = await beneficiaryModel
    .find({ user: req.user._id })
    .populate({
      path: "accountId",
      select: "_id currency status",
      populate: {
        path: "user",
        select: "name email",
      },
    });

  res.status(200).json({ beneficiaries });
});

/**
 * POST /api/v1/beneficiaries
 * Saves a new beneficiary, verified via ADD_BENEFICIARY OTP.
 */
const addBeneficiary = asyncHandler(async (req, res) => {
  const { name, accountId, otp, note } = req.body;
  const userId = req.user._id;

  // 1. Verify OTP
  const isValidOtp = await otpService.verifyOtp(userId, "ADD_BENEFICIARY", otp);
  if (!isValidOtp) {
    return res.status(401).json({ message: "Invalid or expired beneficiary confirmation OTP" });
  }

  // 2. Validate beneficiary account exists
  const targetAccount = await accountModel.findById(accountId).populate("user", "name email");
  if (!targetAccount) {
    return res.status(404).json({ message: "Recipient account does not exist" });
  }

  // Prevent adding own account as beneficiary (can transfer directly if needed, standard banking UI prevents self-beneficiary)
  if (targetAccount.user._id.toString() === userId.toString()) {
    return res.status(400).json({ message: "You cannot add your own account as a beneficiary" });
  }

  try {
    const beneficiary = await beneficiaryModel.create({
      user: userId,
      name,
      accountId,
      note: note || "",
    });

    logAudit(req, "BENEFICIARY_ADDED", { beneficiaryId: beneficiary._id, accountId });

    res.status(201).json({
      message: "Beneficiary added successfully",
      beneficiary,
    });
  } catch (err) {
    // Catch compound unique index error: { user: 1, accountId: 1 }
    if (err.code === 11000) {
      return res.status(409).json({ message: "This account is already saved as a beneficiary" });
    }
    throw err;
  }
});

/**
 * DELETE /api/v1/beneficiaries/:id
 * Removes a saved beneficiary. Requires transaction PIN verification for security.
 */
const deleteBeneficiary = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const beneficiaryId = req.params.id;
  const userId = req.user._id;

  // 1. Verify PIN
  const isPinValid = await pinService.verifyPin(userId, pin);
  if (!isPinValid) {
    return res.status(400).json({ message: "Incorrect transaction PIN" });
  }

  // 2. Find and delete beneficiary
  const result = await beneficiaryModel.deleteOne({ _id: beneficiaryId, user: userId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Beneficiary not found or access denied" });
  }

  logAudit(req, "BENEFICIARY_DELETED", { beneficiaryId });

  res.status(200).json({ message: "Beneficiary deleted successfully" });
});

module.exports = {
  listBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
};
