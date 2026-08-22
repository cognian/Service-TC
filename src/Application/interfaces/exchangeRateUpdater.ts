export interface IExchangeRateUpdater {
  updateRate(date: Date, rate: number, currency?: string): Promise<void>;
}
