import assert from 'node:assert/strict';
import test from 'node:test';

import { commentaryPriority, shouldInterruptCommentary } from '../src/lib/kanter-ball/audio.js';

test('low-priority reactions cannot cut off important commentary', () => {
	assert.equal(
		shouldInterruptCommentary({
			nextEvent: 'save',
			activePriority: commentaryPriority('owner_vex'),
			isActive: true,
		}),
		false
	);
	assert.equal(
		shouldInterruptCommentary({
			nextEvent: 'full_time',
			activePriority: commentaryPriority('owner_vex'),
			isActive: true,
		}),
		true
	);
});

test('commentary can start immediately when no other line is active', () => {
	assert.equal(
		shouldInterruptCommentary({ nextEvent: 'near_miss', activePriority: 100, isActive: false }),
		true
	);
});

test('full time has the highest commentary priority', () => {
	for (const eventName of ['kickoff', 'save', 'owner_1', 'owner_vex', 'time_low', 'owner_collect']) {
		assert.ok(commentaryPriority('full_time') > commentaryPriority(eventName));
	}
});
