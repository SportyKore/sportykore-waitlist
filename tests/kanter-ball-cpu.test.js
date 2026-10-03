import assert from 'node:assert/strict';
import test from 'node:test';

import { distancePointToSegment, planCpuTurn } from '../src/lib/kanter-ball/cpu.js';

const PITCH = { x: 48, y: 58, width: 624, height: 864 };
const GOAL = { width: 186, depth: 34 };

function body(x, y, extra = {}) {
	return { x, y, r: 24, ...extra };
}

function openingPosition() {
	return {
		ball: body(360, 490, { r: 14 }),
		cpuCaps: [
			body(360, 115, { r: 25, role: 'keeper' }),
			body(215, 210),
			body(505, 210),
			body(280, 305, { owner: true }),
			body(440, 305),
			body(220, 395),
			body(500, 395),
		],
		playerCaps: [body(360, 865, { r: 25, role: 'keeper' }), body(220, 585), body(500, 585)],
	};
}

function plan(difficulty, random = () => 0.5, position = openingPosition()) {
	return planCpuTurn({ ...position, difficulty, pitch: PITCH, goal: GOAL, random });
}

test('hard CPU opening flick approaches the contact point behind the ball', () => {
	const position = openingPosition();
	const result = plan('hard', () => 0.5, position);

	assert.ok(result);
	assert.notEqual(result.cap.role, 'keeper');
	assert.equal(result.intent, 'attack');
	assert.equal(result.blockedApproach, false);
	assert.ok(result.target.y > position.ball.y);
	assert.ok(result.alignmentError < 0.55, `hard alignment error was ${result.alignmentError}`);

	const projectedEnd = {
		x: result.cap.x + result.velocity.x,
		y: result.cap.y + result.velocity.y,
	};
	const missDistance = distancePointToSegment(position.ball, result.cap, projectedEnd);
	assert.ok(missDistance <= result.cap.r + position.ball.r, `planned path misses ball by ${missDistance}`);
});

test('CPU keeps the keeper home when the ball is outside its defensive danger area', () => {
	for (const difficulty of ['easy', 'medium', 'hard']) {
		for (const randomValue of [0.05, 0.5, 0.95]) {
			assert.notEqual(plan(difficulty, () => randomValue)?.cap.role, 'keeper');
		}
	}
});

test('difficulty reduces target error while preserving a valid ball contact', () => {
	const position = openingPosition();
	const random = () => 1;
	const easy = plan('easy', random, position);
	const medium = plan('medium', random, position);
	const hard = plan('hard', random, position);
	assert.ok(Math.abs(easy.aimOffset) > Math.abs(medium.aimOffset));
	assert.ok(Math.abs(medium.aimOffset) > Math.abs(hard.aimOffset));
	for (const result of [easy, medium, hard]) {
		assert.ok(Number.isFinite(result.velocity.x));
		assert.ok(Number.isFinite(result.velocity.y));
		assert.ok(Math.hypot(result.velocity.x, result.velocity.y) > 0);
	}
});

test('hard CPU clears downfield when the ball threatens its defensive third', () => {
	const position = openingPosition();
	position.ball = body(280, 210, { r: 14 });
	position.cpuCaps[1] = body(250, 155);
	const result = plan('hard', () => 0.5, position);

	assert.ok(result);
	assert.equal(result.intent, 'clear');
	assert.ok(result.target.y > position.ball.y + PITCH.height * 0.3);
	assert.ok(result.target.x > PITCH.x && result.target.x < PITCH.x + PITCH.width);
});

test('hard recognizes danger earlier than easy', () => {
	const position = openingPosition();
	position.ball = body(360, 400, { r: 14 });
	assert.equal(plan('easy', () => 0.5, position).intent, 'attack');
	assert.equal(plan('hard', () => 0.5, position).intent, 'clear');
});

test('CPU keeper only engages inside the emergency area', () => {
	const position = openingPosition();
	position.ball = body(360, 230, { r: 14 });
	position.cpuCaps = [position.cpuCaps[0]];
	assert.equal(plan('hard', () => 0.5, position), null);

	position.ball = body(360, 160, { r: 14 });
	assert.equal(plan('hard', () => 0.5, position)?.cap.role, 'keeper');
});

test('CPU covers the shooting lane when every route to the ball is blocked', () => {
	const position = {
		ball: body(360, 220, { r: 14 }),
		cpuCaps: [body(200, 120)],
		playerCaps: [body(360, 160, { r: 30 })],
	};
	const result = plan('hard', () => 0.5, position);

	assert.ok(result);
	assert.equal(result.intent, 'block');
	assert.equal(result.contactPoint, null);
	assert.ok(result.target.y < position.ball.y);
});

test('shot power rises clearly from easy to medium to hard', () => {
	const steadyRandom = () => 0.5;
	const easySpeed = Math.hypot(...Object.values(plan('easy', steadyRandom).velocity));
	const mediumSpeed = Math.hypot(...Object.values(plan('medium', steadyRandom).velocity));
	const hardSpeed = Math.hypot(...Object.values(plan('hard', steadyRandom).velocity));
	assert.ok(easySpeed < mediumSpeed, `${easySpeed} should be below ${mediumSpeed}`);
	assert.ok(mediumSpeed < hardSpeed, `${mediumSpeed} should be below ${hardSpeed}`);
});

test('CPU avoids a blocked approach when another counter has a clear route', () => {
	const position = openingPosition();
	position.playerCaps.push(body(290, 440, { r: 32 }));
	const result = plan('hard', () => 0.5, position);

	assert.ok(result);
	assert.equal(result.blockedApproach, false);
	assert.notEqual(result.cap, position.cpuCaps[5]);
});

test('all opening decisions remain finite across repeated random choices', () => {
	let seed = 17;
	const random = () => {
		seed = (seed * 48271) % 2147483647;
		return seed / 2147483647;
	};

	for (const difficulty of ['easy', 'medium', 'hard']) {
		for (let index = 0; index < 250; index += 1) {
			const position = openingPosition();
			const result = plan(difficulty, random, position);
			assert.ok(result);
			assert.ok(Number.isFinite(result.velocity.x));
			assert.ok(Number.isFinite(result.velocity.y));
			assert.notEqual(result.cap.role, 'keeper');
			const projectedEnd = {
				x: result.cap.x + result.velocity.x,
				y: result.cap.y + result.velocity.y,
			};
			assert.ok(
				distancePointToSegment(position.ball, result.cap, projectedEnd) <=
					result.cap.r + position.ball.r,
				`${difficulty} opening plan ${index} misses the ball`
			);
		}
	}
});
