export interface SapCompanyCredentials {
  sapCompanyDB: string;
  sapUsername: string;
  sapPassword: string;
  exchangeRateProvider: string;
}

export interface BccrExchangeRateProviderConfig {
  type: 'bccr';
  webServiceUrl: string;
  apiToken: string;
}

export interface HnbExchangeRateProviderConfig {
  type: 'hnb';
  webServiceUrl: string;
  apiToken: string;
}

export interface MexExchangeRateProviderConfig {
  type: 'mex';
  webServiceUrl: string;
  apiToken?: string;
}

export type ExchangeRateProviderConfig =
  | BccrExchangeRateProviderConfig
  | HnbExchangeRateProviderConfig
  | MexExchangeRateProviderConfig;

export interface NotificationEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  from: string;
  to: string[];
  ccs: string[];
  bccs: string[];
  subject?: string;
}

export interface AppConfig {
  scheduleTime: string;
  forecastDays: number;
  sapSignInUrl?: string;
  sapUpdateUrl?: string;
  sapCompanies: SapCompanyCredentials[];
  exchangeRateProviders: Record<string, ExchangeRateProviderConfig>;
  notificationEmail?: NotificationEmailConfig;
}