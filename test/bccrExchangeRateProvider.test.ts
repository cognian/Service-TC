import assert from 'node:assert/strict';
import test from 'node:test';

import { BccrExchangeRateProvider } from '../src/bccrExchangeRateProvider';

test('fetchExchangeRate maps BCCR payload to date/rate list', async () => {
  const originalFetch = global.fetch;
  const provider = new BccrExchangeRateProvider('https://example.com/bccr', 'token-123');

  global.fetch = (async (input: string | URL | Request) => {
    const url = input instanceof URL ? input.toString() : String(input);
    assert.match(url, /from=2026-07-21/);
    assert.match(url, /to=2026-07-23/);

    return new Response(
      JSON.stringify({
        estado: true,
        datos: [
          {
            series: [
              { fecha: '2026-07-21', valorDatoPorPeriodo: 452.43 },
              { fecha: '2026-07-22', valorDatoPorPeriodo: 453.43 }
            ]
          }
        ]
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    const result = await provider.fetchExchangeRate(new Date('2026-07-21'), new Date('2026-07-23'));
    assert.equal(result.length, 2);
    assert.equal(result[0].date.toISOString(), '2026-07-21T00:00:00.000Z');
    assert.equal(result[0].rate, 452.43);
    assert.equal(result[1].date.toISOString(), '2026-07-22T00:00:00.000Z');
    assert.equal(result[1].rate, 453.43);
  } finally {
    global.fetch = originalFetch;
  }
});
