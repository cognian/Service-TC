import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadConfig, validateNotificationEmailConfig } from '../src/Infrastructure/config';

test('validateNotificationEmailConfig returns undefined when section is absent', () => {
  assert.equal(validateNotificationEmailConfig(undefined), undefined);
});

test('validateNotificationEmailConfig accepts a valid notificationEmail section', () => {
  const config = validateNotificationEmailConfig({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: 'mailer',
    password: 'secret',
    from: 'service@example.com',
    to: ['ops@example.com'],
    ccs: ['finance@example.com'],
    bccs: ['audit@example.com'],
    subject: 'Rate sync summary'
  });

  assert.deepEqual(config, {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: 'mailer',
    password: 'secret',
    from: 'service@example.com',
    to: ['ops@example.com'],
    ccs: ['finance@example.com'],
    bccs: ['audit@example.com'],
    subject: 'Rate sync summary'
  });
});

test('validateNotificationEmailConfig rejects incomplete auth settings', () => {
  assert.throws(
    () =>
      validateNotificationEmailConfig({
        host: 'smtp.example.com',
        port: 587,
        from: 'service@example.com',
        to: ['ops@example.com'],
        username: 'mailer'
      }),
    /username and notificationEmail.password must be provided together/
  );
});

test('loadConfig reads the configuration file supplied by path', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'service-tc-'));
  const configPath = path.join(temporaryDirectory, 'custom-config.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      scheduleTime: '07:30',
      forecastDays: 0,
      sapSignInUrl: 'https://sap.example.com/login',
      sapUpdateUrl: 'https://sap.example.com/update',
      exchangeRateProviders: {
        mex: {
          type: 'mex',
          webServiceUrl: 'https://banxico.example.com/rates'
        }
      },
      sapCompanies: [
        {
          sapCompanyDB: 'COMPANY',
          sapUsername: 'user',
          sapPassword: 'password',
          exchangeRateProvider: 'mex'
        }
      ]
    })
  );

  try {
    const config = loadConfig(configPath);

    assert.equal(config.scheduleTime, '07:30');
    assert.equal(config.sapCompanies[0].exchangeRateProvider, 'mex');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});