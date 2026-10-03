import { keeperHomePosition } from './keeper.js';

export function detectBoundaryEvent({ previous, ball, pitch, goal, lastTouch, fallbackTouch }) {
	const left = pitch.x;
	const right = pitch.x + pitch.width;
	const top = pitch.y;
	const bottom = pitch.y + pitch.height;
	const radius = ball.r || 0;
	const crossings = [
		crossing('left', previous.x, ball.x, left - radius),
		crossing('right', previous.x, ball.x, right + radius),
		crossing('top', previous.y, ball.y, top - radius),
		crossing('bottom', previous.y, ball.y, bottom + radius),
	].filter(Boolean);

	if (crossings.length === 0) return null;
	const exit = crossings.sort((a, b) => a.time - b.time)[0];
	const exitX = previous.x + (ball.x - previous.x) * exit.time;
	const exitY = previous.y + (ball.y - previous.y) * exit.time;
	const effectiveLastTouch = lastTouch || fallbackTouch;

	if (exit.edge === 'left' || exit.edge === 'right') {
		return {
			type: 'throw_in',
			edge: exit.edge,
			awardedTo: opposite(effectiveLastTouch),
			exitPoint: { x: exitX, y: exitY },
		};
	}

	const goalLeft = pitch.x + pitch.width / 2 - goal.width / 2;
	const goalRight = pitch.x + pitch.width / 2 + goal.width / 2;
	const inGoal = exitX > goalLeft && exitX < goalRight;
	const defending = exit.edge === 'top' ? 'cpu' : 'player';
	const attacking = opposite(defending);
	if (inGoal) {
		return { type: 'goal', edge: exit.edge, awardedTo: attacking, exitPoint: { x: exitX, y: exitY } };
	}

	const defenderTouchedLast = effectiveLastTouch === defending;
	return {
		type: defenderTouchedLast ? 'corner' : 'goal_kick',
		edge: exit.edge,
		awardedTo: defenderTouchedLast ? attacking : defending,
		exitPoint: { x: exitX, y: exitY },
	};
}

export function insetPitch(pitch, inset) {
	return {
		x: pitch.x + inset,
		y: pitch.y + inset,
		width: pitch.width - inset * 2,
		height: pitch.height - inset * 2,
	};
}

export function isBallEnteringGoal({ ball, pitch, goal, edge }) {
	const goalLeft = pitch.x + pitch.width / 2 - goal.width / 2;
	const goalRight = pitch.x + pitch.width / 2 + goal.width / 2;
	if (ball.x <= goalLeft || ball.x >= goalRight) return false;
	if (edge === 'top') return ball.y - ball.r < pitch.y;
	if (edge === 'bottom') return ball.y + ball.r > pitch.y + pitch.height;
	return false;
}

export function liveGoalMouthEdge({ ball, pitch, goal }) {
	const goalLeft = pitch.x + pitch.width / 2 - goal.width / 2;
	const goalRight = pitch.x + pitch.width / 2 + goal.width / 2;
	if (ball.x <= goalLeft || ball.x >= goalRight) return null;
	const top = pitch.y;
	const bottom = pitch.y + pitch.height;
	if (ball.y - ball.r < top && ball.y + ball.r >= top) return 'top';
	if (ball.y + ball.r > bottom && ball.y - ball.r <= bottom) return 'bottom';
	return null;
}

