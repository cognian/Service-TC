const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.resolve(__dirname, '..', 'config.json');

function loadConfig() {
  const fileConfig = fs.existsSync(CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    : {};

  const scheduleTime = process.env.SCHEDULE_TIME || fileConfig.scheduleTime || '06:00';
  const webServiceUrl = process.env.WEB_SERVICE_URL || fileConfig.webServiceUrl;

  if (!webServiceUrl) {
    throw new Error('Missing webServiceUrl. Provide it in config.json or WEB_SERVICE_URL.');
  }

  return {
    scheduleTime,
    webServiceUrl
  };
}

module.exports = {
  loadConfig
};
