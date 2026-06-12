import { apiFetch } from "./client";

export interface Transaction {
  _id: string;
  fromAccount: {
    _id: string;
    nickname: string;
    user: { name: string; email: string };
  };
  toAccount: {
    _id: string;
    nickname: string;
    user: { name: string; email: string };
  };
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  amount: number;
  idempotencyKey: string;
  description: string;
  flagged: boolean;
  flagReason?: string;
  reversedBy?: string;
  reversedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionPayload {
  fromAccount: string;
  toAccount: string;
  amount: number; // in Rupees, frontend UI submits rupees, middleware converts to paise
  pin: string;
  idempotencyKey: string;
  description?: string;
  otpToken?: string; // High-value confirmation OTP token if prompted
}

export const createTransaction = (
  body: TransactionPayload,
): Promise<{
  pendingOtp?: boolean;
  message: string;
  transaction?: Transaction;
}> => apiFetch("/api/v1/transaction", { method: "POST", body: JSON.stringify(body) });

export const getTransactions = (
  params: { status?: string; direction?: "SENT" | "RECEIVED"; from?: string; to?: string; search?: string; page?: number; limit?: number } = {},
): Promise<{
  transactions: Transaction[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/transaction?${query}`);
};

export const exportTransactionsCsvUrl = (
  params: { status?: string; direction?: "SENT" | "RECEIVED"; from?: string; to?: string; search?: string } = {},
): string => {
  const query = new URLSearchParams(params as any).toString();
  return `/api/v1/transaction/export/csv?${query}`;
};

export const getTransactionDetail = (id: string): Promise<{ transaction: Transaction }> =>
  apiFetch(`/api/v1/transaction/${id}`);

export const fundAccountInitial = (body: { toAccount: string; amount: number; idempotencyKey: string }) =>
  apiFetch("/api/v1/transaction/system/initial-funds", { method: "POST", body: JSON.stringify(body) });
