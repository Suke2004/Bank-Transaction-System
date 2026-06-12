import { apiFetch } from "./client";
import { User, Session } from "./auth";
import { Account } from "./accounts";
import { Transaction } from "./transactions";

export interface AuditLog {
  _id: string;
  userId?: { _id: string; name: string; email: string };
  action: string;
  metadata: any;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SystemHealth {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  db: { status: string };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpuLoad: number[];
    freeMemory: number;
    totalMemory: number;
  };
}

export interface SystemConfig {
  _id: string;
  key: string;
  value: any;
  updatedAt: string;
}

// 1. User Management
export const adminSearchUsers = (
  params: { search?: string; page?: number; limit?: number } = {},
): Promise<{
  users: User[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/admin/users?${query}`);
};

export const adminGetUserDetail = (
  id: string,
): Promise<{
  user: User & { isActive: boolean; suspendedAt: string | null; suspendReason: string; loginAttempts: number; lockedUntil: string | null; createdAt: string };
  accounts: Account[];
  sessions: Session[];
}> => apiFetch(`/api/v1/admin/users/${id}`);

export const adminSuspendUser = (id: string, reason: string) =>
  apiFetch(`/api/v1/admin/users/${id}/suspend`, { method: "PATCH", body: JSON.stringify({ reason }) });

export const adminUnsuspendUser = (id: string) => apiFetch(`/api/v1/admin/users/${id}/unsuspend`, { method: "PATCH" });

export const adminChangeUserRole = (id: string, role: string) =>
  apiFetch(`/api/v1/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });

// 2. Account Control
export const adminGetAccounts = (
  params: { status?: string; page?: number; limit?: number } = {},
): Promise<{
  accounts: Account[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/admin/accounts?${query}`);
};

export const adminGetAccountDetail = (id: string): Promise<{ account: Account }> =>
  apiFetch(`/api/v1/admin/accounts/${id}`);

export const adminFreezeAccount = (id: string, reason: string) =>
  apiFetch(`/api/v1/admin/accounts/${id}/freeze`, { method: "PATCH", body: JSON.stringify({ reason }) });

export const adminUnfreezeAccount = (id: string) => apiFetch(`/api/v1/admin/accounts/${id}/unfreeze`, { method: "PATCH" });

export const adminCloseAccount = (id: string) => apiFetch(`/api/v1/admin/accounts/${id}/close`, { method: "PATCH" });

export const adminSetAccountLimit = (id: string, dailyLimit: number | null) =>
  apiFetch(`/api/v1/admin/accounts/${id}/limit`, { method: "PATCH", body: JSON.stringify({ dailyLimit }) });

export const adminFundAccount = (id: string, amount: number) =>
  apiFetch(`/api/v1/admin/accounts/${id}/fund`, { method: "POST", body: JSON.stringify({ amount }) });

// 3. Transaction Control
export const adminGetTransactions = (
  params: { status?: string; flagged?: boolean; page?: number; limit?: number } = {},
): Promise<{
  transactions: Transaction[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/admin/transactions?${query}`);
};

export const adminGetTransactionDetail = (id: string): Promise<{ transaction: Transaction }> =>
  apiFetch(`/api/v1/admin/transactions/${id}`);

export const adminFlagTransaction = (id: string, reason: string) =>
  apiFetch(`/api/v1/admin/transactions/${id}/flag`, { method: "PATCH", body: JSON.stringify({ reason }) });

export const adminReverseTransaction = (id: string) =>
  apiFetch(`/api/v1/admin/transactions/${id}/reverse`, { method: "POST" });

// 4. System Settings
export const adminGetAuditLogs = (
  params: { action?: string; page?: number; limit?: number } = {},
): Promise<{
  logs: AuditLog[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/admin/system/audit-logs?${query}`);
};

export const adminGetAuditLogsCsvUrl = (params: { action?: string } = {}): string => {
  const query = new URLSearchParams(params as any).toString();
  return `/api/v1/admin/system/audit-logs/export?${query}`;
};

export const adminGetSystemHealth = (): Promise<SystemHealth> => apiFetch("/api/v1/admin/system/health");

export const adminGetSystemConfig = (): Promise<{ configs: SystemConfig[] }> => apiFetch("/api/v1/admin/system/config");

export const adminUpdateSystemConfig = (key: string, value: any) =>
  apiFetch("/api/v1/admin/system/config", { method: "PUT", body: JSON.stringify({ key, value }) });
