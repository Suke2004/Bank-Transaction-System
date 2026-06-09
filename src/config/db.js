const mongoose = require("mongoose");
const logger = require("../utils/logger");

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
  });
}

module.exports = connectToDB;
