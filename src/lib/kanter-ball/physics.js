import { shouldRecordLastTouch } from './boundaries.js';

const EPSILON = 0.001;

export function collisionGeometry({ a, b, preferredNormal = null }) {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const distance = Math.hypot(dx, dy);
	const minimumDistance = (a.r || 0) + (b.r || 0);
	if (distance >= minimumDistance) return null;

	let normal = normalize(preferredNormal);
	if (!normal && distance > EPSILON) normal = { x: dx / distance, y: dy / distance };
	if (!normal) {
		normal = normalize({
			x: (a.vx || 0) - (b.vx || 0),
			y: (a.vy || 0) - (b.vy || 0),
		}) || { x: 1, y: 0 };
	}

	return {
		normal,
		distance,
		overlap: minimumDistance - distance,
	};
}

export function lastTouchAfterCollision({ currentTouch, a, b, ball, relativeNormalSpeed }) {
	if (!shouldRecordLastTouch(relativeNormalSpeed)) return currentTouch;
	if (a === ball && b.type === 'cap' && b.side) return b.side;
	if (b === ball && a.type === 'cap' && a.side) return a.side;
	return currentTouch;
}

function normalize(vector) {
	if (!vector) return null;
	const length = Math.hypot(vector.x || 0, vector.y || 0);
	if (length <= EPSILON) return null;
	return { x: vector.x / length, y: vector.y / length };
}
