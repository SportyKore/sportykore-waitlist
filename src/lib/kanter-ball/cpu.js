import { isBallInKeeperDanger } from './keeper.js';

const DEFAULT_PITCH = { x: 48, y: 58, width: 624, height: 864 };
const DEFAULT_GOAL = { width: 186, depth: 34 };

export const CPU_DIFFICULTIES = {
	easy: { choicePool: 3, targetError: 52, powerError: 0.14, strength: 0.72, impactSpeed: 280, alignmentWeight: 90 },
	medium: { choicePool: 2, targetError: 18, powerError: 0.055, strength: 0.9, impactSpeed: 405, alignmentWeight: 210 },
	hard: { choicePool: 1, targetError: 2, powerError: 0.008, strength: 1.08, impactSpeed: 540, alignmentWeight: 390 },
};

/**
 * Plan one CPU flick. The CPU chooses where the ball should travel, works
 * backwards to the contact point behind it, and only then chooses a counter.
 */
export function planCpuTurn({
	ball,
	cpuCaps,
	playerCaps = [],
	difficulty = 'medium',
	pitch = DEFAULT_PITCH,
	goal = DEFAULT_GOAL,
	friction = 410,
	maxDrag = 125,
	powerScale = 6.6,
	random = Math.random,
}) {
	if (!ball || !Array.isArray(cpuCaps) || cpuCaps.length === 0) return null;

	const profile = CPU_DIFFICULTIES[difficulty] || CPU_DIFFICULTIES.medium;
	const allCaps = [...cpuCaps, ...playerCaps];
	const defensiveDanger = isBallInKeeperDanger({ side: 'cpu', ball, pitch });
	const intent = 'attack';
	const targetY = pitch.y + pitch.height + goal.depth;
	const goalCenter = pitch.x + pitch.width / 2;
	const laneOffset = goal.width * 0.27;
	const targets = [
		{ x: goalCenter, y: targetY },
		{ x: goalCenter - laneOffset, y: targetY },
		{ x: goalCenter + laneOffset, y: targetY },
	];

	const plans = [];
	for (let capIndex = 0; capIndex < cpuCaps.length; capIndex += 1) {
		const cap = cpuCaps[capIndex];
		if (cap.role === 'keeper' && !defensiveDanger) continue;

		for (const target of targets) {
			const ballDirection = normalize({ x: target.x - ball.x, y: target.y - ball.y });
			const naturalDirection = normalize({ x: ball.x - cap.x, y: ball.y - cap.y });
			const alignmentError = Math.acos(
				clamp(naturalDirection.x * ballDirection.x + naturalDirection.y * ballDirection.y, -1, 1)
			);
			const contactDistance = (cap.r || 24) + (ball.r || 14) - 2;
			const contactPoint = {
				x: ball.x - ballDirection.x * contactDistance,
				y: ball.y - ballDirection.y * contactDistance,
			};
			const approachDistance = distance(cap, contactPoint);
			const approachClearance = pathClearance(
				cap,
				contactPoint,
				allCaps,
				cap,
				(cap.r || 24) + 4
			);
			const laneClearance = pathClearance(ball, target, allCaps, cap, (ball.r || 14) + 3);
			const blockedApproach = approachClearance < 0;
			const keeperPenalty = cap.role === 'keeper' ? (defensiveDanger ? 80 : 310) : 0;
			const ownerAdjustment = cap.owner ? 4 : 0;
			const score =
				approachDistance +
				alignmentError * profile.alignmentWeight +
				keeperPenalty +
				ownerAdjustment +
				(blockedApproach ? 900 + Math.abs(approachClearance) * 8 : 0) -
				Math.min(laneClearance, 80) * 1.35;

			plans.push({
				cap,
				capIndex,
				target,
				contactPoint,
				ballDirection,
				approachDistance,
				alignmentError,
				blockedApproach,
				score,
			});
		}
	}

	if (plans.length === 0) return null;
	plans.sort((a, b) => a.score - b.score);
	const clearPlans = plans.filter((plan) => !plan.blockedApproach);
	const usablePlans = clearPlans.length > 0 ? clearPlans : plans;
	const choicePool = usablePlans.slice(0, Math.min(profile.choicePool, usablePlans.length));
	const chosen = choicePool[Math.floor(random() * choicePool.length)] || choicePool[0];

	const aimOffset = signedRandom(random) * profile.targetError;
	const target = {
		...chosen.target,
		x: clamp(chosen.target.x + aimOffset, goalCenter - goal.width * 0.42, goalCenter + goal.width * 0.42),
	};
	const ballDirection = normalize({ x: target.x - ball.x, y: target.y - ball.y });
	const contactDistance = (chosen.cap.r || 24) + (ball.r || 14) - 2;
	const contactPoint = {
		x: ball.x - ballDirection.x * contactDistance,
		y: ball.y - ballDirection.y * contactDistance,
	};
	const idealAngle = Math.atan2(
		contactPoint.y - chosen.cap.y,
		contactPoint.x - chosen.cap.x
	);
	const approachDistance = distance(chosen.cap, contactPoint);
	const desiredImpactSpeed = profile.impactSpeed;
	const speedForContact = Math.sqrt(
		Math.max(0, desiredImpactSpeed ** 2 + 2 * friction * approachDistance)
	);
	const maximumSpeed = maxDrag * powerScale * profile.strength;
	const speed = clamp(
		speedForContact * (1 + signedRandom(random) * profile.powerError),
		maxDrag * powerScale * 0.34,
		maximumSpeed
	);

	return {
		cap: chosen.cap,
		capIndex: chosen.capIndex,
		velocity: { x: Math.cos(idealAngle) * speed, y: Math.sin(idealAngle) * speed },
		target,
		contactPoint,
		aimOffset,
		alignmentError: chosen.alignmentError,
		intent,
		blockedApproach: chosen.blockedApproach,
	};
}

export function distancePointToSegment(point, start, end) {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const lengthSquared = dx * dx + dy * dy;
	if (lengthSquared === 0) return distance(point, start);
	const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
	return distance(point, { x: start.x + dx * t, y: start.y + dy * t });
}

function pathClearance(start, end, bodies, movingCap, movingRadius) {
	let minimum = Number.POSITIVE_INFINITY;
	for (const body of bodies) {
		if (body === movingCap) continue;
		const clearance = distancePointToSegment(body, start, end) - ((body.r || 0) + movingRadius);
		minimum = Math.min(minimum, clearance);
	}
	return minimum;
}

function signedRandom(random) {
	return random() * 2 - 1;
}

function normalize(vector) {
	const length = Math.hypot(vector.x, vector.y) || 1;
	return { x: vector.x / length, y: vector.y / length };
}

function distance(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
