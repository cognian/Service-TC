import { loadConfig } from './config';
import { BccrExchangeRateProvider } from './bccrExchangeRateProvider';
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
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // toDate is inclusive: forecastDays=0 fetches today only, forecastDays=5 fetches today + 5 days.
    const toDate = new Date(today);
    toDate.setUTCDate(today.getUTCDate() + config.forecastDays);

    console.log(
      `[Service-TC] Fetching BCCR exchange rates from ${today.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}.`
    );

    const rates = await provider.fetchExchangeRate(today, toDate);
    console.log(`[Service-TC] Received ${rates.length} rate(s) from BCCR.`);

    for (const point of rates) {
      console.log(
        `[Service-TC] Updating rate for ${point.date.toISOString().slice(0, 10)}: ${point.rate}`
      );

      for (const companyUpdater of companyUpdaters) {
        console.log(
          `[Service-TC] Applying rate to company ${companyUpdater.companyDB} for ${point.date.toISOString().slice(0, 10)}.`
        );
        await companyUpdater.updater.updateRate(point.date, point.rate);
      }
    }

    console.log('[Service-TC] All rates updated successfully.');
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
