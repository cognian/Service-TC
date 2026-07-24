export interface ExchangeRatePoint {
  date: Date;
  rate: number;
}

export interface IExchangeRateProvider {
  fetchExchangeRate(from: Date, to: Date): Promise<ExchangeRatePoint[]>;
}
