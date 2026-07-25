import assert from 'node:assert/strict';
import test from 'node:test';

import { validateNotificationEmailConfig } from '../src/config';

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