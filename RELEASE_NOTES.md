# Service-TC Release Notes

## 1.0.0 - Unreleased

Initial structured release of Service-TC, a TypeScript service that retrieves exchange rates and updates SAP Service Layer companies on a daily schedule.

### Added

- Support for multiple SAP companies in a single configuration.
- Independent exchange-rate provider selection per SAP company.
- BCCR exchange-rate provider.
- HNB exchange-rate provider.
- Banxico MEX exchange-rate provider using:
  - Date ranges in the request path: `/datos/YYYY-MM-DD/YYYY-MM-DD`.
  - The `Bmx-Token` HTTP request header for authentication.
- HTML summary emails after successful synchronization.
- Configurable notification email recipients, CCs, BCCs, subject, and SMTP settings.
- Custom configuration-file selection from the command line:

  ```bash
  npm start -- ./config.production.json
  ```

- Custom configuration-file support for Windows service installation:

  ```bash
  npm run service:install -- ./config.production.json
  ```

### Changed

- Reorganized the source code into explicit layers:
  - `EntryPoint`: application launchers, scheduling, and Windows service management.
  - `Application/interfaces`: contracts used by the application.
  - `Application/use-cases`: synchronization business logic.
  - `Infrastructure`: concrete API, SAP, email, and configuration implementations grouped by interface.
  - `Models`: shared domain and configuration models.
- Exchange rates are fetched once per synchronization and applied to every configured SAP company.
- The current day's rate is reused across the configured forecast range when required by the synchronization workflow.
- Configuration values can be overridden with environment variables.
- Windows service registration stores the selected configuration path for the service process.

### Configuration

The configuration now uses named providers under `exchangeRateProviders`, with each company referring to a provider key through `exchangeRateProvider`.

Example:

```json
{
  "exchangeRateProviders": {
    "mex": {
      "type": "mex",
      "webServiceUrl": "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos",
      "apiToken": "your-banxico-token"
    }
  },
  "sapCompanies": [
    {
      "sapCompanyDB": "COMPANY_A",
      "sapUsername": "userA",
      "sapPassword": "passwordA",
      "exchangeRateProvider": "mex"
    }
  ]
}
```

The default configuration file is `./config.json` when no path is supplied.

### Verification

- TypeScript production build passes with `npm run build`.
- Provider and configuration behavior are covered by the existing test suite.
