import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = path.resolve(__dirname, '..', 'config.json');

export interface AppConfig {
  scheduleTime: string;
  webServiceUrl: string;
  bccrWebServiceUrl?: string;
  bccrApiToken?: string;
  sapSignInUrl?: string;
  sapCompanyDB?: string;
  sapUsername?: string;
  sapPassword?: string;
  sapUpdateUrl?: string;
}

type ConfigFile = Partial<AppConfig>;

export function loadConfig(): AppConfig {
  const fileConfig: ConfigFile = fs.existsSync(CONFIG_PATH)
    ? (JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as ConfigFile)
    : {};

  const scheduleTime = process.env.SCHEDULE_TIME || fileConfig.scheduleTime || '06:00';
  const webServiceUrl = process.env.WEB_SERVICE_URL || fileConfig.webServiceUrl;
  const bccrWebServiceUrl = process.env.BCCR_WEB_SERVICE_URL || fileConfig.bccrWebServiceUrl;
  const bccrApiToken = process.env.BCCR_API_TOKEN || fileConfig.bccrApiToken;
  const sapSignInUrl = process.env.SAP_SIGN_IN_URL || fileConfig.sapSignInUrl;
  const sapCompanyDB = process.env.SAP_COMPANY_DB || fileConfig.sapCompanyDB;
  const sapUsername = process.env.SAP_USERNAME || fileConfig.sapUsername;
  const sapPassword = process.env.SAP_PASSWORD || fileConfig.sapPassword;
  const sapUpdateUrl = process.env.SAP_UPDATE_URL || fileConfig.sapUpdateUrl;

  if (!webServiceUrl) {
    throw new Error('Missing webServiceUrl. Provide it in config.json or WEB_SERVICE_URL.');
  }

  return {
    scheduleTime,
    webServiceUrl,
    bccrWebServiceUrl,
    bccrApiToken,
    sapSignInUrl,
    sapCompanyDB,
    sapUsername,
    sapPassword,
    sapUpdateUrl
  };
}
