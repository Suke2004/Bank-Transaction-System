# Bank Ledger API Documentation v2.0

## Base URL
The API is currently exposed under `/v2/api/v1` for the frontend client, which gets proxied to the backend at `http://localhost:3000/api/v1`.

All requests require `Content-Type: application/json` unless otherwise specified.
All authenticated endpoints require a JWT Bearer token and a valid session cookie.

## Authentication (Auth)

### `POST /auth/register`
Register a new customer account.
**Body:** `{ name, email, password }`
**Returns:** `{ message, userId, pendingOtp: true }`

### `POST /auth/login`
Authenticate a user. Triggers an OTP.
**Body:** `{ email, password }`
**Returns:** `{ message, userId, pendingOtp: true }`

### `POST /auth/verify-login-otp`
Verify OTP to complete login and issue session tokens.
**Body:** `{ userId, otp }`
**Returns:** `{ token, user }` (Sets HttpOnly cookie for refresh token)

### `POST /auth/refresh`
Refresh access token using HttpOnly cookie.
**Returns:** `{ token }`

### `POST /auth/logout`
Logout user from current session.
**Returns:** `{ message }`

### `GET /auth/me`
Get current authenticated user profile.
**Returns:** `{ user }`

### `POST /auth/forgot-password`
Initiate password reset. Sends OTP to email.
**Body:** `{ email }`
**Returns:** `{ message, userId }`

### `POST /auth/reset-password`
Reset password with valid OTP.
**Body:** `{ userId, otp, newPassword }`
**Returns:** `{ message }`

### `POST /auth/resend-otp`
Resend OTP for any purpose.
**Body:** `{ userId, purpose }`
**Returns:** `{ message }`

## Transactions

### `POST /transaction`
Create a new transfer. High value transfers (> ₹10,000) require an `otpToken`.
**Body:** `{ toAccountId, amountPaise, description, pin, otpToken (optional) }`
**Returns:** `{ message, transaction, transactionId }`

### `GET /transaction`
List transactions for current user.
**Query:** `?status=&page=1&limit=20`
**Returns:** `{ transactions, pagination }`

### `GET /transaction/:id`
Get transaction details.
**Returns:** `{ transaction }`

## Accounts

### `POST /accounts`
Open a new account. Max 5 accounts per user.
**Body:** `{ nickname }`
**Returns:** `{ message, account }`

### `GET /accounts`
List all accounts for current user.
**Returns:** `{ accounts }`

### `GET /accounts/:id/statement`
Get account statement with pagination.
**Returns:** `{ statement, summary, pagination }`

## Admin Panel

These endpoints require specific RBAC roles (teller, manager, admin, superAdmin).

### `GET /admin/users`
List system users. [min_role: teller]
**Returns:** `{ users, pagination }`

### `GET /admin/users/:id`
Get user details including accounts and sessions. [min_role: teller]
**Returns:** `{ user, accounts, sessions }`

### `PATCH /admin/users/:id/suspend`
Suspend a user. [min_role: admin]
**Body:** `{ reason }`
**Returns:** `{ message }`

### `GET /admin/accounts`
List all ledger accounts across the system. [min_role: teller]
**Returns:** `{ accounts, pagination }`

### `PATCH /admin/accounts/:id/freeze`
Freeze an account. [min_role: manager]
**Body:** `{ reason }`
**Returns:** `{ message }`

### `GET /admin/transactions`
List all transactions across the system. [min_role: teller]
**Returns:** `{ transactions, pagination }`

### `GET /admin/system/health`
Get backend system metrics and database status. [min_role: admin]
**Returns:** `{ status, metrics, database, version, uptime }`

---
*For internal documentation and full RBAC structures, refer to the TRD.md and PRD.md files in this folder.*
