const test = require('node:test');
const assert = require('node:assert/strict');

const { parseTimeString, millisecondsUntilNextRun } = require('../src/scheduler');

test('parseTimeString parses valid HH:mm', () => {
  assert.deepEqual(parseTimeString('06:00'), { hours: 6, minutes: 0 });
  assert.deepEqual(parseTimeString('23:59'), { hours: 23, minutes: 59 });
});

test('parseTimeString rejects invalid formats', () => {
  assert.throws(() => parseTimeString('24:00'), /Invalid scheduleTime/);
  assert.throws(() => parseTimeString('6:0'), /Invalid scheduleTime/);
  assert.throws(() => parseTimeString('abc'), /Invalid scheduleTime/);
});

test('millisecondsUntilNextRun returns same-day delay when time is ahead', () => {
  const now = new Date('2026-01-01T05:00:00.000Z');
  const delay = millisecondsUntilNextRun('06:00', now);

  assert.equal(delay, 60 * 60 * 1000);
});

test('millisecondsUntilNextRun rolls to next day when time has passed', () => {
  const now = new Date('2026-01-01T07:00:00.000Z');
  const delay = millisecondsUntilNextRun('06:00', now);

  assert.equal(delay, 23 * 60 * 60 * 1000);
});
