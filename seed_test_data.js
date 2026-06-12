const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const argon2 = require("argon2");
async function hashPassword(plainText) {
  return await argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}
// Load ENV
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

const userModel = require("./src/models/user.model");
const accountModel = require("./src/models/account.model");
const ledgerModel = require("./src/models/ledger.model");
const transactionModel = require("./src/models/transaction.model");
const TransactionPinModel = require("./src/models/transactionPin.model");

const { v4: uuidv4 } = require("uuid");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    await mongoose.connection.collection('users').deleteMany({ role: "customer" });
    await mongoose.connection.collection('accounts').deleteMany({});
    await mongoose.connection.collection('transactions').deleteMany({});
    await mongoose.connection.collection('ledgers').deleteMany({});
    await mongoose.connection.collection('transactionpins').deleteMany({});

    const passwordHash = await hashPassword("Password123");
    const pinHash = await argon2.hash("123456", {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 1. Create Customer 1
    const customer1 = new userModel({
      email: "alice@bankledger.com",
      password: passwordHash,
      name: "Alice Smith",
      role: "customer",
      isActive: true,
      hasPin: true
    });
    await customer1.save();
    
    await new TransactionPinModel({
      user: customer1._id,
      pinHash: pinHash
    }).save();

    // 2. Create Customer 2
    const customer2 = new userModel({
      email: "bob@bankledger.com",
      password: passwordHash,
      name: "Bob Jones",
      role: "customer",
      isActive: true,
      hasPin: true
    });
    await customer2.save();
    
    await new TransactionPinModel({
      user: customer2._id,
      pinHash: pinHash
    }).save();

    console.log("Created users Alice and Bob.");

    // 3. Create Account for Alice
    const acc1 = new accountModel({
      user: customer1._id,
      nickname: "Alice Checking"
    });
    await acc1.save();

    // 4. Create Account for Bob
    const acc2 = new accountModel({
      user: customer2._id,
      nickname: "Bob Savings"
    });
    await acc2.save();

    console.log("Created accounts for Alice and Bob.");

    // 5. Create System Account (for funding)
    const systemAcc = new accountModel({
      user: customer1._id,
      nickname: "System Reserve",
      status: "ACTIVE"
    });
    await systemAcc.save();

    // 6. Fund Alice's Account (50,000 INR = 5,000,000 Paise)
    const amountPaise = 5000000;
    
    // Create transaction
    const tx = new transactionModel({
      fromAccount: systemAcc._id,
      toAccount: acc1._id,
      amount: amountPaise,
      status: "COMPLETED",
      type: "SYSTEM_DEPOSIT",
      description: "Initial funding by System Admin",
      idempotencyKey: uuidv4()
    });
    await tx.save();

    // Create ledger entries
    const l1 = new ledgerModel({
      transaction: tx._id,
      account: systemAcc._id,
      type: "DEBIT",
      amount: amountPaise,
      balanceAfter: -amountPaise,
      currency: "INR"
    });
    const l2 = new ledgerModel({
      transaction: tx._id,
      account: acc1._id,
      type: "CREDIT",
      amount: amountPaise,
      balanceAfter: amountPaise,
      currency: "INR"
    });
    await Promise.all([l1.save(), l2.save()]);

    console.log("Funded Alice's account with 50,000 INR.");
    console.log("\n=================================");
    console.log("Test Credentials:");
    console.log("Customer 1: alice@bankledger.com / Password123 / PIN: 123456");
    console.log("Customer 2: bob@bankledger.com / Password123 / PIN: 123456");
    console.log("=================================\n");
    console.log("Seed successful.");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
