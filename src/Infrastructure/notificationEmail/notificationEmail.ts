import nodemailer from 'nodemailer';

import { NotificationEmailSender } from '../../Application/interfaces/notificationEmail';
import { NotificationEmailConfig } from '../../Models/config';
import { ExchangeRateSyncSummary } from '../../Models/exchangeRateSync';

export type { ExchangeRateSyncSummary } from '../../Models/exchangeRateSync';

interface CompanySummaryRow {
  companyDB: string;
  updateCount: number;
  firstDate: string;
  lastDate: string;
  latestRate: number;
  isStale: boolean;
}

function buildSummaryText(summary: ExchangeRateSyncSummary): string {
  const lines = [
    'Service-TC exchange-rate update summary',
    '',
    `Date range: ${summary.fromDate} to ${summary.toDate}`,
    `Rates fetched: ${summary.rateCount}`,
    `Companies updated: ${summary.companyCount}`,
    `Total SAP updates: ${summary.updateCount}`,
    `Failed SAP updates: ${summary.errorCount}`,
    `Completed at: ${summary.completedAt}`,
    ''
  ];

  if (summary.updates.length === 0) {
    lines.push('No exchange-rate updates were applied.');
    return lines.join('\n');
  }

  lines.push('Applied updates:');
  for (const update of summary.updates) {
    const staleMarker = update.isStale ? ' (WARNING: rate not from the latest day)' : '';
    lines.push(`- ${update.companyDB} | ${update.date} | ${update.rate}${staleMarker}`);
  }

  if (summary.errors.length > 0) {
    lines.push('');
    lines.push('Failed updates:');
    for (const failedUpdate of summary.errors) {
      lines.push(
        `- ${failedUpdate.companyDB} | ${failedUpdate.date} | ${failedUpdate.rate ?? 'N/A'} | ${failedUpdate.error}`
      );
    }
  }

  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCompanySummaryRows(summary: ExchangeRateSyncSummary): CompanySummaryRow[] {
  const rowsByCompany = new Map<string, CompanySummaryRow>();

  for (const update of summary.updates) {
    const existing = rowsByCompany.get(update.companyDB);
    if (!existing) {
      rowsByCompany.set(update.companyDB, {
        companyDB: update.companyDB,
        updateCount: 1,
        firstDate: update.date,
        lastDate: update.date,
        latestRate: update.rate,
        isStale: Boolean(update.isStale)
      });
      continue;
    }

    existing.updateCount += 1;
    if (update.date < existing.firstDate) {
      existing.firstDate = update.date;
    }
    if (update.date > existing.lastDate) {
      existing.lastDate = update.date;
      existing.latestRate = update.rate;
      existing.isStale = Boolean(update.isStale);
    }
  }

  return Array.from(rowsByCompany.values()).sort((a, b) => a.companyDB.localeCompare(b.companyDB));
}

function buildSummaryHtml(summary: ExchangeRateSyncSummary): string {
  const companyRows = buildCompanySummaryRows(summary);
  const subjectRange = `${escapeHtml(summary.fromDate)} to ${escapeHtml(summary.toDate)}`;
  const completedAt = escapeHtml(summary.completedAt);

  const companyRowsHtml =
    companyRows.length === 0
      ? '<tr><td colspan="5" class="empty-row">No companies were updated.</td></tr>'
      : companyRows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.companyDB)}</td>
                <td>${row.updateCount}</td>
                <td>${escapeHtml(row.firstDate)}</td>
                <td>${escapeHtml(row.lastDate)}</td>
                <td class="${row.isStale ? 'rate-warning' : ''}">${row.latestRate}${
                  row.isStale ? ' &#9888; not the latest day' : ''
                }</td>
              </tr>`
          )
          .join('');

  const errorRowsHtml =
    summary.errors.length === 0
      ? '<tr><td colspan="4" class="empty-row">No update errors.</td></tr>'
      : summary.errors
          .map(
            (failedUpdate) => `
              <tr>
                <td>${escapeHtml(failedUpdate.companyDB)}</td>
                <td>${escapeHtml(failedUpdate.date)}</td>
                <td>${failedUpdate.rate ?? 'N/A'}</td>
                <td>${escapeHtml(failedUpdate.error)}</td>
              </tr>`
          )
          .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Service-TC Exchange Rate Summary</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #eef2f7;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #0f172a;
      }

      .page {
        width: 100%;
        padding: 32px 16px;
      }

      .card {
        max-width: 760px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #dbe3ee;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
      }

      .header {
        background: linear-gradient(120deg, #0b3c5d, #12588b);
        color: #ffffff;
        padding: 24px;
      }

      .header h1 {
        margin: 0 0 6px;
        font-size: 22px;
        line-height: 1.3;
      }

      .header p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }

      .section {
        padding: 20px 24px;
      }

      .stats {
        width: 100%;
        border-collapse: collapse;
      }

      .stats td {
        padding: 8px 0;
        border-bottom: 1px solid #edf2f7;
        font-size: 14px;
      }

      .stats td:first-child {
        color: #475569;
      }

      .stats td:last-child {
        text-align: right;
        font-weight: 600;
      }

      .companies-title {
        margin: 0 0 12px;
        font-size: 16px;
      }

      .companies {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #dbe3ee;
        border-radius: 10px;
        overflow: hidden;
      }

      .companies th,
      .companies td {
        padding: 10px 12px;
        font-size: 13px;
        text-align: left;
        border-bottom: 1px solid #edf2f7;
      }

      .companies th {
        background: #f6f9fc;
        color: #334155;
        font-weight: 700;
      }

      .companies tr:last-child td {
        border-bottom: none;
      }

      .empty-row {
        text-align: center;
        color: #64748b;
      }

      .rate-warning {
        color: #b45309;
        font-weight: 700;
      }

      .footer {
        padding: 16px 24px 24px;
        color: #64748b;
        font-size: 12px;
      }

      @media (max-width: 640px) {
        .section,
        .header,
        .footer {
          padding-left: 16px;
          padding-right: 16px;
        }

        .companies th,
        .companies td {
          padding: 9px 8px;
          font-size: 12px;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <div class="header">
          <h1>Service-TC Exchange Rate Summary</h1>
          <p>Date range: ${subjectRange}</p>
        </div>

        <div class="section">
          <table class="stats" role="presentation">
            <tr>
              <td>Rates fetched</td>
              <td>${summary.rateCount}</td>
            </tr>
            <tr>
              <td>Companies updated</td>
              <td>${summary.companyCount}</td>
            </tr>
            <tr>
              <td>Total SAP updates</td>
              <td>${summary.updateCount}</td>
            </tr>
            <tr>
              <td>Failed SAP updates</td>
              <td>${summary.errorCount}</td>
            </tr>
            <tr>
              <td>Completed at</td>
              <td>${completedAt}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h2 class="companies-title">Company Updates</h2>
          <table class="companies" role="table" aria-label="Company updates">
            <thead>
              <tr>
                <th>Company</th>
                <th>Updates</th>
                <th>First Date</th>
                <th>Last Date</th>
                <th>Latest Rate</th>
              </tr>
            </thead>
            <tbody>${companyRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2 class="companies-title">Update Errors</h2>
          <table class="companies" role="table" aria-label="Update errors">
            <thead>
              <tr>
                <th>Company</th>
                <th>Date</th>
                <th>Rate</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>${errorRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">Generated automatically by Service-TC.</div>
      </div>
    </div>
  </body>
</html>`;
}

export class NodemailerNotificationEmailSender implements NotificationEmailSender {
  async send(config: NotificationEmailConfig, summary: ExchangeRateSyncSummary): Promise<void> {
  console.log('[Service-TC] Preparing to send notification email...');
  const transporter = nodemailer.createTransport({
    // host: config.host,
    // port: config.port,
    // secure: config.secure,
    service: 'gmail',
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
    text: buildSummaryText(summary),
    html: buildSummaryHtml(summary)
  });
  console.log('[Service-TC] Notification email sent successfully.');
  }
}