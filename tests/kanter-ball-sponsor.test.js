import assert from 'node:assert/strict';
import test from 'node:test';

import { getActiveSponsor } from '../src/lib/kanter-ball/sponsor.js';

test('no sponsor card shows when nothing is configured', () => {
	assert.equal(getActiveSponsor({ name: null }), null);
	assert.equal(getActiveSponsor(null), null);
});

test('a configured sponsor with no date window is always active', () => {
	const sponsor = { name: 'Fred Energy' };
	assert.deepEqual(getActiveSponsor(sponsor, new Date('2026-01-01')), sponsor);
});

test('a sponsor outside its active window is not shown', () => {
	const sponsor = { name: 'Fred Energy', activeFrom: '2026-03-01', activeTo: '2026-03-31' };
	assert.equal(getActiveSponsor(sponsor, new Date('2026-02-15')), null);
	assert.equal(getActiveSponsor(sponsor, new Date('2026-04-01')), null);
});

test('a sponsor inside its active window is shown', () => {
	const sponsor = { name: 'Fred Energy', activeFrom: '2026-03-01', activeTo: '2026-03-31' };
	assert.deepEqual(getActiveSponsor(sponsor, new Date('2026-03-15')), sponsor);
});

test('an open-ended start or end date still gates correctly', () => {
	const startOnly = { name: 'Fred Energy', activeFrom: '2026-03-01', activeTo: null };
	assert.equal(getActiveSponsor(startOnly, new Date('2026-02-01')), null);
	assert.deepEqual(getActiveSponsor(startOnly, new Date('2026-06-01')), startOnly);

	const endOnly = { name: 'Fred Energy', activeFrom: null, activeTo: '2026-03-31' };
	assert.deepEqual(getActiveSponsor(endOnly, new Date('2026-01-01')), endOnly);
	assert.equal(getActiveSponsor(endOnly, new Date('2026-04-01')), null);
});
