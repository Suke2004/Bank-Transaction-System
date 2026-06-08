const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json({ type: "*/*" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Routes Required */
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/accounts.routes");
const transactionRoutes = require("./routes/transaction.routes");

/* UserRoutes */
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transaction", transactionRoutes);

module.exports = app;

