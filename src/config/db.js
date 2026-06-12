const mongoose = require("mongoose");
const logger = require("../utils/logger");

const systemConfigModel = require("../models/systemConfig.model");

async function seedDefaultConfig() {
  const defaults = [
    { key: "HIGH_VALUE_THRESHOLD_PAISE", value: 1000000 },
    { key: "MAX_ACCOUNTS_PER_USER", value: 5 },
    { key: "MAX_DAILY_TRANSFER_PAISE", value: 10000000 },
    { key: "PIN_LOCKOUT_MINUTES", value: 15 },
    { key: "LOGIN_LOCKOUT_MINUTES", value: 30 },
    { key: "OTP_EXPIRY_MINUTES", value: 10 },
  ];

  try {
    for (const item of defaults) {
      const exists = await systemConfigModel.findOne({ key: item.key });
      if (!exists) {
        await systemConfigModel.create(item);
        logger.info(`Seeded default config: ${item.key} = ${item.value}`);
      }
    }
  } catch (err) {
    logger.error("Failed to seed default system configs", { error: err.message });
  }
}

function connectToDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    return Promise.reject(
      new Error("MONGO_URI environment variable is not set."),
    );
  }

  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    family: 4,
  }).then(async (conn) => {
    await seedDefaultConfig();
    return conn;
  });
}

module.exports = connectToDB;
