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

function rayBoundsDistance(origin, direction, bounds, radius) {
	if (!bounds) return 2000;
	const left = bounds.x + radius;
	const right = bounds.x + bounds.width - radius;
	const top = bounds.y + radius;
	const bottom = bounds.y + bounds.height - radius;
	const distances = [];
	if (direction.x > 0) distances.push((right - origin.x) / direction.x);
	if (direction.x < 0) distances.push((left - origin.x) / direction.x);
	if (direction.y > 0) distances.push((bottom - origin.y) / direction.y);
	if (direction.y < 0) distances.push((top - origin.y) / direction.y);
	return Math.min(...distances.filter((distance) => distance >= 0 && Number.isFinite(distance)));
}

export function analyzeAim({ cap, drag, ball, obstacles = [], maxDrag, bounds = null }) {
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
			ballPath: null,
		};
	}

	const direction = { x: drag.x / magnitude, y: drag.y / magnitude };
	const guideDistance = rayBoundsDistance(cap, direction, bounds, cap.r || 0);
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
	let ballPath = null;
	if (willContactBall) {
		const impactX = ball.x - guideEnd.x;
		const impactY = ball.y - guideEnd.y;
		const impactMagnitude = Math.hypot(impactX, impactY);
		const ballDirection = {
			x: impactMagnitude > 0 ? impactX / impactMagnitude : direction.x,
			y: impactMagnitude > 0 ? impactY / impactMagnitude : direction.y,
		};
		const boundaryDistance = rayBoundsDistance(ball, ballDirection, bounds, ball.r || 0);
		const ballCollisions = obstacles
			.filter((body) => body && body !== cap && body !== ball)
			.map((target) => ({
				target,
				distance: rayCircleEntry(ball, ballDirection, target, (ball.r || 0) + (target.r || 0)),
			}))
			.filter((collision) => collision.distance !== null && collision.distance <= boundaryDistance)
			.sort((a, b) => a.distance - b.distance);
		const ballFirstCollision = ballCollisions[0] || null;
		const ballDistance = ballFirstCollision ? ballFirstCollision.distance : boundaryDistance;
		ballPath = {
			direction: ballDirection,
			start: {
				x: ball.x + ballDirection.x * (ball.r + 7),
				y: ball.y + ballDirection.y * (ball.r + 7),
			},
			end: {
				x: ball.x + ballDirection.x * ballDistance,
				y: ball.y + ballDirection.y * ballDistance,
			},
			firstCollision: ballFirstCollision,
		};
	}

	return {
		status: willContactBall ? 'ball' : firstCollision ? 'blocked' : 'open',
		power,
		magnitude,
		direction,
		guideEnd,
		contactPoint: firstCollision ? guideEnd : null,
		firstCollision,
		willContactBall,
		ballPath,
	};
}
