import assert from 'node:assert/strict';
import test from 'node:test';

import {
	isBallInKeeperDanger,
	keeperHomePosition,
	nextKeeperRecoveryPosition,
} from '../src/lib/kanter-ball/keeper.js';

const pitch = { x: 76, y: 86, width: 568, height: 808 };

test('danger areas are mirrored for both keepers', () => {
	assert.equal(isBallInKeeperDanger({ side: 'cpu', ball: { x: 360, y: 180 }, pitch }), true);
	assert.equal(isBallInKeeperDanger({ side: 'cpu', ball: { x: 360, y: 500 }, pitch }), false);
	assert.equal(isBallInKeeperDanger({ side: 'player', ball: { x: 360, y: 800 }, pitch }), true);
	assert.equal(isBallInKeeperDanger({ side: 'player', ball: { x: 360, y: 500 }, pitch }), false);
});

test('keeper homes sit centrally inside their own goal lines', () => {
	assert.deepEqual(keeperHomePosition({ side: 'cpu', pitch }), { x: 360, y: 125 });
	assert.deepEqual(keeperHomePosition({ side: 'player', pitch }), { x: 360, y: 855 });
});

test('an undisturbed keeper recovers toward home by one controlled step', () => {
	const result = nextKeeperRecoveryPosition({
		keeper: { x: 500, y: 500, r: 25 },
		side: 'cpu',
		ball: { x: 360, y: 600, r: 14 },
		pitch,
		maxStep: 72,
	});
	assert.equal(result.moved, true);
	assert.ok(result.x < 500);
	assert.ok(result.y < 500);
	assert.ok(Math.abs(Math.hypot(result.x - 500, result.y - 500) - 72) < 0.001);
});

test('a keeper holds position while its own goal is under threat', () => {
	const keeper = { x: 420, y: 210, r: 25 };
	assert.deepEqual(
		nextKeeperRecoveryPosition({ keeper, side: 'cpu', ball: { x: 360, y: 170, r: 14 }, pitch }),
		{ x: 420, y: 210, moved: false }
	);
});
