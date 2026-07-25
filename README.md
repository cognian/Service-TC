# Service-TC

TypeScript application designed to run as a Windows service. It schedules a daily call to a configured Web Service.

## Configuration

Update `./config.json`:

```json
{
  "scheduleTime": "06:00",
  "webServiceUrl": "https://example.com/health",
  "bccrWebServiceUrl": "https://example.com/bccr/exchange-rate",
  "bccrApiToken": "your-api-token"
}
```

- `scheduleTime`: daily execution time in `HH:mm` (24h format).
- `webServiceUrl`: URL called once per day at the configured time.
- `bccrWebServiceUrl`: BCCR exchange-rate endpoint URL used by `BccrExchangeRateProvider`.
- `bccrApiToken`: API token sent as a bearer token by `BccrExchangeRateProvider`.

Environment variables override file values:

- `SCHEDULE_TIME`
- `WEB_SERVICE_URL`
- `BCCR_WEB_SERVICE_URL`
- `BCCR_API_TOKEN`

## Run

```bash
npm start
```

To run as a Windows service, install and register this Node process with your preferred Windows service manager (for example NSSM or `sc.exe`) and point it to `npm start` (or build first and run `node dist/index.js`).

## Windows Service

This project includes built-in Windows service management using `node-windows`.

Run these commands from an elevated terminal on Windows:

```bash
npm run service:install
npm run service:start
npm run service:stop
npm run service:restart
npm run service:uninstall
```

Notes:

- `service:install` installs and starts the service.
- Service commands only work on Windows (`win32`).
- Optional environment variables to customize service metadata:
  - `SERVICE_NAME` (default: `Service-TC`)
  - `SERVICE_DESCRIPTION` (default: daily exchange-rate synchronization description)
