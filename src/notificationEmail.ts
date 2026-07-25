import nodemailer from 'nodemailer';

import { NotificationEmailConfig } from './config';

export interface ExchangeRateSyncSummary {
  fromDate: string;
  toDate: string;
  rateCount: number;
  companyCount: number;
  updateCount: number;
  completedAt: string;
  updates: Array<{
    companyDB: string;
    date: string;
    rate: number;
  }>;
}

function buildSummaryText(summary: ExchangeRateSyncSummary): string {
  const lines = [
    'Service-TC exchange-rate update summary',
    '',
    `Date range: ${summary.fromDate} to ${summary.toDate}`,
    `Rates fetched: ${summary.rateCount}`,
    `Companies updated: ${summary.companyCount}`,
    `Total SAP updates: ${summary.updateCount}`,
    `Completed at: ${summary.completedAt}`,
    ''
  ];

  if (summary.updates.length === 0) {
    lines.push('No exchange-rate updates were applied.');
    return lines.join('\n');
  }

  lines.push('Applied updates:');
  for (const update of summary.updates) {
    lines.push(`- ${update.companyDB} | ${update.date} | ${update.rate}`);
  }

  return lines.join('\n');
}

export async function sendNotificationEmail(
  config: NotificationEmailConfig,
  summary: ExchangeRateSyncSummary
): Promise<void> {
  console.log('[Service-TC] Preparing to send notification email...');
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.username && config.password
        ? {
            user: config.username,
            pass: config.password
          }
        : undefined
  });

  console.log('[Service-TC] Sending notification email...');
  await transporter.sendMail({
    from: config.from,
    to: config.to.join(', '),
    cc: config.ccs.length > 0 ? config.ccs.join(', ') : undefined,
    bcc: config.bccs.length > 0 ? config.bccs.join(', ') : undefined,
    subject:
      config.subject ||
      `Service-TC exchange-rate update summary ${summary.fromDate} to ${summary.toDate}`,
    text: buildSummaryText(summary)
  });
  console.log('[Service-TC] Notification email sent successfully.');
}