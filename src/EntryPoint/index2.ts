import { executeExchangeRateSync } from '../Application/use-cases/exchangeRateSync';
import { NodemailerNotificationEmailSender } from '../Infrastructure/notificationEmail/notificationEmail';
import { loadConfig } from '../Infrastructure/config';
import { createExchangeRateProvider } from '../Infrastructure/exchangeRateProvider/exchangeRateProviderFactory';
import { SapServiceLayerRateUpdater } from '../Infrastructure/exchangeRateUpdater/sapServiceLayerRateUpdater';

async function main(): Promise<void> {
  const config = loadConfig();

  if (
    !config.sapSignInUrl ||
    !config.sapUpdateUrl
  ) {
    throw new Error('Missing sapSignInUrl or sapUpdateUrl in configuration.');
  }

  const companyUpdaters = config.sapCompanies.map((company) => ({
    companyDB: company.sapCompanyDB,
    provider: createExchangeRateProvider(config.exchangeRateProviders[company.exchangeRateProvider]),
    updater: new SapServiceLayerRateUpdater({
      signInUrl: config.sapSignInUrl as string,
      companyDB: company.sapCompanyDB,
      username: company.sapUsername,
      password: company.sapPassword,
      updateUrl: config.sapUpdateUrl as string
    })
  }));

  const execute = async (): Promise<void> => {
    await executeExchangeRateSync({
      forecastDays: config.forecastDays,
      companyUpdaters,
      notificationEmail: config.notificationEmail,
      notificationEmailSender: new NodemailerNotificationEmailSender()
    });
  };

  await execute(); // Execute immediately on startup
}

main().catch((error: unknown) => {
  console.error('[Service-TC] Startup failed:', error);
  process.exitCode = 1;
});
