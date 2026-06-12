import { apiFetch } from "./client";

export interface Account {
  _id: string;
  user: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  currency: string;
  nickname: string;
  dailyLimit: number | null;
  isFlaggedFraud: boolean;
  balance: number;
  balancePaise: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatementEntry {
  _id: string;
  account: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  createdAt: string;
  balanceAfter?: number;
  transaction?: {
    _id: string;
    description: string;
    status: string;
    fromAccount?: {
      _id: string;
      user: { name: string; email: string };
    };
    toAccount?: {
      _id: string;
      user: { name: string; email: string };
    };
  };
}

export const createAccount = (nickname?: string): Promise<{ account: Account }> =>
  apiFetch("/api/v1/accounts", { method: "POST", body: JSON.stringify({ nickname }) });

export const getAccounts = (): Promise<{ accounts: Account[] }> => apiFetch("/api/v1/accounts");

export const getAccountSummary = (): Promise<{ totalBalance: number; accounts: any[] }> =>
  apiFetch("/api/v1/accounts/summary");

export const getAccountBalance = (id: string): Promise<{ balance: number; currency: string }> =>
  apiFetch(`/api/v1/accounts/balance/${id}`);

export const getAccountDetail = (id: string): Promise<{ account: Account }> => apiFetch(`/api/v1/accounts/${id}`);

export const updateAccountNickname = (id: string, nickname: string): Promise<{ account: Account }> =>
  apiFetch(`/api/v1/accounts/${id}/nickname`, { method: "PATCH", body: JSON.stringify({ nickname }) });

export const getAccountStatement = (
  id: string,
  params: { from?: string; to?: string; page?: number; limit?: number } = {},
): Promise<{
  entries: StatementEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/accounts/${id}/statement?${query}`);
};

export const downloadStatementCsvUrl = (id: string, params: { from?: string; to?: string } = {}): string => {
  const query = new URLSearchParams(params as any).toString();
  return `/api/v1/accounts/${id}/statement/csv?${query}`;
};

export const closeAccount = (id: string, otp: string) =>
  apiFetch(`/api/v1/accounts/${id}/close`, { method: "POST", body: JSON.stringify({ otp }) });
