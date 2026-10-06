import { Transmit } from '@adonisjs/transmit-client';
import { API_BASE, getToken } from './api';

let client: Transmit | null = null;

/**
 * Lazily creates one Transmit client per browser session. The subscribe
 * request (not the long-lived SSE stream, which can't carry headers) is
 * where the Bearer token travels, matching the server's channel
 * authorization in start/transmit.ts.
 */
export function getTransmitClient() {
	if (!client) {
		client = new Transmit({
			baseUrl: API_BASE,
			beforeSubscribe: (request) => {
				const token = getToken();
				if (token) request.headers.set('Authorization', `Bearer ${token}`);
			},
		});
	}
	return client;
}

/**
 * Subscribes to a Canter match's live channel and calls `onMessage` with
 * every server-pushed update. Returns an unsubscribe function.
 */
export function subscribeToMatch<T>(matchId: number, onMessage: (payload: T) => void) {
	const subscription = getTransmitClient().subscription(`canter-matches/${matchId}`);
	const offMessage = subscription.onMessage<T>(onMessage);
	subscription.create().catch(() => {
		// Subscription failures surface as a stale UI (no live updates); the
		// REST getMatch() polling fallback in the caller covers this case.
	});

	return () => {
		offMessage();
		subscription.delete().catch(() => {});
	};
}
