import assert from 'node:assert/strict';
import test from 'node:test';

import { executeExchangeRateSync } from '../src/exchangeRateSync';
import { IExchangeRateUpdater } from '../src/exchangeRateUpdater';

test('executeExchangeRateSync sends a summary email when notificationEmail is configured', async () => {
  const updateCalls: Array<{ date: string; rate: number }> = [];
  const sentSummaries: Array<{ config: unknown; summary: { updateCount: number; rateCount: number } }> = [];

  const updater: IExchangeRateUpdater = {
    async updateRate(date: Date, rate: number): Promise<void> {
      updateCalls.push({ date: date.toISOString().slice(0, 10), rate });
    }
  };

  const summary = await executeExchangeRateSync({
    forecastDays: 1,
    now: new Date('2026-07-25T12:00:00.000Z'),
    provider: {
      async fetchExchangeRate() {
        return [
          { date: new Date('2026-07-25T00:00:00.000Z'), rate: 500.25 },
          { date: new Date('2026-07-26T00:00:00.000Z'), rate: 501.75 }
        ];
      }
    },
    companyUpdaters: [{ companyDB: 'SBODEMO', updater }],
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
    sendNotificationEmailFn: async (config, notificationSummary) => {
      sentSummaries.push({
        config,
        summary: {
          updateCount: notificationSummary.updateCount,
          rateCount: notificationSummary.rateCount
        }
      });
    }
  });

  assert.equal(updateCalls.length, 2);
  assert.equal(summary.updateCount, 2);
  assert.equal(summary.rateCount, 2);
  assert.equal(sentSummaries.length, 1);
  assert.equal(sentSummaries[0].summary.updateCount, 2);
});

test('executeExchangeRateSync skips email when notificationEmail is not configured', async () => {
  let emailSent = false;

  await executeExchangeRateSync({
    forecastDays: 0,
    now: new Date('2026-07-25T12:00:00.000Z'),
    provider: {
      async fetchExchangeRate() {
        return [];
      }
    },
    companyUpdaters: [],
    logger: {
      log(): void {},
      error(): void {}
    },
    sendNotificationEmailFn: async () => {
      emailSent = true;
    }
  });

  assert.equal(emailSent, false);
});