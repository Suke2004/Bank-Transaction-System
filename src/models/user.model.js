const mongoose = require("mongoose");
const argon2 = require("argon2");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    systemUser: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    role: {
      type: String,
      enum: ["customer", "teller", "manager", "admin", "superAdmin"],
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendReason: {
      type: String,
      default: "",
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    notificationPreferences: {
      emailOnLogin: {
        type: Boolean,
        default: true,
      },
      emailOnTransaction: {
        type: Boolean,
        default: true,
      },
      emailOnSuspicious: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const hash = await argon2.hash(this.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
  this.password = hash;
});

userSchema.methods.comparePassword = async function (password) {
  try {
    return await argon2.verify(this.password, password);
  } catch (err) {
    return false;
  }
};

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;

