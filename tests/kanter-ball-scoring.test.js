import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyGoal } from '../src/lib/kanter-ball/scoring.js';

test('a touch by the scoring team is a normal goal', () => {
	assert.deepEqual(classifyGoal({ scoringSide: 'player', lastTouch: 'player' }), {
		scoringSide: 'player',
		ownGoal: false,
		concedingSide: 'cpu',
	});
});

test('a defender sending the ball into its own net is an own goal', () => {
	assert.equal(classifyGoal({ scoringSide: 'player', lastTouch: 'cpu' }).ownGoal, true);
	assert.equal(classifyGoal({ scoringSide: 'cpu', lastTouch: 'player' }).ownGoal, true);
});

test('an unattributed goal is not incorrectly labelled an own goal', () => {
	assert.equal(classifyGoal({ scoringSide: 'cpu', lastTouch: null }).ownGoal, false);
});
