const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json({ type: "*/*" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Routes Required */
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/accounts.routes");

/* UserRoutes */
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);

module.exports = app;

