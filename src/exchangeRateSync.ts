import { NotificationEmailConfig } from './config';
import { IExchangeRateProvider } from './exchangeRateProvider';
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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return JSON.stringify(error);
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

  const bccrFromDate = new Date(today);
  const bccrToDate = new Date(today);

  logger.log(
    `[Service-TC] Fetching BCCR exchange rates from ${formatDate(bccrFromDate)} to ${formatDate(bccrToDate)}.`
  );

  const rates = await provider.fetchExchangeRate(bccrFromDate, bccrToDate);
  logger.log(`[Service-TC] Received ${rates.length} rate(s) from BCCR.`);

  const updates: ExchangeRateSyncSummary['updates'] = [];
  const errors: ExchangeRateSyncSummary['errors'] = [];

  const todayRate = rates.find((point) => formatDate(point.date) === formatDate(today)) ?? rates[0];

  if (todayRate) {
    for (let offset = 0; offset <= forecastDays; offset += 1) {
      const targetDate = new Date(today);
      targetDate.setUTCDate(today.getUTCDate() + offset);
      logger.log(`[Service-TC] Updating forecast date ${formatDate(targetDate)} with rate ${todayRate.rate}.`);

      for (const companyUpdater of companyUpdaters) {
        logger.log(
          `[Service-TC] Applying rate to company ${companyUpdater.companyDB} for ${formatDate(targetDate)}.`
        );

        try {
          await companyUpdater.updater.updateRate(targetDate, todayRate.rate);
          updates.push({
            companyDB: companyUpdater.companyDB,
            date: formatDate(targetDate),
            rate: todayRate.rate
          });
        } catch (error: unknown) {
          logger.error(
            `[Service-TC] Failed to update company ${companyUpdater.companyDB} for ${formatDate(targetDate)}.`,
            error
          );
          errors.push({
            companyDB: companyUpdater.companyDB,
            date: formatDate(targetDate),
            rate: todayRate.rate,
            error: formatError(error)
          });
        }
      }
    }
  } else {
    logger.log('[Service-TC] No BCCR rate found for today. No updates were applied.');
  }

  const summary: ExchangeRateSyncSummary = {
    fromDate: formatDate(today),
    toDate: formatDate(toDate),
    rateCount: rates.length,
    companyCount: companyUpdaters.length,
    updateCount: updates.length,
    errorCount: errors.length,
    completedAt: new Date().toISOString(),
    updates,
    errors
  };

  if (errors.length === 0) {
    logger.log('[Service-TC] All rates updated successfully.');
  } else {
    logger.log(`[Service-TC] Completed with ${errors.length} failed update(s).`);
  }
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