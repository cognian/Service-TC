export interface ExchangeRatePoint {
  date: Date;
  rate: number;
  isStale?: boolean;
}