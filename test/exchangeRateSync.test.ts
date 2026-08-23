import assert from 'node:assert/strict';
import test from 'node:test';

import { executeExchangeRateSync } from '../src/Application/use-cases/exchangeRateSync';
import { IExchangeRateUpdater } from '../src/Application/interfaces/exchangeRateUpdater';

test('executeExchangeRateSync sends a summary email when notificationEmail is configured', async () => {
  const updateCalls: Array<{ date: string; rate: number }> = [];
  const fetchRanges: Array<{ from: string; to: string }> = [];
  const sentSummaries: Array<{
    config: unknown;
    summary: { updateCount: number; rateCount: number; errorCount: number };
  }> = [];

  const updater: IExchangeRateUpdater = {
    async updateRate(date: Date, rate: number): Promise<void> {
      updateCalls.push({ date: date.toISOString().slice(0, 10), rate });
    }
  };

  const summary = await executeExchangeRateSync({
    forecastDays: 1,
    now: new Date('2026-07-25T12:00:00.000Z'),
    companyUpdaters: [
      {
        companyDB: 'SBODEMO',
        provider: {
          async fetchExchangeRate(from, to) {
            fetchRanges.push({
              from: from.toISOString().slice(0, 10),
              to: to.toISOString().slice(0, 10)
            });
            return [
              { date: new Date('2026-07-25T00:00:00.000Z'), rate: 500.25 }
            ];
          }
        },
        updater
      }
    ],
    notificationEmail: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      from: 'service@example.com',
      to: ['ops@example.com'],
      ccs: ['finance@example.com'],
      bccs: ['audit@example.com']
    },
    logger: {
      log(): void {},
      error(): void {}
    },
    notificationEmailSender: {
      send: async (config, notificationSummary) => {
        sentSummaries.push({
          config,
          summary: {
            updateCount: notificationSummary.updateCount,
            rateCount: notificationSummary.rateCount,
            errorCount: notificationSummary.errorCount
          }
        });
      }
    }
  });

  assert.deepEqual(fetchRanges, [{ from: '2026-07-25', to: '2026-07-25' }]);
  assert.equal(updateCalls.length, 2);
  assert.deepEqual(updateCalls, [
    { date: '2026-07-25', rate: 500.25 },
    { date: '2026-07-26', rate: 500.25 }
  ]);
  assert.equal(summary.updateCount, 2);
  assert.equal(summary.errorCount, 0);
  assert.equal(summary.rateCount, 1);
  assert.equal(sentSummaries.length, 1);
  assert.equal(sentSummaries[0].summary.updateCount, 2);
  assert.equal(sentSummaries[0].summary.errorCount, 0);
});

test('executeExchangeRateSync skips email when notificationEmail is not configured', async () => {
  let emailSent = false;

  await executeExchangeRateSync({
    forecastDays: 0,
    now: new Date('2026-07-25T12:00:00.000Z'),
    companyUpdaters: [],
    logger: {
      log(): void {},
      error(): void {}
    },
    notificationEmailSender: {
      send: async () => {
        emailSent = true;
      }
    }
  });

  assert.equal(emailSent, false);
});

test('executeExchangeRateSync continues after update errors and reports failures in summary', async () => {
  const successfulUpdates: Array<{ companyDB: string; date: string; rate: number }> = [];

  const failingUpdater: IExchangeRateUpdater = {
    async updateRate(date: Date): Promise<void> {
      if (date.toISOString().slice(0, 10) === '2026-07-26') {
        throw new Error('SAP temporary failure');
      }
    }
  };

  const okUpdater: IExchangeRateUpdater = {
    async updateRate(date: Date, rate: number): Promise<void> {
      successfulUpdates.push({
        companyDB: 'SBODEMO_OK',
        date: date.toISOString().slice(0, 10),
        rate
      });
    }
  };

  const sharedProvider = {
    async fetchExchangeRate() {
      return [{ date: new Date('2026-07-25T00:00:00.000Z'), rate: 498.1 }];
    }
  };

  const summary = await executeExchangeRateSync({
    forecastDays: 2,
    now: new Date('2026-07-25T12:00:00.000Z'),
    companyUpdaters: [
      { companyDB: 'SBODEMO_FAIL', provider: sharedProvider, updater: failingUpdater },
      { companyDB: 'SBODEMO_OK', provider: sharedProvider, updater: okUpdater }
    ],
    logger: {
      log(): void {},
      error(): void {}
    }
  });

  assert.equal(summary.rateCount, 1);
  assert.equal(summary.updateCount, 5);
  assert.equal(summary.errorCount, 1);
  assert.equal(summary.errors.length, 1);
  assert.deepEqual(summary.errors[0], {
    companyDB: 'SBODEMO_FAIL',
    date: '2026-07-26',
    rate: 498.1,
    error: 'SAP temporary failure'
  });

  assert.equal(successfulUpdates.length, 3);
});

test('executeExchangeRateSync reports companies with no exchange rate and does not update them', async () => {
  let updateCalled = false;
  let sentSummary: { errorCount: number; errors: Array<{ companyDB: string; rate: number | null; error: string }> } | undefined;

  const summary = await executeExchangeRateSync({
    forecastDays: 0,
    now: new Date('2026-07-25T12:00:00.000Z'),
    companyUpdaters: [
      {
        companyDB: 'SBODEMO_NO_RATE',
        provider: {
          async fetchExchangeRate() {
            return [];
          }
        },
        updater: {
          async updateRate(): Promise<void> {
            updateCalled = true;
          }
        }
      }
    ],
    notificationEmail: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      from: 'service@example.com',
      to: ['ops@example.com'],
      ccs: [],
      bccs: []
    },
    logger: {
      log(): void {},
      error(): void {}
    },
    notificationEmailSender: {
      async send(_config, notificationSummary) {
        sentSummary = notificationSummary;
      }
    }
  });

  assert.equal(updateCalled, false);
  assert.equal(summary.updateCount, 0);
  assert.equal(summary.errorCount, 1);
  assert.deepEqual(summary.errors[0], {
    companyDB: 'SBODEMO_NO_RATE',
    date: '2026-07-25',
    rate: null,
    error: 'No exchange rate found for today. No updates were applied.'
  });
  assert.equal(sentSummary?.errorCount, 1);
  assert.equal(sentSummary?.errors[0].companyDB, 'SBODEMO_NO_RATE');
});