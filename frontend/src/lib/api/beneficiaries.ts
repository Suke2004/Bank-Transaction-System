import { apiFetch } from "./client";

export interface Beneficiary {
  _id: string;
  user: string;
  name: string;
  accountId: {
    _id: string;
    currency: string;
    status: string;
    user: { name: string; email: string };
  };
  note: string;
  createdAt: string;
}

export const getBeneficiaries = (): Promise<{ beneficiaries: Beneficiary[] }> => apiFetch("/api/v1/beneficiaries");

export const addBeneficiary = (body: { name: string; accountId: string; otp: string; note?: string }) =>
  apiFetch("/api/v1/beneficiaries", { method: "POST", body: JSON.stringify(body) });

export const deleteBeneficiary = (id: string, pin: string) =>
  apiFetch(`/api/v1/beneficiaries/${id}`, { method: "DELETE", body: JSON.stringify({ pin }) });
