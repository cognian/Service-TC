import assert from 'node:assert/strict';
import test from 'node:test';

import { MexExchangeRateProvider } from '../src/Infrastructure/exchangeRateProvider/mexExchangeRateProvider';

test('fetchExchangeRate maps Banxico payload to date/rate list', async () => {
  const originalFetch = global.fetch;
  const provider = new MexExchangeRateProvider(
    'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos',
    'header-token'
  );

  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(
      url.href,
      'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos/2026-08-21/2026-08-21'
    );
    assert.equal(url.search, '');
    assert.equal(new Headers(init?.headers).get('Bmx-Token'), 'header-token');
    return new Response(
      JSON.stringify({
        bmx: {
          series: [{ datos: [{ fecha: '21/08/2026', dato: '16.9018' }] }]
        }
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    const result = await provider.fetchExchangeRate(new Date('2026-08-21'), new Date('2026-08-21'));
    assert.deepEqual(result, [{ date: new Date('2026-08-21T00:00:00.000Z'), rate: 16.9018 }]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchExchangeRate rejects invalid Banxico rates', async () => {
  const originalFetch = global.fetch;
  const provider = new MexExchangeRateProvider('https://example.com/mex');

  global.fetch = (async () =>
    new Response(
      JSON.stringify({ bmx: { series: [{ datos: [{ fecha: '21/08/2026', dato: 'invalid' }] }] } }),
      { status: 200 }
    )) as typeof fetch;

  try {
    await assert.rejects(
      provider.fetchExchangeRate(new Date('2026-08-21'), new Date('2026-08-21')),
      /Invalid MEX exchange rate value/
    );
  } finally {
    global.fetch = originalFetch;
  }
});