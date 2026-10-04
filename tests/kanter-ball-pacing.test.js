import assert from 'node:assert/strict';
import test from 'node:test';

import {
	advanceMatchClock,
	crossedCountdownThreshold,
	MATCH_PACING,
} from '../src/lib/kanter-ball/pacing.js';

test('clock runs while the player decides and while the ball is moving', () => {
	assert.equal(
		advanceMatchClock({ remaining: 20, dt: 1, turn: 'player', goalCooldown: 0 }).remaining,
		19
	);
	assert.equal(
		advanceMatchClock({ remaining: 20, dt: 1, turn: 'settling', goalCooldown: 0 }).remaining,
		19
	);
});

test('clock pauses during CPU thinking and goal reset time', () => {
	const cpuWait = advanceMatchClock({ remaining: 20, dt: 1, turn: 'cpu', goalCooldown: 0 });
	const goalPause = advanceMatchClock({ remaining: 20, dt: 1, turn: 'player', goalCooldown: 0.5 });
	assert.equal(cpuWait.remaining, 20);
	assert.equal(cpuWait.isPaused, true);
	assert.equal(goalPause.remaining, 20);
	assert.equal(goalPause.isPaused, true);
	assert.equal(
		advanceMatchClock({ remaining: 0, dt: 1, turn: 'player', goalCooldown: 0.5 }).shouldEnd,
		false
	);
});

test('a shot already moving at zero is allowed to finish', () => {
	const moving = advanceMatchClock({ remaining: 0.01, dt: 0.02, turn: 'settling', goalCooldown: 0 });
	assert.equal(moving.remaining, 0);
	assert.equal(moving.shouldEnd, false);

	const resolved = advanceMatchClock({ remaining: moving.remaining, dt: 0.02, turn: 'player', goalCooldown: 0 });
	assert.equal(resolved.shouldEnd, true);
});

test('pacing delays stay short and ordered', () => {
	assert.ok(MATCH_PACING.settleDelay < MATCH_PACING.cpuThinkDelay);
	assert.ok(MATCH_PACING.cpuThinkDelay < MATCH_PACING.goalPause);
	assert.ok(MATCH_PACING.goalPause < 1);
});

test('countdown commentary only triggers when the clock crosses ten seconds', () => {
	assert.equal(crossedCountdownThreshold({ previous: 90, current: 70, threshold: 10 }), false);
	assert.equal(crossedCountdownThreshold({ previous: 11, current: 10, threshold: 10 }), true);
	assert.equal(crossedCountdownThreshold({ previous: 9, current: 8, threshold: 10 }), false);
});
