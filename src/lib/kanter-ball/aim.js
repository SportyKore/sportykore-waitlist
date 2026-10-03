const MIN_AIM_DISTANCE = 10;

function clamp01(value) {
	return Math.max(0, Math.min(1, value));
}

function rayCircleEntry(origin, direction, target, radius) {
	const dx = target.x - origin.x;
	const dy = target.y - origin.y;
	const projection = dx * direction.x + dy * direction.y;
	if (projection <= 0) return null;
	const perpendicularSquared = dx * dx + dy * dy - projection * projection;
	const radiusSquared = radius * radius;
	if (perpendicularSquared > radiusSquared) return null;
	return Math.max(0, projection - Math.sqrt(Math.max(0, radiusSquared - perpendicularSquared)));
}

export function analyzeAim({ cap, drag, ball, obstacles = [], maxDrag, maxGuideDistance = 310 }) {
	const magnitude = Math.hypot(drag?.x || 0, drag?.y || 0);
	const power = maxDrag > 0 ? clamp01(magnitude / maxDrag) : 0;
	if (!cap || !ball || magnitude < MIN_AIM_DISTANCE) {
		return {
			status: 'idle',
			power,
			magnitude,
			direction: { x: 0, y: 0 },
			guideEnd: { x: cap?.x || 0, y: cap?.y || 0 },
			contactPoint: null,
			firstCollision: null,
			willContactBall: false,
		};
	}

	const direction = { x: drag.x / magnitude, y: drag.y / magnitude };
	const guideDistance = Math.min(maxGuideDistance, 78 + power * (maxGuideDistance - 78));
	const targets = [ball, ...obstacles.filter((body) => body && body !== cap && body !== ball)];
	const collisions = targets
		.map((target) => ({
			target,
			distance: rayCircleEntry(cap, direction, target, (cap.r || 0) + (target.r || 0)),
		}))
		.filter((collision) => collision.distance !== null && collision.distance <= guideDistance)
		.sort((a, b) => a.distance - b.distance);
	const firstCollision = collisions[0] || null;
	const willContactBall = firstCollision?.target === ball;
	const guideEndDistance = firstCollision ? firstCollision.distance : guideDistance;
	const guideEnd = {
		x: cap.x + direction.x * guideEndDistance,
		y: cap.y + direction.y * guideEndDistance,
	};

	return {
		status: willContactBall ? 'ball' : firstCollision ? 'blocked' : 'open',
		power,
		magnitude,
		direction,
		guideEnd,
		contactPoint: firstCollision ? guideEnd : null,
		firstCollision,
		willContactBall,
	};
}
