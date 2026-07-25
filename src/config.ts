import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = path.resolve(__dirname, '..', 'config.json');

export interface SapCompanyCredentials {
  sapCompanyDB: string;
  sapUsername: string;
  sapPassword: string;
}

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
  bccrWebServiceUrl?: string;
  bccrApiToken?: string;
  sapSignInUrl?: string;
  sapUpdateUrl?: string;
  sapCompanies: SapCompanyCredentials[];
  notificationEmail?: NotificationEmailConfig;
}

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

function validateCompanies(companies: SapCompanyCredentials[]): SapCompanyCredentials[] {
  if (!Array.isArray(companies) || companies.length === 0) {
    throw new Error('At least one SAP company must be configured in sapCompanies.');
  }

  companies.forEach((company, index) => {
    if (!company?.sapCompanyDB || !company?.sapUsername || !company?.sapPassword) {
      throw new Error(
        `Invalid sapCompanies[${index}]. Each company requires sapCompanyDB, sapUsername, and sapPassword.`
      );
    }
  });

  return companies;
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
  const bccrWebServiceUrl = process.env.BCCR_WEB_SERVICE_URL || fileConfig.bccrWebServiceUrl;
  const bccrApiToken = process.env.BCCR_API_TOKEN || fileConfig.bccrApiToken;
  const sapSignInUrl = process.env.SAP_SIGN_IN_URL || fileConfig.sapSignInUrl;
  const sapUpdateUrl = process.env.SAP_UPDATE_URL || fileConfig.sapUpdateUrl;
  const notificationEmail = validateNotificationEmailConfig(
    process.env.NOTIFICATION_EMAIL_JSON
      ? JSON.parse(process.env.NOTIFICATION_EMAIL_JSON)
      : fileConfig.notificationEmail
  );

  const envCompanies = process.env.SAP_COMPANIES_JSON
    ? parseCompaniesJson(process.env.SAP_COMPANIES_JSON)
    : undefined;

  const legacyCompanyFromEnv =
    process.env.SAP_COMPANY_DB && process.env.SAP_USERNAME && process.env.SAP_PASSWORD
      ? [
          {
            sapCompanyDB: process.env.SAP_COMPANY_DB,
            sapUsername: process.env.SAP_USERNAME,
            sapPassword: process.env.SAP_PASSWORD
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
            sapPassword: String((fileConfig as Record<string, unknown>).sapPassword)
          }
        ]
      : undefined;

  const sapCompanies = validateCompanies(
    envCompanies ?? fileConfig.sapCompanies ?? legacyCompanyFromEnv ?? legacyCompanyFromFile ?? []
  );

  if (!Number.isInteger(forecastDays) || forecastDays < 0) {
    throw new Error('forecastDays must be a non-negative integer.');
  }

  return {
    scheduleTime,
    forecastDays,
    bccrWebServiceUrl,
    bccrApiToken,
    sapSignInUrl,
    sapUpdateUrl,
    sapCompanies,
    notificationEmail
  };
}
