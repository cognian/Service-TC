import fs from 'node:fs';
import path from 'node:path';

import {
  AppConfig,
  ExchangeRateProviderConfig,
  NotificationEmailConfig,
  SapCompanyCredentials
} from '../Models/config';

const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'config.json');

export type {
  AppConfig,
  ExchangeRateProviderConfig,
  NotificationEmailConfig,
  SapCompanyCredentials
} from '../Models/config';

type ConfigFile = Partial<AppConfig>;

function parseCompaniesJson(envValue: string): SapCompanyCredentials[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(envValue);
  } catch {
    throw new Error('SAP_COMPANIES_JSON must be valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('SAP_COMPANIES_JSON must be a JSON array.');
  }

  return parsed as SapCompanyCredentials[];
}

function validateCompanies(
  companies: SapCompanyCredentials[],
  exchangeRateProviders: Record<string, ExchangeRateProviderConfig>
): SapCompanyCredentials[] {
  if (!Array.isArray(companies) || companies.length === 0) {
    throw new Error('At least one SAP company must be configured in sapCompanies.');
  }

  companies.forEach((company, index) => {
    if (!company?.sapCompanyDB || !company?.sapUsername || !company?.sapPassword) {
      throw new Error(
        `Invalid sapCompanies[${index}]. Each company requires sapCompanyDB, sapUsername, and sapPassword.`
      );
    }

    if (!company?.exchangeRateProvider || typeof company.exchangeRateProvider !== 'string') {
      throw new Error(
        `Invalid sapCompanies[${index}]. exchangeRateProvider must reference a key in exchangeRateProviders.`
      );
    }

    if (!exchangeRateProviders[company.exchangeRateProvider]) {
      throw new Error(
        `Invalid sapCompanies[${index}]. exchangeRateProvider "${company.exchangeRateProvider}" is not defined in exchangeRateProviders.`
      );
    }
  });

  return companies;
}

function validateExchangeRateProviders(value: unknown): Record<string, ExchangeRateProviderConfig> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('exchangeRateProviders must be an object mapping provider keys to their configuration.');
  }

  const providers: Record<string, ExchangeRateProviderConfig> = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`exchangeRateProviders.${key} must be an object.`);
    }

    const providerConfig = raw as Record<string, unknown>;

    if (providerConfig.type === 'bccr') {
      const webServiceUrl = typeof providerConfig.webServiceUrl === 'string' ? providerConfig.webServiceUrl : '';
      const apiToken = typeof providerConfig.apiToken === 'string' ? providerConfig.apiToken : '';
      if (!webServiceUrl || !apiToken) {
        throw new Error(`exchangeRateProviders.${key} of type "bccr" requires webServiceUrl and apiToken.`);
      }

      providers[key] = { type: 'bccr', webServiceUrl, apiToken };
    } else if (providerConfig.type === 'hnb') {
      const webServiceUrl = typeof providerConfig.webServiceUrl === 'string' ? providerConfig.webServiceUrl : '';
      const apiToken = typeof providerConfig.apiToken === 'string' ? providerConfig.apiToken : '';
      if (!webServiceUrl || !apiToken) {
        throw new Error(`exchangeRateProviders.${key} of type "hnb" requires webServiceUrl and apiToken.`);
      }

      providers[key] = { type: 'hnb', webServiceUrl, apiToken };
    } else {
      throw new Error(`exchangeRateProviders.${key} has unsupported type "${String(providerConfig.type)}".`);
    }
  }

  return providers;
}

function normalizeRecipientList(value: unknown, fieldName: string, required: boolean): string[] {
  if (value == null) {
    if (required) {
      throw new Error(`notificationEmail.${fieldName} must be a non-empty array of email addresses.`);
    }

    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`notificationEmail.${fieldName} must be an array of non-empty strings.`);
  }

  if (required && value.length === 0) {
    throw new Error(`notificationEmail.${fieldName} must include at least one email address.`);
  }

  return value.map((item) => item.trim());
}

