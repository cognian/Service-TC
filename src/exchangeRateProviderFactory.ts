import { BccrExchangeRateProvider } from './bccrExchangeRateProvider';
import { ExchangeRateProviderConfig } from './config';
import { IExchangeRateProvider } from './exchangeRateProvider';
import { HnbExchangeRateProvider } from './hnbExchangeRateProvider';

export function createExchangeRateProvider(config: ExchangeRateProviderConfig): IExchangeRateProvider {
  switch (config.type) {
    case 'bccr':
      return new BccrExchangeRateProvider(config.webServiceUrl, config.apiToken);
    case 'hnb':
      return new HnbExchangeRateProvider(config.webServiceUrl, config.apiToken);
    default: {
      const exhaustiveCheck: never = config;
      throw new Error(`Unsupported exchange rate provider config: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
