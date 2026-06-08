const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const sendEmail = require("../services/email.service");
/*
 * - user register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      message: "Request body is required",
      status: "failed",
    });
  }

  const { email, password, name } = req.body;

  const isExists = await userModel.findOne({
    email: email,
  });

  if (isExists) {
    return res.status(422).json({
      message: "User already exists. Please choose another email.",
      status: "failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  res.cookie("token", token);
  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });

  await sendEmail.sendRegistrationEmail(user.email, user.name);
}

/*
 * - user login controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "Email or Password is INVALID",
    });
  }
  if (user.systemUser === true) {
    console.log("system user logged in");
  }

  const isValidPassword = await user.comparedPassword(password);

  if (!isValidPassword) {
    return res.status(401).json({
      message: "Email or Password is INVALID",
    });
  }
  const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  res.cookie("token", token);
  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
  await sendEmail.sendLoginEmail(user.email, user.name);
}

module.exports = {
  userRegisterController,
  userLoginController,
};
