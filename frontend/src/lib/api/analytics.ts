import { apiFetch } from "./client";

export interface AccountBreakdownItem {
  accountId: string;
  nickname: string;
  status: string;
  credit: number;
  debit: number;
  net: number;
}

export interface MonthlyAnalytics {
  year: number;
  month: number;
  totalCredit: number;
  totalDebit: number;
  netSavings: number;
  creditCount: number;
  debitCount: number;
  accountBreakdown: AccountBreakdownItem[];
}

export interface TrendItem {
  label: string;
  year: number;
  month: number;
  credit: number;
  debit: number;
  net: number;
}

export const getMonthlyAnalytics = (params: { year?: number; month?: number } = {}): Promise<{ analytics: MonthlyAnalytics }> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/analytics/monthly?${query}`);
};

export const getTrendAnalytics = (params: { months?: number } = {}): Promise<{ trend: TrendItem[] }> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/v1/analytics/trend?${query}`);
};
