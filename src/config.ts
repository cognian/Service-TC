import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = path.resolve(__dirname, '..', 'config.json');

export interface SapCompanyCredentials {
  sapCompanyDB: string;
  sapUsername: string;
  sapPassword: string;
}

export interface AppConfig {
  scheduleTime: string;
  forecastDays: number;
  bccrWebServiceUrl?: string;
  bccrApiToken?: string;
  sapSignInUrl?: string;
  sapUpdateUrl?: string;
  sapCompanies: SapCompanyCredentials[];
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
    sapCompanies
  };
}
