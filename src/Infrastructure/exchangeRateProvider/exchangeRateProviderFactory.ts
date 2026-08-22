import { BccrExchangeRateProvider } from './bccrExchangeRateProvider';
import { HnbExchangeRateProvider } from './hnbExchangeRateProvider';
import { MexExchangeRateProvider } from './mexExchangeRateProvider';
import { ExchangeRateProviderConfig } from '../../Models/config';
import { IExchangeRateProvider } from '../../Application/interfaces/exchangeRateProvider';

export function createExchangeRateProvider(config: ExchangeRateProviderConfig): IExchangeRateProvider {
  switch (config.type) {
    case 'bccr':
      return new BccrExchangeRateProvider(config.webServiceUrl, config.apiToken);
    case 'hnb':
      return new HnbExchangeRateProvider(config.webServiceUrl, config.apiToken);
    case 'mex':
      return new MexExchangeRateProvider(config.webServiceUrl, config.apiToken);
    default: {
      const exhaustiveCheck: never = config;
      throw new Error(`Unsupported exchange rate provider config: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
