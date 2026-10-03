import assert from 'node:assert/strict';
import test from 'node:test';

import { detectBoundaryEvent, restartPlacement } from '../src/lib/kanter-ball/boundaries.js';

const pitch = { x: 48, y: 58, width: 624, height: 864 };
const goal = { width: 186, depth: 34 };
const event = (previous, ball, lastTouch) =>
	detectBoundaryEvent({ previous, ball: { r: 14, ...ball }, pitch, goal, lastTouch });

test('touchline exit awards a throw-in to the other team', () => {
	const result = event({ x: 70, y: 500 }, { x: 30, y: 510 }, 'player');
	assert.equal(result.type, 'throw_in');
	assert.equal(result.edge, 'left');
	assert.equal(result.awardedTo, 'cpu');
});

test('attacker touching the ball over the goal line produces a goal kick', () => {
	const result = event({ x: 170, y: 80 }, { x: 170, y: 30 }, 'player');
	assert.equal(result.type, 'goal_kick');
	assert.equal(result.awardedTo, 'cpu');
});

test('defender touching the ball over its own goal line produces a corner', () => {
	const result = event({ x: 170, y: 80 }, { x: 170, y: 30 }, 'cpu');
	assert.equal(result.type, 'corner');
	assert.equal(result.awardedTo, 'player');
});

test('bottom goal-line decisions are mirrored for the player defence', () => {
	const goalKick = event({ x: 170, y: 900 }, { x: 170, y: 950 }, 'cpu');
	const corner = event({ x: 170, y: 900 }, { x: 170, y: 950 }, 'player');
	assert.equal(goalKick.type, 'goal_kick');
	assert.equal(goalKick.awardedTo, 'player');
	assert.equal(corner.type, 'corner');
	assert.equal(corner.awardedTo, 'cpu');
});

test('crossing the goal line between the posts produces a goal', () => {
	const result = event({ x: 360, y: 80 }, { x: 360, y: 30 }, 'player');
	assert.equal(result.type, 'goal');
	assert.equal(result.awardedTo, 'player');
});

test('diagonal corner exits use the first boundary crossed', () => {
	const result = event({ x: 80, y: 90 }, { x: 0, y: 20 }, 'player');
	assert.equal(result.edge, 'left');
	assert.equal(result.type, 'throw_in');
});

test('restart placements leave playable space between the taker and ball', () => {
	for (const sample of [
		{ type: 'throw_in', edge: 'left', exitPoint: { x: 30, y: 500 } },
		{ type: 'corner', edge: 'top', exitPoint: { x: 120, y: 30 } },
		{ type: 'goal_kick', edge: 'bottom', exitPoint: { x: 180, y: 950 } },
	]) {
		const placement = restartPlacement({ event: sample, pitch });
		assert.ok(Math.hypot(placement.ball.x - placement.taker.x, placement.ball.y - placement.taker.y) > 38);
		assert.ok(placement.ball.x > pitch.x && placement.ball.x < pitch.x + pitch.width);
		assert.ok(placement.ball.y > pitch.y && placement.ball.y < pitch.y + pitch.height);
	}
});
