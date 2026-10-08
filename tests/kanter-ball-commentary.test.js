import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmedSave, threatensGoal } from '../src/lib/kanter-ball/commentary.js';

const pitch = { x: 0, y: 0, width: 600, height: 900 };
const goal = { width: 160 };
const physics = { friction: 410, restSpeed: 10 };
const incoming = { x: 300, y: 80, r: 10, vx: 0, vy: -500 };
const context = { pitch, goal, ...physics, defendingSide: 'cpu' };
const save = { incoming, outgoing: { ...incoming, vy: 100 }, keeperSide: 'cpu', shootingSide: 'player', relativeNormalSpeed: -500, pitch, goal, physics };

test('threat requires direction, goal-mouth clearance, and enough stopping distance', () => {
	assert.equal(threatensGoal({ ...context, ball: incoming }), true);
	for (const ball of [
		{ ...incoming, vy: 500 },
		{ ...incoming, vy: -100 },
		{ ...incoming, x: 375 },
		{ ...incoming, vx: 500 },
		{ ...incoming, vy: 0 },
	]) assert.equal(threatensGoal({ ...context, ball }), false);
	assert.equal(threatensGoal({ ...context, defendingSide: 'player', ball: { ...incoming, y: 820, vy: 500 } }), true);
});

test('save requires a defending keeper to remove an actual goal threat', () => {
	assert.equal(confirmedSave(save), true);
	assert.equal(confirmedSave({ ...save, shootingSide: 'cpu' }), false);
	assert.equal(confirmedSave({ ...save, relativeNormalSpeed: 0 }), false);
	assert.equal(confirmedSave({ ...save, relativeNormalSpeed: 10 }), false);
	assert.equal(confirmedSave({ ...save, incoming: { ...incoming, x: 450 } }), false);
	assert.equal(confirmedSave({ ...save, outgoing: { ...incoming, vy: -400 } }), false);
});
