import test from 'node:test';
import assert from 'node:assert/strict';

import { modeProfile } from '../src/lib/kanter-ball/modes.js';

test('street mode is shorter, faster and more elastic than football mode', () => {
	const football = modeProfile('football');
	const street = modeProfile('street');
	assert.ok(street.matchSeconds < football.matchSeconds);
	assert.ok(street.physics.friction < football.physics.friction);
	assert.ok(street.physics.powerScale > football.physics.powerScale);
	assert.ok(street.physics.restitution > football.physics.restitution);
	assert.ok(street.physics.wallRestitution > football.physics.wallRestitution);
	assert.ok(street.pacing.cpuThinkDelay < football.pacing.cpuThinkDelay);
});

test('the owner challenge belongs to street mode only', () => {
	assert.equal(modeProfile('football').ownerRule, false);
	assert.equal(modeProfile('street').ownerRule, true);
});

test('unknown rule modes safely use football settings', () => {
	assert.equal(modeProfile('unknown'), modeProfile('football'));
});
