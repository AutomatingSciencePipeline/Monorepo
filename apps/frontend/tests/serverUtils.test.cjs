const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../app/api/cli/tests/helpers.cjs');

const { formatFilename, formatTimestamp, isObjectId } = loadSource('lib/serverUtils.ts', {
  'server-only': {},
});

test('filename timestamps carry UTC-5 subtraction across calendar boundaries', () => {
  for (const [input, expected] of [
    ['2026-11-12T00:30:00.000Z', '2026-11-11_19-30-00-000'],
    ['2026-11-12T04:59:59.999Z', '2026-11-11_23-59-59-999'],
    ['2026-11-01T02:00:00.000Z', '2026-10-31_21-00-00-000'],
    ['2026-01-01T03:00:00.000Z', '2025-12-31_22-00-00-000'],
  ]) {
    assert.equal(formatTimestamp(input), expected);
  }
});

test('filename timestamps support stored epoch milliseconds and padded midnight', () => {
  assert.equal(formatTimestamp(Date.parse('2026-11-12T05:00:00.000Z')), '2026-11-12_00-00-00-000');
  assert.equal(formatTimestamp('2026-11-12T20:15:30.123Z'), '2026-11-12_15-15-30-123');
});

test('filenames preserve sanitization and the requested artifact extension', () => {
  assert.equal(
    formatFilename('Experiment / a-b_c', '2026-01-01T03:00:00.000Z', 'zip'),
    'Experiment___a-b_c_2025-12-31_22-00-00-000.zip',
  );
});

test('invalid timestamps remain rejected', () => {
  assert.throws(() => formatTimestamp('invalid'), /Invalid time value/);
});

test('ObjectId validation accepts hexadecimal strings and rejects coercible values', () => {
  for (const input of ['507f1f77bcf86cd799439011', '507F1F77BCF86CD799439011']) {
    assert.equal(isObjectId(input), true);
  }
  for (const input of [null, undefined, 123, {}, [], '', 'abcdefghijkl', 'g'.repeat(24), '0'.repeat(25)]) {
    assert.equal(isObjectId(input), false);
  }
});
