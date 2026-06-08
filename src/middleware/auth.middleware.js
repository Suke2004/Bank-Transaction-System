const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const sendEmail = require("../services/email.service");

async function authMiddleware(req, res, next) { 
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if(!token) {
        return res.status(401).json({
            message: "Unauthorized. No token provided.",
            status: "failed",
        });
    }

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.userID);
        req.user = user
        return next();

    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized. Invalid token.",
            status: "failed"
        })
    }
}

module.exports = authMiddleware;