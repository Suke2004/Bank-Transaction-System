const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")
const asyncHandler = require("../utils/asyncHandler")
const logger = require("../utils/logger")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request          ← now handled by validate.middleware.js
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification (fire-and-forget)
 */

const createTransaction = asyncHandler(async (req, res) => {

    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    // Input validation is handled upstream by validate.middleware.js
    // — ObjectId format, positive amount, fromAccount !== toAccount

    const [fromUserAccount, toUserAccount] = await Promise.all([
        accountModel.findOne({ _id: fromAccount }),
        accountModel.findOne({ _id: toAccount }),
    ])

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    let transaction;
    const session = await mongoose.startSession()

    try {
        session.startTransaction()

        /**
         * 5. Create transaction (PENDING)
         */
        transaction = (await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], { session }))[0]

        /**
         * 6. Create DEBIT ledger entry
         * NOTE: The original code had a 15-second artificial delay here
         * between DEBIT and CREDIT creation. This was a test stub that
         * monopolised DB sessions under load and is removed here.
         */
        await ledgerModel.create([{
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session })

        /**
         * 7. Create CREDIT ledger entry
         */
        await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session })

        /**
         * 8. Mark transaction COMPLETED
         */
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        /**
         * 9. Commit MongoDB session
         */
        await session.commitTransaction()

    } catch (error) {
        // Always abort the session on any failure to release the DB lock
        await session.abortTransaction()

        logger.error("Transaction failed — session aborted", {
            idempotencyKey,
            fromAccount,
            toAccount,
            amount,
            error: error.message,
        })

        // Mark transaction as FAILED if it was created before the error
        if (transaction?._id) {
            await transactionModel
                .findOneAndUpdate({ _id: transaction._id }, { status: "FAILED" })
                .catch((markErr) =>
                    logger.error("Failed to mark transaction as FAILED", {
                        transactionId: transaction._id,
                        error: markErr.message,
                    })
                )
        }

        return res.status(500).json({
            message: "Transaction processing failed, please retry after some time",
        })
    } finally {
        // Always end the session, even if abort/commit threw
        session.endSession()
    }

    /**
     * 10. Send email notification (fire-and-forget)
     * Email failure must NEVER roll back a committed transaction.
     */
    emailService
        .sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)
        .catch((err) => {
            logger.error("Failed to send transaction email", {
                userId: req.user._id,
                transactionId: transaction._id,
                error: err.message,
            })
        })

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

})

const createInitialFundsTransaction = asyncHandler(async (req, res) => {
    const { toAccount, amount, idempotencyKey } = req.body

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }

    const session = await mongoose.startSession()
    let transaction;

    try {
        session.startTransaction()

        transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })

        await ledgerModel.create([{
            account: fromUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session })

        await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session })

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()

    } catch (error) {
        await session.abortTransaction()

        logger.error("Initial funds transaction failed — session aborted", {
            idempotencyKey,
            toAccount,
            amount,
            error: error.message,
        })

        if (transaction?._id) {
            await transactionModel
                .findOneAndUpdate({ _id: transaction._id }, { status: "FAILED" })
                .catch((markErr) =>
                    logger.error("Failed to mark initial-funds transaction as FAILED", {
                        transactionId: transaction._id,
                        error: markErr.message,
                    })
                )
        }

        return res.status(500).json({
            message: "Initial funds transaction failed, please retry",
        })
    } finally {
        session.endSession()
    }

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })

})

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}
