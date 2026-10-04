export const MATCH_PACING = {
	cpuThinkDelay: 0.32,
	settleDelay: 0.24,
	goalPause: 0.65,
};

export function advanceMatchClock({ remaining, dt, turn, goalCooldown }) {
	const isPaused = goalCooldown > 0 || turn === 'cpu';
	const nextRemaining = isPaused ? remaining : Math.max(0, remaining - Math.max(0, dt));
	return {
		remaining: nextRemaining,
		isPaused,
		shouldEnd: nextRemaining <= 0 && turn !== 'settling' && goalCooldown <= 0,
	};
}

export function crossedCountdownThreshold({ previous, current, threshold }) {
	if (![previous, current, threshold].every(Number.isFinite)) return false;
	return previous > threshold && current <= threshold;
}
