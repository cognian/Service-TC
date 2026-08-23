export interface ExchangeRateSyncSummary {
  fromDate: string;
  toDate: string;
  rateCount: number;
  companyCount: number;
  updateCount: number;
  errorCount: number;
  completedAt: string;
  updates: Array<{
    companyDB: string;
    date: string;
    rate: number;
  }>;
  errors: Array<{
    companyDB: string;
    date: string;
    rate: number | null;
    error: string;
  }>;
}
