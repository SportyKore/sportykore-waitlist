import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the real release handler: rejected taps must not launch, record a
// shot, clear a restart, or hand the turn to the computer.
const source = readFileSync(new URL('../src/pages/kanter-ball.astro', import.meta.url), 'utf8');
const release = source.slice(source.indexOf('\tfunction releaseDrag(point)'), source.indexOf('\tfunction isInvalidKeeperFlick'));
const cancel = source.slice(source.indexOf('\tfunction cancelDrag()'), source.indexOf('\tfunction loop(now)'));
function setup(width, start) {
	const cap = { x: 280, y: 675, vx: 0, vy: 0 };
	const state = { selectedCap: cap, dragging: true, dragStart: start, dragPoint: start,
		turn: 'player', stats: { shots: 0 }, restartTaker: cap, currentShot: null };
	const context = vm.createContext({ state, WORLD: { width: 720 },
		canvas: { getBoundingClientRect: () => ({ width }) },
		currentMode: () => ({ physics: { maxDrag: 125, powerScale: 8.25 } }),
		clampVector: (v) => v, isInvalidKeeperFlick: () => false,
		analyzeAim: () => ({}), ball: {}, bodies: [], FIELD: {},
		playFlickSound() {}, showToast() {}, updateHud() {},
	});
	vm.runInContext(`${release}\n${cancel}`, context);
	return { state, cap, release: (point) => { context.point = point; vm.runInContext('releaseDrag(point)', context); } };
}

for (const width of [320, 720]) {
	test(`edge taps and small jitter preserve the turn at ${width}px`, () => {
		for (const travelPixels of [0, 2, 7]) {
			const start = { x: 302, y: 675 };
			const game = setup(width, start);
			game.release({ x: start.x + travelPixels * 720 / width, y: start.y });
			assert.equal(game.cap.vx, 0);
			assert.equal(game.cap.vy, 0);
			assert.equal(game.state.turn, 'player');
			assert.equal(game.state.stats.shots, 0);
			assert.equal(game.state.restartTaker, game.cap);
			assert.equal(game.state.currentShot, null);
			assert.equal(game.state.dragging, false);
			assert.equal(game.state.dragStart, null);
		}
	});
}
test('an intentional drag still launches and consumes exactly one turn', () => {
	const game = setup(320, { x: 280, y: 675 });
	game.release({ x: 280, y: 735 });
	assert.equal(game.cap.vy, -495);
	assert.equal(game.state.turn, 'settling');
	assert.equal(game.state.stats.shots, 1);
	assert.equal(game.state.restartTaker, null);
});
test('a missing gesture origin cannot launch a cap', () => {
	const game = setup(720, null);
	game.release({ x: 320, y: 675 });
	assert.equal(game.state.turn, 'player');
	assert.equal(game.cap.vx, 0);
});
