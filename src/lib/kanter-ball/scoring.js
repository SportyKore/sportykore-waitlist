export function classifyGoal({ scoringSide, lastTouch }) {
	const ownGoal = Boolean(lastTouch && lastTouch !== scoringSide);
	return {
		scoringSide,
		ownGoal,
		concedingSide: scoringSide === 'player' ? 'cpu' : 'player',
	};
}
