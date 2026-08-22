import assert from 'node:assert/strict';
import test from 'node:test';

import { SapServiceLayerRateUpdater } from '../src/Infrastructure/exchangeRateUpdater/sapServiceLayerRateUpdater';

const CONFIG = {
  signInUrl: 'https://sap.example.com/b1s/v1/Login',
  companyDB: 'TESTDB',
  username: 'admin',
  password: 'secret',
  updateUrl: 'https://sap.example.com/b1s/v1/ExchangeRates'
};

function makeSignInResponse(cookies: string[]): Response {
  const headers = new Headers();
  for (const cookie of cookies) {
    headers.append('set-cookie', cookie);
  }
  return new Response(null, { status: 200, headers });
}

test('updateRate signs in, extracts cookies, and calls update endpoint', async () => {
  const originalFetch = global.fetch;
  const calls: { url: string; init: RequestInit }[] = [];

  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof URL ? input.toString() : String(input);
    calls.push({ url, init: init ?? {} });

    if (url === CONFIG.signInUrl) {
      return makeSignInResponse([
        'B1SESSION=abc123; Path=/; HttpOnly',
        'ROUTEID=node1; Path=/'
      ]);
    }

    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    const updater = new SapServiceLayerRateUpdater(CONFIG);
    await updater.updateRate(new Date('2021-04-10T00:00:00.000Z'), 615.99);

    assert.equal(calls.length, 2);

    // Sign-in call
    assert.equal(calls[0].url, CONFIG.signInUrl);
    assert.equal(calls[0].init.method, 'POST');
    const signInBody = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(signInBody, {
      CompanyDB: 'TESTDB',
      UserName: 'admin',
      Password: 'secret'
    });

    // Update call
    assert.equal(calls[1].url, CONFIG.updateUrl);
    assert.equal(calls[1].init.method, 'PATCH');
    assert.equal(
      (calls[1].init.headers as Record<string, string>)['Cookie'],
      'B1SESSION=abc123; ROUTEID=node1'
    );
    const updateBody = JSON.parse(calls[1].init.body as string);
    assert.deepEqual(updateBody, {
      Currency: 'USD',
      Rate: '615.99000000',
      RateDate: '20210410'
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('updateRate uses provided currency instead of default USD', async () => {
  const originalFetch = global.fetch;
  let updateBody: Record<string, string> | undefined;

  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof URL ? input.toString() : String(input);

    if (url === CONFIG.signInUrl) {
      return makeSignInResponse(['B1SESSION=xyz; Path=/']);
    }

    updateBody = JSON.parse((init?.body ?? '{}') as string);
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    const updater = new SapServiceLayerRateUpdater(CONFIG);
    await updater.updateRate(new Date('2021-04-10T00:00:00.000Z'), 1.25, 'EUR');
    assert.equal(updateBody?.Currency, 'EUR');
  } finally {
    global.fetch = originalFetch;
  }
});

test('updateRate throws when sign-in fails', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async () =>
    new Response(null, { status: 401, statusText: 'Unauthorized' })) as typeof fetch;

  try {
    const updater = new SapServiceLayerRateUpdater(CONFIG);
    await assert.rejects(
      updater.updateRate(new Date('2021-04-10T00:00:00.000Z'), 615.99),
      /SAP sign-in failed: 401 Unauthorized/
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('updateRate throws when sign-in returns no cookies', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;

  try {
    const updater = new SapServiceLayerRateUpdater(CONFIG);
    await assert.rejects(
      updater.updateRate(new Date('2021-04-10T00:00:00.000Z'), 615.99),
      /SAP sign-in did not return any cookies/
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('updateRate throws when update endpoint fails', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async (input: string | URL | Request) => {
    const url = input instanceof URL ? input.toString() : String(input);
    if (url === CONFIG.signInUrl) {
      return makeSignInResponse(['B1SESSION=abc; Path=/']);
    }
    return new Response(null, { status: 500, statusText: 'Internal Server Error' });
  }) as typeof fetch;

  try {
    const updater = new SapServiceLayerRateUpdater(CONFIG);
    await assert.rejects(
      updater.updateRate(new Date('2021-04-10T00:00:00.000Z'), 615.99),
      /SAP rate update failed: 500 Internal Server Error/
    );
  } finally {
    global.fetch = originalFetch;
  }
});
