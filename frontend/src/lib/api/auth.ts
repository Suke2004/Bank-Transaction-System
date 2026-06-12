import { apiFetch } from "./client";

export interface User {
  _id: string;
  email: string;
  name: string;
  role: "customer" | "teller" | "manager" | "admin" | "superAdmin";
  notificationPreferences: {
    emailOnLogin: boolean;
    emailOnTransaction: boolean;
    emailOnSuspicious: boolean;
  };
}

export interface Session {
  _id: string;
  deviceInfo: string;
  ipAddress: string;
  lastUsedAt: string;
  createdAt: string;
}

export const registerUser = (body: any) => apiFetch("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) });

export const verifyEmail = (body: { userId: string; otp: string }) =>
  apiFetch("/api/v1/auth/verify-email", { method: "POST", body: JSON.stringify({ ...body, purpose: "REGISTER" }) });

export const loginUser = (body: any) => apiFetch("/api/v1/auth/login", { method: "POST", body: JSON.stringify(body) });

export const verifyLoginOtp = (body: { userId: string; otp: string }) =>
  apiFetch("/api/v1/auth/verify-login-otp", { method: "POST", body: JSON.stringify({ ...body, purpose: "LOGIN" }) });

export const logoutUser = () => apiFetch("/api/v1/auth/logout", { method: "POST" });

export const getMe = () => apiFetch("/api/v1/auth/me");

export const changePassword = (body: any) =>
  apiFetch("/api/v1/auth/change-password", { method: "PATCH", body: JSON.stringify(body) });

export const changeName = (body: { name: string; password: any }) =>
  apiFetch("/api/v1/auth/change-name", { method: "PATCH", body: JSON.stringify(body) });

export const forgotPassword = (body: { email: string }) =>
  apiFetch("/api/v1/auth/forgot-password", { method: "POST", body: JSON.stringify(body) });

export const resetPassword = (body: any) =>
  apiFetch("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify(body) });

export const resendOtp = (body: { userId?: string; purpose: string }) =>
  apiFetch("/api/v1/auth/resend-otp", { method: "POST", body: JSON.stringify(body) });

// PIN setup & verification
export const setupPin = (pin: string) =>
  apiFetch("/api/v1/auth/pin/setup", { method: "POST", body: JSON.stringify({ pin }) });

export const verifyPin = (pin: string) =>
  apiFetch("/api/v1/auth/pin/verify", { method: "POST", body: JSON.stringify({ pin }) });

export const changePin = (body: { currentPin: string; newPin: string; otp: string }) =>
  apiFetch("/api/v1/auth/pin/change", { method: "PUT", body: JSON.stringify(body) });

export const sendPinChangeOtp = () => apiFetch("/api/v1/auth/pin/send-otp", { method: "POST" });

// Session management
export const getSessions = (): Promise<{ sessions: Session[] }> => apiFetch("/api/v1/auth/sessions");

export const revokeSession = (id: string) => apiFetch(`/api/v1/auth/sessions/${id}`, { method: "DELETE" });

export const revokeAllSessions = () => apiFetch("/api/v1/auth/sessions", { method: "DELETE" });

// Notification Preferences
export const updateNotificationPrefs = (prefs: any) =>
  apiFetch("/api/v1/auth/notifications", { method: "PATCH", body: JSON.stringify(prefs) });
