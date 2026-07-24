const { loadConfig } = require('./config');
const { scheduleDailyTask, millisecondsUntilNextRun } = require('./scheduler');
const { callWebService } = require('./webServiceClient');

async function main() {
  const config = loadConfig();

  const execute = async () => {
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

main().catch((error) => {
  console.error('[Service-TC] Startup failed:', error);
  process.exitCode = 1;
});
