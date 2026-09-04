import assert from 'node:assert/strict';
import test from 'node:test';

import { HnbExchangeRateProvider } from '../src/Infrastructure/exchangeRateProvider/hnbExchangeRateProvider';

const from = new Date('2026-09-04T00:00:00.000Z');
const to = new Date('2026-09-04T00:00:00.000Z');

function mockFetch(payload: unknown): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('fechaInicio'), '2026-08-30');
    assert.equal(url.searchParams.get('fechaFinal'), '2026-09-09');
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as typeof fetch;
}

test('fetchExchangeRate returns today rate when it is available', async () => {
  const originalFetch = global.fetch;
  global.fetch = mockFetch([
    { Fecha: '2026-09-03T00:00:00', Valor: 10 },
    { Fecha: '2026-09-04T00:00:00', Valor: 11 },
    { Fecha: '2026-09-08T00:00:00', Valor: 12 }
  ]);

  try {
    const provider = new HnbExchangeRateProvider('https://example.com/hnb', 'token');
    assert.deepEqual(await provider.fetchExchangeRate(from, to), [
      { date: new Date('2026-09-04T00:00:00.000Z'), rate: 11, isStale: false }
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchExchangeRate returns the most future rate when today is unavailable', async () => {
  const originalFetch = global.fetch;
  global.fetch = mockFetch([
    { Fecha: '2026-09-03T00:00:00', Valor: 10 },
    { Fecha: '2026-09-08T00:00:00', Valor: 12 },
    { Fecha: '2026-09-06T00:00:00', Valor: 11 }
  ]);

  try {
    const provider = new HnbExchangeRateProvider('https://example.com/hnb', 'token');
    assert.deepEqual(await provider.fetchExchangeRate(from, to), [
      { date: new Date('2026-09-08T00:00:00.000Z'), rate: 12, isStale: true }
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});