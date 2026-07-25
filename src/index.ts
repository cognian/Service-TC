import { loadConfig } from './config';
import { BccrExchangeRateProvider } from './bccrExchangeRateProvider';
import { executeExchangeRateSync } from './exchangeRateSync';
import { SapServiceLayerRateUpdater } from './sapServiceLayerRateUpdater';
import { millisecondsUntilNextRun, scheduleDailyTask } from './scheduler';

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.bccrWebServiceUrl || !config.bccrApiToken) {
    throw new Error('Missing bccrWebServiceUrl or bccrApiToken in configuration.');
  }
  if (
    !config.sapSignInUrl ||
    !config.sapUpdateUrl
  ) {
    throw new Error('Missing sapSignInUrl or sapUpdateUrl in configuration.');
  }

  const provider = new BccrExchangeRateProvider(config.bccrWebServiceUrl, config.bccrApiToken);
  const companyUpdaters = config.sapCompanies.map((company) => ({
    companyDB: company.sapCompanyDB,
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
      provider,
      companyUpdaters,
      notificationEmail: config.notificationEmail
    });
  };

  const firstRunInMs = millisecondsUntilNextRun(config.scheduleTime);
  console.log(
    `[Service-TC] Scheduled daily run at ${config.scheduleTime}. First run in ${Math.round(firstRunInMs / 1000)} seconds.`
  );

  scheduleDailyTask(config.scheduleTime, execute);
}

main().catch((error: unknown) => {
  console.error('[Service-TC] Startup failed:', error);
  process.exitCode = 1;
});
