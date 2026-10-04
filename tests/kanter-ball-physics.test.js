import assert from 'node:assert/strict';
import test from 'node:test';

import { collisionGeometry, lastTouchAfterCollision } from '../src/lib/kanter-ball/physics.js';
import { classifyGoal } from '../src/lib/kanter-ball/scoring.js';

test('perfectly overlapping pieces receive a stable separation direction', () => {
	const a = { x: 200, y: 300, r: 24, vx: 180, vy: 0 };
	const b = { x: 200, y: 300, r: 24, vx: 0, vy: 0 };
	const collision = collisionGeometry({ a, b });

	assert.ok(collision);
	assert.deepEqual(collision.normal, { x: 1, y: 0 });
	assert.equal(collision.overlap, 48);

	const separatedA = {
		x: a.x - (collision.normal.x * collision.overlap) / 2,
		y: a.y - (collision.normal.y * collision.overlap) / 2,
	};
	const separatedB = {
		x: b.x + (collision.normal.x * collision.overlap) / 2,
		y: b.y + (collision.normal.y * collision.overlap) / 2,
	};
	assert.equal(Math.hypot(separatedB.x - separatedA.x, separatedB.y - separatedA.y), 48);
});

test('a predicted contact normal remains authoritative inside a crowded collision', () => {
	const collision = collisionGeometry({
		a: { x: 200, y: 300, r: 24 },
		b: { x: 202, y: 300, r: 14 },
		preferredNormal: { x: 0, y: 1 },
	});
	assert.deepEqual(collision.normal, { x: 0, y: 1 });
	assert.ok(collision.overlap > 0);
});

test('the final incoming deflection owns the goal attribution', () => {
	const ball = { type: 'ball' };
	const attacker = { type: 'cap', side: 'player' };
	const defender = { type: 'cap', side: 'cpu' };
	const teammate = { type: 'cap', side: 'player' };

	let lastTouch = lastTouchAfterCollision({
		currentTouch: null,
		a: attacker,
		b: ball,
		ball,
		relativeNormalSpeed: -180,
	});
	lastTouch = lastTouchAfterCollision({
		currentTouch: lastTouch,
		a: ball,
		b: defender,
		ball,
		relativeNormalSpeed: -42,
	});
	lastTouch = lastTouchAfterCollision({
		currentTouch: lastTouch,
		a: ball,
		b: teammate,
		ball,
		relativeNormalSpeed: 12,
	});

	assert.equal(lastTouch, 'cpu');
	assert.equal(classifyGoal({ scoringSide: 'player', lastTouch }).ownGoal, true);
});
