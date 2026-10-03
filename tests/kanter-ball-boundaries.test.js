import assert from 'node:assert/strict';
import test from 'node:test';

import {
	detectBoundaryEvent,
	goalKickKeeperPositions,
	insetPitch,
	isBallEnteringGoal,
	liveGoalMouthEdge,
	restartPlacement,
	resolveCounterWalls,
	shouldRecordLastTouch,
} from '../src/lib/kanter-ball/boundaries.js';

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

test('visible white pitch markings define out of play instead of the outer board', () => {
	const visibleField = insetPitch(pitch, 28);
	const result = detectBoundaryEvent({
		previous: { x: 70, y: 500 },
		ball: { x: 60, y: 500, r: 14 },
		pitch: visibleField,
		goal,
		lastTouch: 'player',
	});
	assert.equal(visibleField.x, 76);
	assert.equal(result.type, 'throw_in');
	assert.equal(result.awardedTo, 'cpu');
});

test('ball passes through the goal mouth from the first moment it crosses the goal line', () => {
	const visibleField = insetPitch(pitch, 28);
	assert.equal(
		isBallEnteringGoal({
			ball: { x: 360, y: visibleField.y + 13, r: 14 },
			pitch: visibleField,
			goal,
			edge: 'top',
		}),
		true
	);
	assert.equal(
		isBallEnteringGoal({
			ball: { x: 200, y: visibleField.y + 13, r: 14 },
			pitch: visibleField,
			goal,
			edge: 'top',
		}),
		false
	);
});

test('a counter can enter the goal mouth but still collides with the back and side walls', () => {
	const entering = resolveCounterWalls({
		body: { x: 360, y: 930, r: 25, vx: 0, vy: 200 },
		pitch,
		goal,
	});
	assert.ok(entering.y > pitch.y + pitch.height - entering.r);

	const atBack = resolveCounterWalls({
		body: { x: 360, y: 960, r: 25, vx: 0, vy: 200 },
		pitch,
		goal,
	});
	assert.equal(atBack.y, pitch.y + pitch.height + goal.depth - atBack.r);
	assert.ok(atBack.vy < 0);

	const atPost = resolveCounterWalls({
		body: { x: 275, y: 930, r: 25, vx: -100, vy: 20 },
		pitch,
		goal,
	});
	assert.equal(atPost.x, pitch.x + pitch.width / 2 - goal.width / 2 + atPost.r);
	assert.ok(atPost.vx > 0);
});

test('the solid goal line remains active outside the posts', () => {
	const result = resolveCounterWalls({
		body: { x: 180, y: 930, r: 25, vx: 0, vy: 200 },
		pitch,
		goal,
	});
	assert.equal(result.y, pitch.y + pitch.height - result.r);
	assert.ok(result.vy < 0);
});

test('detects a live ball straddling the goal line without calling it a goal', () => {
	assert.equal(liveGoalMouthEdge({ ball: { x: 360, y: 928, r: 14 }, pitch, goal }), 'bottom');
	assert.equal(liveGoalMouthEdge({ ball: { x: 360, y: 940, r: 14 }, pitch, goal }), null);
	assert.equal(liveGoalMouthEdge({ ball: { x: 180, y: 928, r: 14 }, pitch, goal }), null);
});

test('active shooter is the fallback when collision attribution is temporarily unavailable', () => {
	const result = detectBoundaryEvent({
		previous: { x: 70, y: 500 },
		ball: { x: 30, y: 510, r: 14 },
		pitch,
		goal,
		lastTouch: null,
		fallbackTouch: 'player',
	});
	assert.equal(result.type, 'throw_in');
	assert.equal(result.awardedTo, 'cpu');
});

test('only an incoming impact can replace last-touch ownership', () => {
	assert.equal(shouldRecordLastTouch(-120), true);
	assert.equal(shouldRecordLastTouch(-1), false);
	assert.equal(shouldRecordLastTouch(0), false);
	assert.equal(shouldRecordLastTouch(45), false);
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

test('goal kicks return both keepers to their own goal areas', () => {
	const bottomRestart = { type: 'goal_kick', edge: 'bottom', awardedTo: 'player', exitPoint: { x: 180, y: 950 } };
	const bottomPositions = goalKickKeeperPositions({ event: bottomRestart, pitch });
	assert.deepEqual(bottomPositions.cpu, { x: 360, y: 97 });
	assert.deepEqual(bottomPositions.player, { x: 360, y: 816 });

	const topRestart = { type: 'goal_kick', edge: 'top', awardedTo: 'cpu', exitPoint: { x: 540, y: 20 } };
	const topPositions = goalKickKeeperPositions({ event: topRestart, pitch });
	assert.deepEqual(topPositions.cpu, { x: 360, y: 164 });
	assert.deepEqual(topPositions.player, { x: 360, y: 883 });
});
