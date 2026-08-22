import { ExchangeRatePoint, IExchangeRateProvider } from './exchangeRateProvider';

interface HnbIndicadorItem {
  Fecha: string;
  Valor: number;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class HnbExchangeRateProvider implements IExchangeRateProvider {
  constructor(
    private readonly serviceUrl: string,
    private readonly apiToken: string
  ) {}

  async fetchExchangeRate(from: Date, to: Date): Promise<ExchangeRatePoint[]> {
    const requestUrl = new URL(this.serviceUrl);
    requestUrl.searchParams.set('formato', 'Json');
    requestUrl.searchParams.set('fechaInicio', formatDate(from));
    requestUrl.searchParams.set('fechaFinal', formatDate(to));

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'clave': this.apiToken
      }
    });

    if (!response.ok) {
      throw new Error(`HNB service returned ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as HnbIndicadorItem[];

    return payload.map((item) => {
      const rate = Number(item.Valor);
      if (!Number.isFinite(rate)) {
        throw new Error(`Invalid HNB exchange rate value for date ${item.Fecha}.`);
      }

      return {
        date: new Date(`${item.Fecha.slice(0, 10)}T00:00:00.000Z`),
        rate
      };
    });
  }
}
