import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeAim } from '../src/lib/kanter-ball/aim.js';

const cap = { x: 100, y: 100, r: 25, type: 'cap' };
const ball = { x: 250, y: 100, r: 14, type: 'ball' };

test('normalizes aim power against the maximum drag', () => {
	const aim = analyzeAim({ cap, ball, drag: { x: 50, y: 0 }, maxDrag: 100 });
	assert.equal(aim.power, 0.5);
});

test('identifies a clear first contact with the ball', () => {
	const aim = analyzeAim({ cap, ball, drag: { x: 100, y: 0 }, maxDrag: 125 });
	assert.equal(aim.status, 'ball');
	assert.equal(aim.willContactBall, true);
	assert.equal(aim.firstCollision.target, ball);
	assert.ok(aim.contactPoint.x < ball.x);
	assert.deepEqual(aim.ballPath.direction, { x: 1, y: 0 });
});

test('predicts the ball angle from an off-centre contact', () => {
	const angledBall = { ...ball, y: 125 };
	const aim = analyzeAim({ cap, ball: angledBall, drag: { x: 100, y: 0 }, maxDrag: 125 });
	assert.equal(aim.willContactBall, true);
	assert.ok(aim.ballPath.direction.x > 0);
	assert.ok(aim.ballPath.direction.y > 0);
	assert.ok(aim.ballPath.direction.y < aim.ballPath.direction.x);
});

test('stops the predicted ball path at its first player collision', () => {
	const defender = { x: 350, y: 100, r: 25, type: 'cap' };
	const aim = analyzeAim({
		cap,
		ball,
		obstacles: [defender],
		drag: { x: 100, y: 0 },
		maxDrag: 125,
		bounds: { x: 0, y: 0, width: 720, height: 980 },
	});
	assert.equal(aim.ballPath.firstCollision.target, defender);
	assert.ok(aim.ballPath.end.x < defender.x);
});

test('marks an intervening player as blocking the ball', () => {
	const defender = { x: 175, y: 100, r: 25, type: 'cap' };
	const aim = analyzeAim({ cap, ball, obstacles: [defender], drag: { x: 100, y: 0 }, maxDrag: 125 });
	assert.equal(aim.status, 'blocked');
	assert.equal(aim.willContactBall, false);
	assert.equal(aim.firstCollision.target, defender);
});

test('shows an open lane when no body is in the guide', () => {
	const aim = analyzeAim({ cap, ball, drag: { x: 0, y: 100 }, maxDrag: 125 });
	assert.equal(aim.status, 'open');
	assert.equal(aim.firstCollision, null);
	assert.ok(Number.isFinite(aim.guideEnd.x));
	assert.ok(Number.isFinite(aim.guideEnd.y));
});

test('extends the direction guide to the pitch boundary regardless of shot power', () => {
	const bounds = { x: 0, y: 0, width: 720, height: 980 };
	const lowPower = analyzeAim({
		cap,
		ball: { ...ball, y: 300 },
		drag: { x: 12, y: 0 },
		maxDrag: 125,
		bounds,
	});
	const fullPower = analyzeAim({
		cap,
		ball: { ...ball, y: 300 },
		drag: { x: 125, y: 0 },
		maxDrag: 125,
		bounds,
	});
	assert.equal(lowPower.guideEnd.x, 695);
	assert.equal(fullPower.guideEnd.x, 695);
});

test('does not draw a directional claim for a tap-sized drag', () => {
	const aim = analyzeAim({ cap, ball, drag: { x: 4, y: 3 }, maxDrag: 125 });
	assert.equal(aim.status, 'idle');
	assert.deepEqual(aim.direction, { x: 0, y: 0 });
	assert.equal(aim.ballPath, null);
});
