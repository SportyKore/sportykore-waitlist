import assert from 'node:assert/strict';
import test from 'node:test';

import { ownerReaction, OWNER_LIMITS } from '../src/lib/kanter-ball/owner.js';

test('owner anger escalates through calm, warning, vexed and collection stages', () => {
	assert.equal(ownerReaction(0).stage, 'calm');
	assert.equal(ownerReaction(1).stage, 'alert');
	assert.equal(ownerReaction(OWNER_LIMITS.calmMax).stage, 'alert');
	assert.equal(ownerReaction(OWNER_LIMITS.warnStart).stage, 'warning');
	assert.equal(ownerReaction(OWNER_LIMITS.vexStart).stage, 'vexed');
	assert.equal(ownerReaction(OWNER_LIMITS.collectAt).stage, 'collect');
});

test('pitch warning changes from yellow to red before collection', () => {
	assert.equal(ownerReaction(OWNER_LIMITS.warnStart).tone, 'yellow');
	assert.equal(ownerReaction(OWNER_LIMITS.vexStart).tone, 'red');
	assert.equal(ownerReaction(OWNER_LIMITS.collectAt).tone, 'red');
});

test('each owner stage selects the matching commentary cue', () => {
	assert.equal(ownerReaction(1).commentary, 'owner_1');
	assert.equal(ownerReaction(OWNER_LIMITS.warnStart).commentary, 'owner_2');
	assert.equal(ownerReaction(OWNER_LIMITS.vexStart).commentary, 'owner_vex');
	assert.equal(ownerReaction(OWNER_LIMITS.collectAt).commentary, 'owner_collect');
});
