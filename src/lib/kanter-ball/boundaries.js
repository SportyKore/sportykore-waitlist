export function detectBoundaryEvent({ previous, ball, pitch, goal, lastTouch }) {
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

	if (exit.edge === 'left' || exit.edge === 'right') {
		return {
			type: 'throw_in',
			edge: exit.edge,
			awardedTo: opposite(lastTouch),
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

	const defenderTouchedLast = lastTouch === defending;
	return {
		type: defenderTouchedLast ? 'corner' : 'goal_kick',
		edge: exit.edge,
		awardedTo: defenderTouchedLast ? attacking : defending,
		exitPoint: { x: exitX, y: exitY },
	};
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
