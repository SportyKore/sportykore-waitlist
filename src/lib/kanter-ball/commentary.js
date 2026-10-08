// Conservative straight-line prediction using the same sliding friction as play.
// Require the entire ball to fit inside the goal mouth and enough speed to cross.
export function threatensGoal({ ball, defendingSide, pitch, goal, friction, restSpeed }) {
	const direction = defendingSide === 'cpu' ? -1 : 1;
	if (ball.vy * direction <= 0) return false;
	const line = defendingSide === 'cpu' ? pitch.y - ball.r : pitch.y + pitch.height + ball.r;
	const time = (line - ball.y) / ball.vy;
	if (time <= 0) return false;
	const speed = Math.hypot(ball.vx, ball.vy);
	const distance = speed * time;
	const reach = Math.max(0, (speed * speed - restSpeed * restSpeed) / (2 * friction));
	const x = ball.x + ball.vx * time;
	const center = pitch.x + pitch.width / 2;
	return distance <= reach && Math.abs(x - center) + ball.r < goal.width / 2;
}

export function confirmedSave({ incoming, outgoing, keeperSide, shootingSide, relativeNormalSpeed, pitch, goal, physics }) {
	if (keeperSide === shootingSide || relativeNormalSpeed >= -1) return false;
	const context = { defendingSide: keeperSide, pitch, goal, ...physics };
	return threatensGoal({ ...context, ball: incoming }) && !threatensGoal({ ...context, ball: outgoing });
}
