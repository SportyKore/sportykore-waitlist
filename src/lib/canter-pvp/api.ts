const API_BASE = import.meta.env.PUBLIC_CANTER_API_URL ?? 'http://localhost:3333';
const TOKEN_KEY = 'sportykore:canter:token';
const USER_KEY = 'sportykore:canter:user';

export type CanterUser = {
	id: number;
	email: string;
	name?: string | null;
};

export type CanterMatch = {
	id: number;
	status: 'pending' | 'active' | 'completed' | 'abandoned' | 'expired';
	rulesMode: 'street';
	hostUserId: number;
	guestUserId: number | null;
	winnerUserId: number | null;
	hostScore: number;
	guestScore: number;
	currentTurnUserId: number | null;
	turnNumber: number;
	turnExpiresAt: string | null;
	state: { bodies: CanterBody[] } | null;
	startedAt: string | null;
	endedAt: string | null;
	inviteCode?: string;
	inviteExpiresAt?: string;
};

export type CanterBody = { id: string; x: number; y: number };

export type CanterFrame = { ball: { x: number; y: number }; caps: CanterBody[] };

export type CanterResultEvent =
	| { type: 'goal'; scoringSide: 'host' | 'guest'; ownGoal: boolean }
	| { type: 'owner'; stage: 'collect' | 'vexed' | 'warning' | 'alert' }
	| { type: 'none' };

export type CanterTurnResponse = {
	match: CanterMatch;
	frames: CanterFrame[];
	resultEvent: CanterResultEvent;
};

class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

export function getToken(): string | null {
	try {
		return window.localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function getStoredUser(): CanterUser | null {
	try {
		const raw = window.localStorage.getItem(USER_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function storeSession(token: string, user: CanterUser) {
	try {
		window.localStorage.setItem(TOKEN_KEY, token);
		window.localStorage.setItem(USER_KEY, JSON.stringify(user));
	} catch {
		// Ignore storage failures (private browsing, etc).
	}
}

export function logout() {
	try {
		window.localStorage.removeItem(TOKEN_KEY);
		window.localStorage.removeItem(USER_KEY);
	} catch {
		// Ignore storage failures.
	}
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getToken();
	const headers = new Headers(options.headers);
	headers.set('Accept', 'application/json');
	if (options.body) headers.set('Content-Type', 'application/json');
	if (token) headers.set('Authorization', `Bearer ${token}`);

	const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
	const text = await res.text();
	const json = text ? JSON.parse(text) : null;

	if (!res.ok) {
		throw new ApiError(json?.message ?? `Request failed (${res.status})`, res.status);
	}

	return json?.data as T;
}

export async function requestOtp(email: string, name?: string) {
	return apiFetch<void>('/api/v1/auth/request-otp', {
		method: 'POST',
		body: JSON.stringify({ email, name }),
	});
}

export async function verifyOtp(email: string, code: string) {
	const data = await apiFetch<{ auth: { user: CanterUser; token: { value: string } } }>(
		'/api/v1/auth/verify-otp',
		{ method: 'POST', body: JSON.stringify({ email, code }) }
	);
	storeSession(data.auth.token.value, data.auth.user);
	return data.auth.user;
}

export async function createMatch() {
	return apiFetch<CanterMatch>('/api/v1/canter/matches', { method: 'POST', body: JSON.stringify({}) });
}

export async function joinMatch(inviteCode: string) {
	return apiFetch<CanterMatch>(`/api/v1/canter/matches/${inviteCode}/join`, { method: 'POST' });
}

export async function getMatch(matchId: number) {
	return apiFetch<CanterMatch>(`/api/v1/canter/matches/${matchId}`);
}

export async function claimTimeout(matchId: number) {
	return apiFetch<CanterMatch>(`/api/v1/canter/matches/${matchId}/claim-timeout`, {
		method: 'POST',
	});
}

export async function submitTurn(matchId: number, capId: string, dragX: number, dragY: number) {
	return apiFetch<CanterTurnResponse>(`/api/v1/canter/matches/${matchId}/turns`, {
		method: 'POST',
		body: JSON.stringify({ capId, dragX, dragY }),
	});
}

export { API_BASE };
