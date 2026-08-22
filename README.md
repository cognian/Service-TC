# Service-TC

TypeScript application designed to run as a Windows service. It schedules a daily call to a configured Web Service.

## Configuration

Update `./config.json`:

```json
{
  "scheduleTime": "06:00",
  "forecastDays": 5,
  "bccrWebServiceUrl": "https://example.com/bccr/exchange-rate",
  "bccrApiToken": "your-api-token",
  "sapSignInUrl": "https://your-sap-host:50000/b1s/v1/Login",
  "sapUpdateUrl": "https://your-sap-host:50000/b1s/v1/SBOBobService_GetCurrencyRate",
  "sapCompanies": [
    {
      "sapCompanyDB": "COMPANY_A",
      "sapUsername": "userA",
      "sapPassword": "passwordA"
    },
    {
      "sapCompanyDB": "COMPANY_B",
      "sapUsername": "userB",
      "sapPassword": "passwordB"
    }
  ],
  "notificationEmail": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "username": "mailer-user",
    "password": "mailer-password",
    "from": "service-tc@example.com",
    "to": ["ops@example.com"],
    "ccs": ["finance@example.com"],
    "bccs": ["audit@example.com"]
  }
}
```

- `scheduleTime`: daily execution time in `HH:mm` (24h format).
- `forecastDays`: days ahead to fetch from BCCR (inclusive range from today).
- `bccrWebServiceUrl`: BCCR exchange-rate endpoint URL used by `BccrExchangeRateProvider`.
- `bccrApiToken`: API token sent as a bearer token by `BccrExchangeRateProvider`.
- `sapSignInUrl`: SAP Service Layer login endpoint.
- `sapUpdateUrl`: SAP Service Layer rate update endpoint.
- `sapCompanies`: array of companies to update. Each company must include `sapCompanyDB`, `sapUsername`, and `sapPassword`.
- `notificationEmail`: optional SMTP settings used to send a summary email after a successful synchronization. If omitted, no email is sent.

The service fetches exchange rates once per run and applies each rate to every configured SAP company.

Environment variables override file values:

- `SCHEDULE_TIME`
- `FORECAST_DAYS`
- `BCCR_WEB_SERVICE_URL`
- `BCCR_API_TOKEN`
- `SAP_SIGN_IN_URL`
- `SAP_UPDATE_URL`
- `SAP_COMPANIES_JSON` (JSON array with company credentials)
- `NOTIFICATION_EMAIL_JSON` (JSON object with the same shape as `notificationEmail`)

Backward-compatible single-company environment variables are still accepted:

- `SAP_COMPANY_DB`
- `SAP_USERNAME`
- `SAP_PASSWORD`

## Run

```bash
npm start
```

To run as a Windows service, install and register this Node process with your preferred Windows service manager (for example NSSM or `sc.exe`) and point it to `npm start` (or build first and run `node dist/EntryPoint/index.js`).

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
