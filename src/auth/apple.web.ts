import type { AccountSession, UsageSummary } from './apple';

export async function isAppleAccountAvailable() { return false; }
export async function readAccountSession(): Promise<AccountSession | null> { return null; }
export async function signInWithApple(): Promise<AccountSession> { throw new Error('Apple sign-in is available in the iPhone app.'); }
export async function signOutAccount() {}
export async function accountRequestInit(init: RequestInit) { return init; }
export async function readUsageSummary(): Promise<UsageSummary | null> { return null; }
