import { isBallInKeeperDanger } from './keeper.js';

const DEFAULT_PITCH = { x: 48, y: 58, width: 624, height: 864 };
const DEFAULT_GOAL = { width: 186, depth: 34 };

export const CPU_DIFFICULTIES = {
	easy: {
		choicePool: 4,
		targetError: 72,
		powerError: 0.22,
		strength: 0.68,
		impactSpeed: 240,
		alignmentWeight: 70,
		defensiveDepth: 0.17,
		keeperEmergencyDepth: 0.13,
		goalTargetWidth: 0.72,
		laneWeight: 0.65,
		thinkDelayFactor: 1.35,
	},
	medium: {
		choicePool: 2,
		targetError: 28,
		powerError: 0.09,
		strength: 0.88,
		impactSpeed: 380,
		alignmentWeight: 190,
		defensiveDepth: 0.31,
		keeperEmergencyDepth: 0.17,
		goalTargetWidth: 0.48,
		laneWeight: 1.35,
		thinkDelayFactor: 1,
	},
	hard: {
		choicePool: 1,
		targetError: 4,
		powerError: 0.02,
		strength: 1.08,
		impactSpeed: 540,
		alignmentWeight: 420,
		defensiveDepth: 0.44,
		keeperEmergencyDepth: 0.22,
		goalTargetWidth: 0.39,
		laneWeight: 2.2,
		thinkDelayFactor: 0.65,
	},
};

export function cpuThinkDelay(baseDelay, difficulty = 'medium') {
	const profile = CPU_DIFFICULTIES[difficulty] || CPU_DIFFICULTIES.medium;
	return Math.max(0, baseDelay) * profile.thinkDelayFactor;
}

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
	const defensiveDanger = isBallInKeeperDanger({
		side: 'cpu',
		ball,
		pitch,
		depth: profile.defensiveDepth,
	});
	const keeperEmergency = isBallInKeeperDanger({
		side: 'cpu',
		ball,
		pitch,
		depth: profile.keeperEmergencyDepth,
	});
	const intent = defensiveDanger ? 'clear' : 'attack';
	const goalCenter = pitch.x + pitch.width / 2;
	const laneOffset = goal.width * 0.27;
	const targetY = pitch.y + pitch.height + goal.depth;
	const clearanceY = Math.min(
		pitch.y + pitch.height * 0.82,
		Math.max(ball.y + pitch.height * 0.34, pitch.y + pitch.height * 0.68)
	);
	const targets = defensiveDanger
		? [
				{ x: pitch.x + pitch.width * 0.18, y: clearanceY },
				{ x: goalCenter, y: clearanceY + pitch.height * 0.06 },
				{ x: pitch.x + pitch.width * 0.82, y: clearanceY },
			]
		: [
				{ x: goalCenter, y: targetY },
				{ x: goalCenter - laneOffset, y: targetY },
				{ x: goalCenter + laneOffset, y: targetY },
			];

	const plans = [];
	for (let capIndex = 0; capIndex < cpuCaps.length; capIndex += 1) {
		const cap = cpuCaps[capIndex];
		if (cap.role === 'keeper' && !keeperEmergency) continue;

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
			const keeperPenalty = cap.role === 'keeper' ? 120 : 0;
			const ownerAdjustment = cap.owner ? 4 : 0;
			const score =
				approachDistance +
				alignmentError * profile.alignmentWeight +
				keeperPenalty +
				ownerAdjustment +
				(blockedApproach ? 900 + Math.abs(approachClearance) * 8 : 0) -
				Math.min(laneClearance, 80) * profile.laneWeight;

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
	if (defensiveDanger && clearPlans.length === 0) {
		const block = planDefensiveBlock({
			ball,
			cpuCaps,
			playerCaps,
			pitch,
			goalCenter,
			profile,
			friction,
			maxDrag,
			powerScale,
			keeperEmergency,
		});
		if (block) return block;
	}
	const usablePlans = clearPlans.length > 0 ? clearPlans : plans;
	const choicePool = usablePlans.slice(0, Math.min(profile.choicePool, usablePlans.length));
	const chosen = choicePool[Math.floor(random() * choicePool.length)] || choicePool[0];

	const aimOffset = signedRandom(random) * profile.targetError;
	const targetBounds = defensiveDanger
		? { left: pitch.x + pitch.width * 0.1, right: pitch.x + pitch.width * 0.9 }
		: {
				left: goalCenter - goal.width * profile.goalTargetWidth,
				right: goalCenter + goal.width * profile.goalTargetWidth,
			};
	const target = {
		...chosen.target,
		x: clamp(chosen.target.x + aimOffset, targetBounds.left, targetBounds.right),
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
		ballDirection,
		aimOffset,
		alignmentError: chosen.alignmentError,
		intent,
		blockedApproach: chosen.blockedApproach,
	};
}

function planDefensiveBlock({
	ball,
	cpuCaps,
	playerCaps,
	pitch,
	goalCenter,
	profile,
	friction,
	maxDrag,
	powerScale,
	keeperEmergency,
}) {
	const blockPoint = {
		x: ball.x + (goalCenter - ball.x) * 0.55,
		y: Math.max(pitch.y + 38, ball.y - pitch.height * 0.16),
	};
	const allCaps = [...cpuCaps, ...playerCaps];
	const candidates = cpuCaps
		.filter((cap) => cap.role !== 'keeper' || keeperEmergency)
		.map((cap, capIndex) => {
			const routeClearance = pathClearance(cap, blockPoint, allCaps, cap, (cap.r || 24) + 4);
			return {
				cap,
				capIndex,
				distance: distance(cap, blockPoint),
				routeClearance,
			};
		})
		.filter((candidate) => candidate.routeClearance >= 0 && candidate.distance > 12)
		.sort((a, b) => a.distance - b.distance);
	const chosen = candidates[0];
	if (!chosen) return null;

	const direction = normalize({ x: blockPoint.x - chosen.cap.x, y: blockPoint.y - chosen.cap.y });
	const travelSpeed = Math.sqrt(Math.max(0, 2 * friction * chosen.distance));
	const maximumSpeed = maxDrag * powerScale * profile.strength;
	const speed = clamp(travelSpeed, maxDrag * powerScale * 0.28, maximumSpeed);
	return {
		cap: chosen.cap,
		capIndex: chosen.capIndex,
		velocity: { x: direction.x * speed, y: direction.y * speed },
		target: blockPoint,
		contactPoint: null,
		aimOffset: 0,
		alignmentError: 0,
		intent: 'block',
		blockedApproach: false,
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
