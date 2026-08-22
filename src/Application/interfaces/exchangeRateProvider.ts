import { ExchangeRatePoint } from '../../Models/exchangeRate';

export type { ExchangeRatePoint } from '../../Models/exchangeRate';

export interface IExchangeRateProvider {
  fetchExchangeRate(from: Date, to: Date): Promise<ExchangeRatePoint[]>;
}
