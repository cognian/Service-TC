import { loadConfig } from './config';
import { millisecondsUntilNextRun, scheduleDailyTask } from './scheduler';
import { callWebService } from './webServiceClient';

async function main(): Promise<void> {
  const config = loadConfig();

  const execute = async (): Promise<void> => {
    console.log(`[Service-TC] Calling web service: ${config.webServiceUrl}`);
    await callWebService(config.webServiceUrl);
    console.log('[Service-TC] Web service call completed successfully.');
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
