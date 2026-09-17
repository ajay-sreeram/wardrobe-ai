export type AccountSession = { token: string; expiresAt: number; userId: string };
export type UsageSummary = {
  periodStart: string;
  museRequests: number;
  geminiRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
};

export async function isAppleAccountAvailable() { return false; }
export async function readAccountSession(): Promise<AccountSession | null> { return null; }
export async function signInWithApple(): Promise<AccountSession> { throw new Error('Apple sign-in is unavailable.'); }
export async function signOutAccount() {}
export async function accountRequestInit(init: RequestInit) { return init; }
export async function readUsageSummary(): Promise<UsageSummary | null> { return null; }
