import { ExchangeRatePoint, IExchangeRateProvider } from './exchangeRateProvider';

interface BccrSeriesItem {
  fecha: string;
  valorDatoPorPeriodo: number;
}

interface BccrDataItem {
  series?: BccrSeriesItem[];
}

interface BccrExchangeRateResponse {
  estado: boolean;
  mensaje?: string;
  datos?: BccrDataItem[];
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class BccrExchangeRateProvider implements IExchangeRateProvider {
  constructor(
    private readonly serviceUrl: string,
    private readonly apiToken: string
  ) {}

  async fetchExchangeRate(from: Date, to: Date): Promise<ExchangeRatePoint[]> {
    const requestUrl = new URL(this.serviceUrl);
    requestUrl.searchParams.set('from', formatDate(from));
    requestUrl.searchParams.set('to', formatDate(to));

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + this.apiToken
      }
    });

    if (!response.ok) {
      throw new Error(`BCCR service returned ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as BccrExchangeRateResponse;
    if (!payload.estado) {
      throw new Error(payload.mensaje || 'BCCR service returned an unsuccessful response.');
    }

    return (payload.datos ?? []).flatMap((item) => item.series ?? []).map((seriesItem) => {
      const rate = Number(seriesItem.valorDatoPorPeriodo);
      if (!Number.isFinite(rate)) {
        throw new Error(`Invalid BCCR exchange rate value for date ${seriesItem.fecha}.`);
      }

      return {
        date: new Date(`${seriesItem.fecha}T00:00:00.000Z`),
        rate
      };
    });
  }
}
