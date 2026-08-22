import { NotificationEmailConfig } from '../../Models/config';
import { ExchangeRateSyncSummary } from '../../Models/exchangeRateSync';

export interface NotificationEmailSender {
  send(config: NotificationEmailConfig, summary: ExchangeRateSyncSummary): Promise<void>;
}