export function validateNotificationEmailConfig(
  value: unknown
): NotificationEmailConfig | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== 'object') {
    throw new Error('notificationEmail must be an object when provided.');
  }

  const config = value as Record<string, unknown>;
  const host = typeof config.host === 'string' ? config.host.trim() : '';
  const from = typeof config.from === 'string' ? config.from.trim() : '';
  const subject = typeof config.subject === 'string' ? config.subject.trim() : undefined;
  const username = typeof config.username === 'string' ? config.username : undefined;
  const password = typeof config.password === 'string' ? config.password : undefined;
  const secure = typeof config.secure === 'boolean' ? config.secure : false;
  const port = Number(config.port);

  if (!host) {
    throw new Error('notificationEmail.host is required.');
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('notificationEmail.port must be a positive integer.');
  }

  if (!from) {
    throw new Error('notificationEmail.from is required.');
  }

  if ((username && !password) || (!username && password)) {
    throw new Error('notificationEmail.username and notificationEmail.password must be provided together.');
  }

  return {
    host,
    port,
    secure,
    username,
    password,
    from,
    to: normalizeRecipientList(config.to, 'to', true),
    ccs: normalizeRecipientList(config.ccs, 'ccs', false),
    bccs: normalizeRecipientList(config.bccs, 'bccs', false),
    subject
  };
}

export function loadConfig(): AppConfig {
  const fileConfig: ConfigFile = fs.existsSync(CONFIG_PATH)
    ? (JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as ConfigFile)
    : {};

  const scheduleTime = process.env.SCHEDULE_TIME || fileConfig.scheduleTime || '06:00';
  const forecastDays = Number(process.env.FORECAST_DAYS ?? fileConfig.forecastDays ?? 5);
  const sapSignInUrl = process.env.SAP_SIGN_IN_URL || fileConfig.sapSignInUrl;
  const sapUpdateUrl = process.env.SAP_UPDATE_URL || fileConfig.sapUpdateUrl;
  const notificationEmail = validateNotificationEmailConfig(
    process.env.NOTIFICATION_EMAIL_JSON
      ? JSON.parse(process.env.NOTIFICATION_EMAIL_JSON)
      : fileConfig.notificationEmail
  );

  const exchangeRateProviders = validateExchangeRateProviders(
    process.env.EXCHANGE_RATE_PROVIDERS_JSON
      ? JSON.parse(process.env.EXCHANGE_RATE_PROVIDERS_JSON)
      : fileConfig.exchangeRateProviders ?? {}
  );

  if (exchangeRateProviders.bccr?.type === 'bccr') {
    exchangeRateProviders.bccr = {
      type: 'bccr',
      webServiceUrl: process.env.BCCR_WEB_SERVICE_URL || exchangeRateProviders.bccr.webServiceUrl,
      apiToken: process.env.BCCR_API_TOKEN || exchangeRateProviders.bccr.apiToken
    };
  }

  if (exchangeRateProviders.hnb?.type === 'hnb') {
    exchangeRateProviders.hnb = {
      type: 'hnb',
      webServiceUrl: process.env.HNB_WEB_SERVICE_URL || exchangeRateProviders.hnb.webServiceUrl,
      apiToken: process.env.HNB_API_TOKEN || exchangeRateProviders.hnb.apiToken
    };
  }

  const envCompanies = process.env.SAP_COMPANIES_JSON
    ? parseCompaniesJson(process.env.SAP_COMPANIES_JSON)
    : undefined;

  const legacyCompanyFromEnv =
    process.env.SAP_COMPANY_DB && process.env.SAP_USERNAME && process.env.SAP_PASSWORD
      ? [
          {
            sapCompanyDB: process.env.SAP_COMPANY_DB,
            sapUsername: process.env.SAP_USERNAME,
            sapPassword: process.env.SAP_PASSWORD,
            exchangeRateProvider: 'bccr'
          }
        ]
      : undefined;

  const legacyCompanyFromFile =
    (fileConfig as Record<string, unknown>).sapCompanyDB &&
    (fileConfig as Record<string, unknown>).sapUsername &&
    (fileConfig as Record<string, unknown>).sapPassword
      ? [
          {
            sapCompanyDB: String((fileConfig as Record<string, unknown>).sapCompanyDB),
            sapUsername: String((fileConfig as Record<string, unknown>).sapUsername),
            sapPassword: String((fileConfig as Record<string, unknown>).sapPassword),
            exchangeRateProvider: 'bccr'
          }
        ]
      : undefined;

  const sapCompanies = validateCompanies(
    envCompanies ?? fileConfig.sapCompanies ?? legacyCompanyFromEnv ?? legacyCompanyFromFile ?? [],
    exchangeRateProviders
  );

  if (!Number.isInteger(forecastDays) || forecastDays < 0) {
    throw new Error('forecastDays must be a non-negative integer.');
  }

  return {
    scheduleTime,
    forecastDays,
    sapSignInUrl,
    sapUpdateUrl,
    sapCompanies,
    exchangeRateProviders,
    notificationEmail
  };
}
