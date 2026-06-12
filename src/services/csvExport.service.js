const fastcsv = require("fast-csv");

const writeCsv = (rows, options = { headers: true }) => {
  return new Promise((resolve, reject) => {
    fastcsv.writeToString(rows, options, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

/**
 * Exports transaction records to CSV format
 */
const exportTransactionsCsv = async (transactions) => {
  const rows = transactions.map((tx) => ({
    "Transaction ID": tx._id.toString(),
    "From Account ID": tx.fromAccount?._id?.toString() || tx.fromAccount?.toString() || "System/External",
    "From User": tx.fromAccount?.user?.name || "System/External",
    "To Account ID": tx.toAccount?._id?.toString() || tx.toAccount?.toString(),
    "To User": tx.toAccount?.user?.name || "Unknown",
    "Amount (INR)": (tx.amount / 100).toFixed(2),
    "Status": tx.status,
    "Date": tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "N/A",
    "Description": tx.description || "",
  }));

  return await writeCsv(rows);
};

/**
 * Exports a detailed account statement (ledger entries) to CSV
 */
const exportStatementCsv = async (entries) => {
  const rows = entries.map((entry) => ({
    "Date": entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN") : "N/A",
    "Type": entry.type, // DEBIT or CREDIT
    "Amount (INR)": (entry.amount / 100).toFixed(2),
    "Balance (INR)": entry.balanceAfter !== undefined ? (entry.balanceAfter / 100).toFixed(2) : "N/A",
    "Description": entry.description || "",
  }));

  return await writeCsv(rows);
};

/**
 * Exports audit log entries to CSV for admin use
 */
const exportAuditLogCsv = async (logs) => {
  const rows = logs.map((log) => ({
    "Timestamp": log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "N/A",
    "User ID": log.user?._id?.toString() || log.user?.toString() || "System",
    "User Email": log.user?.email || "System",
    "Action": log.action,
    "IP Address": log.ipAddress || "N/A",
    "Details": typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "",
  }));

  return await writeCsv(rows);
};

module.exports = {
  exportTransactionsCsv,
  exportStatementCsv,
  exportAuditLogCsv,
};
