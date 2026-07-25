import { NotificationEmailConfig } from './config';
import { ExchangeRatePoint, IExchangeRateProvider } from './exchangeRateProvider';
import { IExchangeRateUpdater } from './exchangeRateUpdater';
import { ExchangeRateSyncSummary, sendNotificationEmail } from './notificationEmail';

interface CompanyUpdater {
  companyDB: string;
  updater: IExchangeRateUpdater;
}

interface LoggerLike {
  log(message: string): void;
  error(message: string, error: unknown): void;
}

interface ExecuteExchangeRateSyncOptions {
  forecastDays: number;
  provider: IExchangeRateProvider;
  companyUpdaters: CompanyUpdater[];
  notificationEmail?: NotificationEmailConfig;
  now?: Date;
  logger?: LoggerLike;
  sendNotificationEmailFn?: (
    config: NotificationEmailConfig,
    summary: ExchangeRateSyncSummary
  ) => Promise<void>;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function executeExchangeRateSync({
  forecastDays,
  provider,
  companyUpdaters,
  notificationEmail,
  now = new Date(),
  logger = console,
  sendNotificationEmailFn = sendNotificationEmail
}: ExecuteExchangeRateSyncOptions): Promise<ExchangeRateSyncSummary> {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const toDate = new Date(today);
  toDate.setUTCDate(today.getUTCDate() + forecastDays);

  logger.log(
    `[Service-TC] Fetching BCCR exchange rates from ${formatDate(today)} to ${formatDate(toDate)}.`
  );

  const rates = await provider.fetchExchangeRate(today, toDate);
  logger.log(`[Service-TC] Received ${rates.length} rate(s) from BCCR.`);

  const updates: ExchangeRateSyncSummary['updates'] = [];

  for (const point of rates) {
    logger.log(`[Service-TC] Updating rate for ${formatDate(point.date)}: ${point.rate}`);

    for (const companyUpdater of companyUpdaters) {
      logger.log(
        `[Service-TC] Applying rate to company ${companyUpdater.companyDB} for ${formatDate(point.date)}.`
      );
      await companyUpdater.updater.updateRate(point.date, point.rate);
      updates.push({
        companyDB: companyUpdater.companyDB,
        date: formatDate(point.date),
        rate: point.rate
      });
    }
  }

  const summary: ExchangeRateSyncSummary = {
    fromDate: formatDate(today),
    toDate: formatDate(toDate),
    rateCount: rates.length,
    companyCount: companyUpdaters.length,
    updateCount: updates.length,
    completedAt: new Date().toISOString(),
    updates
  };

  logger.log('[Service-TC] All rates updated successfully.');
  logger.log(`[Service-TC] Exchange Rate Sync Summary: ${JSON.stringify(summary)}`);
  logger.log(`[Service-TC] Email: ${JSON.stringify(notificationEmail)}`);

  if (notificationEmail) {
    try {
      logger.log('[Service-TC] Sending notification email...');
      await sendNotificationEmailFn(notificationEmail, summary);
      logger.log('[Service-TC] Notification email sent successfully.');
    } catch (error: unknown) {
      logger.error('[Service-TC] Failed to send notification email:', error);
    }
  }

  return summary;
}