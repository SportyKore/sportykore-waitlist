import type { ContactSubmission } from './contact';
import { envServer, requireEnvServer } from './server-env';

/**
 * Talks to the Google Sheets REST API directly via fetch + Web Crypto, instead
 * of the `googleapis` SDK. That SDK leans on Node's `crypto`/`stream`
 * internals for JWT signing, which is a fragile fit for the Cloudflare
 * Workers runtime this now deploys to — this module only uses APIs Workers
 * supports natively (fetch, crypto.subtle, atob/btoa), no nodejs_compat
 * dependency.
 */

interface ServiceAccountCredentials {
	client_email: string;
	private_key: string;
}

function parseServiceAccountJson(raw: string): ServiceAccountCredentials {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw.trim());
	} catch {
		throw new Error(
			'Service account credential must be valid JSON (paste the full Google Cloud key object, use Base64 if quotes break).',
		);
	}

	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error('Service account credential JSON must be an object.');
	}

	const client_email = 'client_email' in parsed ? String((parsed as ServiceAccountCredentials).client_email) : '';
	const private_key = 'private_key' in parsed ? String((parsed as ServiceAccountCredentials).private_key) : '';

	if (!client_email || !private_key) {
		throw new Error('Service account JSON must include client_email and private_key.');
	}

	return {
		client_email,
		private_key: private_key.replace(/\\n/g, '\n'),
	};
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToBase64Url(value: string): string {
	return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64ToUtf8(value: string): string {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder('utf-8').decode(bytes);
}

function pemToPkcs8(pem: string): ArrayBuffer {
	const body = pem
		.replace(/-----BEGIN PRIVATE KEY-----/, '')
		.replace(/-----END PRIVATE KEY-----/, '')
		.replace(/\s+/g, '');
	const binary = atob(body);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes.buffer;
}

function getServiceAccountCredentials(): ServiceAccountCredentials {
	const base64Payload = envServer('GOOGLE_SERVICE_ACCOUNT_BASE64');
	if (base64Payload) {
		let decoded: string;
		try {
			decoded = base64ToUtf8(base64Payload.trim());
		} catch {
			throw new Error('GOOGLE_SERVICE_ACCOUNT_BASE64 is not valid Base64.');
		}
		return parseServiceAccountJson(decoded);
	}

	const jsonPayload = envServer('GOOGLE_SERVICE_ACCOUNT');
	if (jsonPayload) {
		return parseServiceAccountJson(jsonPayload);
	}

	const client_email = requireEnvServer('GOOGLE_CLIENT_EMAIL');
	const private_key = requireEnvServer('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

	return { client_email, private_key };
}

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Module-scope cache: survives warm reuse of the same Worker isolate and
// saves a token-exchange round trip per request. Each entry is a string and
// a number, so this never grows — safe to keep for the isolate's lifetime.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function createSignedAssertion(credentials: ServiceAccountCredentials): Promise<string> {
	const key = await crypto.subtle.importKey(
		'pkcs8',
		pemToPkcs8(credentials.private_key),
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign'],
	);

	const issuedAt = Math.floor(Date.now() / 1000);
	const header = { alg: 'RS256', typ: 'JWT' };
	const claims = {
		iss: credentials.client_email,
		scope: SHEETS_SCOPE,
		aud: TOKEN_URL,
		iat: issuedAt,
		exp: issuedAt + 3600,
	};

	const unsigned = `${stringToBase64Url(JSON.stringify(header))}.${stringToBase64Url(JSON.stringify(claims))}`;
	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		key,
		new TextEncoder().encode(unsigned),
	);

	return `${unsigned}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
	if (cachedToken && cachedToken.expiresAt - 60 > Date.now() / 1000) {
		return cachedToken.value;
	}

	const assertion = await createSignedAssertion(credentials);
	const response = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion,
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`Google OAuth token exchange failed (${response.status}): ${body}`);
	}

	const data = (await response.json()) as { access_token: string; expires_in: number };
	cachedToken = { value: data.access_token, expiresAt: Date.now() / 1000 + data.expires_in };
	return data.access_token;
}

export async function appendContactRow(submission: ContactSubmission, source: string) {
	const credentials = getServiceAccountCredentials();
	const spreadsheetId = requireEnvServer('GOOGLE_SHEETS_SPREADSHEET_ID');
	const sheetName = requireEnvServer('GOOGLE_SHEETS_SHEET_NAME');

	const accessToken = await getAccessToken(credentials);
	const range = encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!A:G`);
	const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			values: [
				[
					new Date().toISOString(),
					submission.name,
					submission.email,
					submission.phone,
					submission.role,
					submission.message,
					source,
				],
			],
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`Google Sheets append failed (${response.status}): ${body}`);
	}
}
