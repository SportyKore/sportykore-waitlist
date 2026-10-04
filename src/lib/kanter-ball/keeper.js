export const KEEPER_DANGER_DEPTH = 0.3;
export const KEEPER_RECOVERY_STEP = 72;

export function keeperHomePosition({ side, pitch, capRadius = 25, ballRadius = 14 }) {
	const centerX = pitch.x + pitch.width / 2;
	const offset = capRadius + ballRadius;
	return {
		x: centerX,
		y: side === 'cpu' ? pitch.y + offset : pitch.y + pitch.height - offset,
	};
}

export function isBallInKeeperDanger({ side, ball, pitch, depth = KEEPER_DANGER_DEPTH }) {
	if (!ball || !pitch) return false;
	const dangerLine = pitch.height * depth;
	return side === 'cpu'
		? ball.y <= pitch.y + dangerLine
		: ball.y >= pitch.y + pitch.height - dangerLine;
}

export function isKeeperRecoveryFlick({ keeper, movement, side, pitch, ballRadius = 14 }) {
	if (!keeper || !movement || !pitch) return false;
	const home = keeperHomePosition({ side, pitch, capRadius: keeper.r || 25, ballRadius });
	const currentDistance = Math.hypot(home.x - keeper.x, home.y - keeper.y);
	const projectedDistance = Math.hypot(
		home.x - (keeper.x + movement.x),
		home.y - (keeper.y + movement.y)
	);
	return currentDistance > 4 && projectedDistance < currentDistance - 1;
}

export function nextKeeperRecoveryPosition({
	keeper,
	side,
	ball,
	pitch,
	maxStep = KEEPER_RECOVERY_STEP,
}) {
	if (isBallInKeeperDanger({ side, ball, pitch })) {
		return { x: keeper.x, y: keeper.y, moved: false };
	}

	const home = keeperHomePosition({ side, pitch, capRadius: keeper.r || 25, ballRadius: ball.r || 14 });
	const dx = home.x - keeper.x;
	const dy = home.y - keeper.y;
	const distance = Math.hypot(dx, dy);
	if (distance <= 0.001) return { ...home, moved: false };
	const step = Math.min(Math.max(0, maxStep), distance);
	return {
		x: keeper.x + (dx / distance) * step,
		y: keeper.y + (dy / distance) * step,
		moved: step > 0,
	};
}