export function resolveCounterWalls({ body, pitch, goal, restitution = 0.56 }) {
	const next = { ...body };
	const left = pitch.x;
	const right = pitch.x + pitch.width;
	const top = pitch.y;
	const bottom = pitch.y + pitch.height;
	const goalLeft = pitch.x + pitch.width / 2 - goal.width / 2;
	const goalRight = pitch.x + pitch.width / 2 + goal.width / 2;
	const fitsGoalOpening = next.x - next.r >= goalLeft && next.x + next.r <= goalRight;
	const overlapsGoalOpening = next.x + next.r > goalLeft && next.x - next.r < goalRight;
	const insideTopPocket = next.y < top && overlapsGoalOpening;
	const insideBottomPocket = next.y > bottom && overlapsGoalOpening;

	if (next.x - next.r < left) {
		next.x = left + next.r;
		next.vx = Math.abs(next.vx) * restitution;
	}
	if (next.x + next.r > right) {
		next.x = right - next.r;
		next.vx = -Math.abs(next.vx) * restitution;
	}

	if (next.y - next.r < top) {
		if (fitsGoalOpening || insideTopPocket) {
			constrainGoalPocketSides(next, goalLeft, goalRight, restitution);
			const back = top - goal.depth;
			if (next.y - next.r < back) {
				next.y = back + next.r;
				next.vy = Math.abs(next.vy) * restitution;
			}
		} else {
			next.y = top + next.r;
			next.vy = Math.abs(next.vy) * restitution;
		}
	}

	if (next.y + next.r > bottom) {
		if (fitsGoalOpening || insideBottomPocket) {
			constrainGoalPocketSides(next, goalLeft, goalRight, restitution);
			const back = bottom + goal.depth;
			if (next.y + next.r > back) {
				next.y = back - next.r;
				next.vy = -Math.abs(next.vy) * restitution;
			}
		} else {
			next.y = bottom - next.r;
			next.vy = -Math.abs(next.vy) * restitution;
		}
	}

	return next;
}

function constrainGoalPocketSides(body, left, right, restitution) {
	if (body.x - body.r < left) {
		body.x = left + body.r;
		body.vx = Math.abs(body.vx) * restitution;
	}
	if (body.x + body.r > right) {
		body.x = right - body.r;
		body.vx = -Math.abs(body.vx) * restitution;
	}
}

export function shouldRecordLastTouch(relativeNormalSpeed) {
	return Number.isFinite(relativeNormalSpeed) && relativeNormalSpeed < -1;
}

export function restartPlacement({ event, pitch, ballRadius = 14, capRadius = 24 }) {
	const centerX = pitch.x + pitch.width / 2;
	const bottom = pitch.y + pitch.height;
	const separation = ballRadius + capRadius + 5;

	if (event.type === 'throw_in') {
		const y = clamp(event.exitPoint.y, pitch.y + 80, bottom - 80);
		if (event.edge === 'left') {
			const taker = { x: pitch.x + capRadius + 3, y };
			return { ball: { x: taker.x + separation, y }, taker, role: 'outfield' };
		}
		const taker = { x: pitch.x + pitch.width - capRadius - 3, y };
		return { ball: { x: taker.x - separation, y }, taker, role: 'outfield' };
	}

	if (event.type === 'corner') {
		const fromLeft = event.exitPoint.x < centerX;
		const fromTop = event.edge === 'top';
		const taker = {
			x: fromLeft ? pitch.x + capRadius + 3 : pitch.x + pitch.width - capRadius - 3,
			y: fromTop ? pitch.y + capRadius + 3 : bottom - capRadius - 3,
		};
		const diagonal = separation / Math.sqrt(2);
		return {
			ball: {
				x: taker.x + (fromLeft ? diagonal : -diagonal),
				y: taker.y + (fromTop ? diagonal : -diagonal),
			},
			taker,
			role: 'outfield',
		};
	}

	const fromTop = event.edge === 'top';
	const ball = { x: centerX, y: fromTop ? pitch.y + 150 : bottom - 150 };
	return {
		ball,
		taker: { x: centerX, y: ball.y + (fromTop ? -separation : separation) },
		role: 'keeper',
	};
}

export function goalKickKeeperPositions({ event, pitch, ballRadius = 14, capRadius = 25 }) {
	const placement = restartPlacement({ event, pitch, ballRadius, capRadius });
	const homes = {
		cpu: keeperHomePosition({ side: 'cpu', pitch, capRadius, ballRadius }),
		player: keeperHomePosition({ side: 'player', pitch, capRadius, ballRadius }),
	};

	return {
		cpu: event.awardedTo === 'cpu' ? placement.taker : homes.cpu,
		player: event.awardedTo === 'player' ? placement.taker : homes.player,
	};
}

function crossing(edge, before, after, threshold) {
	const crossed =
		edge === 'left' || edge === 'top'
			? before >= threshold && after < threshold
			: before <= threshold && after > threshold;
	if (!crossed || after === before) return null;
	return { edge, time: (threshold - before) / (after - before) };
}

function opposite(side) {
	return side === 'player' ? 'cpu' : 'player';
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
