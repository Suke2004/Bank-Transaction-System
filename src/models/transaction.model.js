const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: [true, 'Transaction must be associated with a from account'],
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: [true, 'Transaction must be associated with a to account'],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
            message: 'Transaction status must be either PENDING, COMPLETED, FAILED, or REVERSED'
        },
        default: 'PENDING'
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required for a transaction'],
        min: [1, 'Transaction amount must be at least 1 paise (₹0.01)']
    },
    idempotencyKey: {
        type: String,
        required: [true, 'Transaction must have an idempotent key'],
        unique: true,
        index: true
    },
    description: {
        type: String,
        maxLength: [200, 'Description cannot exceed 200 characters'],
        trim: true,
        default: ''
    },
    flagged: {
        type: Boolean,
        default: false
    },
    flagReason: {
        type: String,
        default: ''
    },
    flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    reversedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    reversedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const TransactionModel = mongoose.model('Transaction', transactionSchema);

module.exports = TransactionModel;