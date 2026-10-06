import type { APIRoute } from 'astro';
import { appendContactRow } from '../../lib/google-sheets';
import { validateContactSubmission } from '../../lib/contact';

export const prerender = false;

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	});
}

export const POST: APIRoute = async ({ request, url }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		return json(
			{
				ok: false,
				fieldErrors: {},
				formError: 'We could not read your message. Please try again.',
			},
			400,
		);
	}

	const validation = validateContactSubmission(payload);

	if (!validation.data) {
		return json(
			{
				ok: false,
				fieldErrors: validation.fieldErrors,
			},
			400,
		);
	}

	try {
		const source = url.hostname === 'localhost' ? 'sportykore.com' : url.host;
		await appendContactRow(validation.data, source);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('Failed to append contact row:', message);

		return json(
			{
				ok: false,
				fieldErrors: {},
				formError: 'We could not send your message right now. Please try again shortly.',
			},
			500,
		);
	}

	return json({
		ok: true,
		redirectTo: '/thanks',
	});
};

export const ALL: APIRoute = () =>
	json(
		{
			ok: false,
			fieldErrors: {},
			formError: 'Method not allowed.',
		},
		405,
	);
