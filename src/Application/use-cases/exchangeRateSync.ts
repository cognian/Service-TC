import { NotificationEmailConfig } from '../../Models/config';
import { ExchangeRateSyncSummary } from '../../Models/exchangeRateSync';
import { ExchangeRatePoint, IExchangeRateProvider } from '../interfaces/exchangeRateProvider';
import { NotificationEmailSender } from '../interfaces/notificationEmail';
import { IExchangeRateUpdater } from '../interfaces/exchangeRateUpdater';

interface CompanyUpdater {
  companyDB: string;
  provider: IExchangeRateProvider;
  updater: IExchangeRateUpdater;
}

interface LoggerLike {
  log(message: string): void;
  error(message: string, error: unknown): void;
}

interface ExecuteExchangeRateSyncOptions {
  forecastDays: number;
  companyUpdaters: CompanyUpdater[];
  notificationEmail?: NotificationEmailConfig;
  now?: Date;
  logger?: LoggerLike;
  notificationEmailSender?: NotificationEmailSender;
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
  companyUpdaters,
  notificationEmail,
  now = new Date(),
  logger = console,
  notificationEmailSender
}: ExecuteExchangeRateSyncOptions): Promise<ExchangeRateSyncSummary> {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const toDate = new Date(today);
  toDate.setUTCDate(today.getUTCDate() + forecastDays);

  const fromDate = new Date(today);
  const exchangeRateToDate = new Date(today);

  const ratesByProvider = new Map<IExchangeRateProvider, ExchangeRatePoint[]>();

  async function getRatesForProvider(provider: IExchangeRateProvider): Promise<ExchangeRatePoint[]> {
    const cached = ratesByProvider.get(provider);
    if (cached) {
      return cached;
    }

    logger.log(
      `[Service-TC] Fetching exchange rates from ${formatDate(fromDate)} to ${formatDate(exchangeRateToDate)}.`
    );
    const rates = await provider.fetchExchangeRate(fromDate, exchangeRateToDate);
    logger.log(`[Service-TC] Received ${rates.length} rate(s).`);
    ratesByProvider.set(provider, rates);
    return rates;
  }

  const updates: ExchangeRateSyncSummary['updates'] = [];
  const errors: ExchangeRateSyncSummary['errors'] = [];

  for (const companyUpdater of companyUpdaters) {
    const rates = await getRatesForProvider(companyUpdater.provider);
    const todayRate = rates.find((point) => formatDate(point.date) === formatDate(today)) ?? rates[0];

    if (!todayRate) {
      logger.log(
        `[Service-TC] No exchange rate found for today for company ${companyUpdater.companyDB}. No updates were applied.`
      );
      errors.push({
        companyDB: companyUpdater.companyDB,
        date: formatDate(today),
        rate: null,
        error: 'No exchange rate found for today. No updates were applied.'
      });
      continue;
    }

    for (let offset = 0; offset <= forecastDays; offset += 1) {
      const targetDate = new Date(today);
      targetDate.setUTCDate(today.getUTCDate() + offset);
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

  const rateCount = Array.from(ratesByProvider.values()).reduce((total, rates) => total + rates.length, 0);

  const summary: ExchangeRateSyncSummary = {
    fromDate: formatDate(today),
    toDate: formatDate(toDate),
    rateCount,
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
      await notificationEmailSender?.send(notificationEmail, summary);
      logger.log('[Service-TC] Notification email sent successfully.');
    } catch (error: unknown) {
      logger.error('[Service-TC] Failed to send notification email:', error);
    }
  }

  return summary;
}